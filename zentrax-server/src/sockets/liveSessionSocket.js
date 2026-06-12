const admin = require('firebase-admin');

/**
 * Live Session Socket Handler — Google Meet-style
 * 
 * Flow:
 * 1. Mentor joins → enters room directly as HOST
 * 2. Others join → enter WAITING ROOM
 * 3. Mentor admits/denies from waiting room
 * 4. Admitted users join the room → WebRTC initiated by EXISTING users
 * 5. Chat is ephemeral
 */
module.exports = function setupLiveSessionSocket(io) {
    const db = admin.firestore();
    const sessionNamespace = io.of('/live-session');

    // In-memory waiting rooms: { sessionId: [{ socketId, uid, name, email }] }
    const waitingRooms = {};

    // ─── Authentication middleware ───
    sessionNamespace.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = await admin.auth().verifyIdToken(token);
            socket.user = { uid: decoded.uid, email: decoded.email, name: decoded.name || decoded.email };
            next();
        } catch (err) {
            console.error('[LiveSession] Auth error:', err.message);
            next(new Error('Invalid token'));
        }
    });

    sessionNamespace.on('connection', (socket) => {
        console.log(`[LiveSession] Connected: ${socket.user.email} (${socket.id})`);

        // ─── Join Room ───
        socket.on('join-room', async ({ sessionId }) => {
            try {
                const sessionDoc = await db.collection('mentor_sessions').doc(sessionId).get();
                if (!sessionDoc.exists) {
                    socket.emit('error-message', { message: 'Session not found' });
                    return;
                }

                const session = sessionDoc.data();
                const uid = socket.user.uid;

                // Authorization check
                const isAuthorized =
                    uid === session.mentorId ||
                    uid === session.studentId ||
                    (session.participantIds && session.participantIds.includes(uid));

                if (!isAuthorized) {
                    socket.emit('error-message', { message: 'Access denied.' });
                    return;
                }

                const isMentor = uid === session.mentorId;
                socket.sessionId = sessionId;
                socket.isMentor = isMentor;

                // Join the actual room immediately
                socket.join(sessionId);

                // Get existing participants in the room
                const roomSockets = await sessionNamespace.in(sessionId).fetchSockets();
                const existingUsers = roomSockets
                    .filter(s => s.id !== socket.id)
                    .map(s => ({
                        socketId: s.id,
                        uid: s.user.uid,
                        name: s.user.name,
                        isHost: s.isMentor
                    }));

                // 1. Send existing users to the new joiner
                socket.emit('existing-users', {
                    isHost: isMentor,
                    users: existingUsers
                });

                // 2. Notify others that a new user has joined
                socket.to(sessionId).emit('user-joined', {
                    socketId: socket.id,
                    uid: socket.user.uid,
                    name: socket.user.name,
                    isHost: isMentor
                });

                console.log(`[LiveSession] ${isMentor ? '👑 Host' : '👤 Student'} ${socket.user.email} joined ${sessionId}`);
            } catch (err) {
                console.error('[LiveSession] Join error:', err.message);
                socket.emit('error-message', { message: 'Failed to join session' });
            }
        });

        // ─── Mentor admits a user from waiting room ───
        socket.on('admit-user', async ({ targetUid }) => {
            if (!socket.isMentor || !socket.sessionId) return;

            const sessionId = socket.sessionId;
            const waiting = waitingRooms[sessionId] || [];
            const userEntry = waiting.find(u => u.uid === targetUid);
            if (!userEntry) return;

            // Remove from waiting room
            waitingRooms[sessionId] = waiting.filter(u => u.uid !== targetUid);

            // Find the waiting user's socket
            const waitingSockets = await sessionNamespace.in(`${sessionId}-waiting`).fetchSockets();
            const targetSocket = waitingSockets.find(s => s.user.uid === targetUid);

            if (targetSocket) {
                targetSocket.inWaitingRoom = false;
                targetSocket.leave(`${sessionId}-waiting`);
                targetSocket.join(sessionId);

                // Get existing participants for the admitted user
                const roomSockets = await sessionNamespace.in(sessionId).fetchSockets();
                const existingUsers = roomSockets
                    .filter(s => s.id !== targetSocket.id && !s.inWaitingRoom)
                    .map(s => ({ socketId: s.id, uid: s.user.uid, name: s.user.name, isHost: s.isMentor }));

                // Tell admitted user they're in
                targetSocket.emit('admitted', { participants: existingUsers });

                // Tell everyone in room about the new user
                targetSocket.to(sessionId).emit('user-joined', {
                    socketId: targetSocket.id,
                    uid: targetSocket.user.uid,
                    name: targetSocket.user.name,
                    isHost: false
                });

                console.log(`[LiveSession] ✅ ${targetSocket.user.email} admitted to ${sessionId}`);
            }

            // Update mentor's waiting room list
            const hostSockets = await getHostSockets(sessionId);
            for (const hs of hostSockets) {
                hs.emit('waiting-room-update', waitingRooms[sessionId] || []);
            }
        });

        // ─── Mentor denies a user from waiting room ───
        socket.on('deny-user', async ({ targetUid }) => {
            if (!socket.isMentor || !socket.sessionId) return;

            const sessionId = socket.sessionId;
            const waiting = waitingRooms[sessionId] || [];
            waitingRooms[sessionId] = waiting.filter(u => u.uid !== targetUid);

            // Find and notify the denied user
            const waitingSockets = await sessionNamespace.in(`${sessionId}-waiting`).fetchSockets();
            const targetSocket = waitingSockets.find(s => s.user.uid === targetUid);
            if (targetSocket) {
                targetSocket.emit('denied', { message: 'The host has denied your request to join.' });
                targetSocket.leave(`${sessionId}-waiting`);
            }

            // Update mentor's waiting room
            const hostSockets = await getHostSockets(sessionId);
            for (const hs of hostSockets) {
                hs.emit('waiting-room-update', waitingRooms[sessionId] || []);
            }

            console.log(`[LiveSession] ❌ User ${targetUid} denied from ${sessionId}`);
        });

        // ─── Mentor removes a participant ───
        socket.on('remove-user', async ({ targetSocketId }) => {
            if (!socket.isMentor || !socket.sessionId) return;

            const targetSocket = (await sessionNamespace.in(socket.sessionId).fetchSockets())
                .find(s => s.id === targetSocketId);
            if (targetSocket) {
                targetSocket.emit('removed', { message: 'You have been removed from the session.' });
                targetSocket.to(socket.sessionId).emit('user-left', {
                    socketId: targetSocket.id,
                    uid: targetSocket.user.uid,
                    name: targetSocket.user.name
                });
                targetSocket.leave(socket.sessionId);
                targetSocket.sessionId = null;
            }
        });

        // ─── WebRTC Signaling ───
        socket.on('offer', ({ to, offer }) => {
            socket.to(to).emit('offer', {
                from: socket.id,
                offer,
                userName: socket.user.name
            });
        });

        socket.on('answer', ({ to, answer }) => {
            socket.to(to).emit('answer', {
                from: socket.id,
                answer
            });
        });

        socket.on('ice-candidate', ({ to, candidate }) => {
            socket.to(to).emit('ice-candidate', {
                from: socket.id,
                candidate
            });
        });

        // ─── In-call Chat (Persistent) ───
        socket.on('chat-message', async ({ text }) => {
            if (!socket.sessionId || !text?.trim() || socket.inWaitingRoom) return;
            
            const messageData = {
                sessionId: socket.sessionId,
                senderId: socket.user.uid,
                senderName: socket.user.name,
                text: text.trim(),
                createdAt: new Date().toISOString()
            };

            try {
                // Save to Firestore for persistence
                await db.collection('session_messages').add(messageData);

                // Emit to participants in room
                sessionNamespace.in(socket.sessionId).emit('chat-message', {
                    ...messageData,
                    timestamp: Date.now() // for immediate UI sorting if needed
                });
            } catch (err) {
                console.error('[LiveSession] Chat save error:', err.message);
                // Fallback: still emit but notify sender of non-persistence
                socket.emit('error-message', { message: 'Failed to save message, but it was sent.' });
                sessionNamespace.in(socket.sessionId).emit('chat-message', {
                    ...messageData,
                    timestamp: Date.now()
                });
            }
        });

        // ─── Screen Share ───
        socket.on('screen-share-started', () => {
            if (!socket.sessionId) return;
            socket.to(socket.sessionId).emit('screen-share-started', {
                socketId: socket.id, userName: socket.user.name
            });
        });

        socket.on('screen-share-stopped', () => {
            if (!socket.sessionId) return;
            socket.to(socket.sessionId).emit('screen-share-stopped', { socketId: socket.id });
        });

        // ─── Leave / Disconnect ───
        socket.on('leave-room', () => handleLeave(socket));
        socket.on('disconnect', () => {
            handleLeave(socket);
            console.log(`[LiveSession] Disconnected: ${socket.user.email}`);
        });
    });

    async function getHostSockets(sessionId) {
        const all = await sessionNamespace.in(sessionId).fetchSockets();
        return all.filter(s => s.isMentor);
    }

    function handleLeave(socket) {
        const sessionId = socket.sessionId;
        if (!sessionId) return;

        // Remove from waiting room if applicable
        if (socket.inWaitingRoom && waitingRooms[sessionId]) {
            waitingRooms[sessionId] = waitingRooms[sessionId].filter(u => u.uid !== socket.user.uid);
            socket.leave(`${sessionId}-waiting`);
            // Notify host
            getHostSockets(sessionId).then(hosts => {
                hosts.forEach(hs => hs.emit('waiting-room-update', waitingRooms[sessionId] || []));
            });
        } else {
            // Notify room participants
            socket.to(sessionId).emit('user-left', {
                socketId: socket.id,
                uid: socket.user.uid,
                name: socket.user.name
            });
        }

        socket.leave(sessionId);
        socket.sessionId = null;

        // Clean up empty waiting rooms
        if (waitingRooms[sessionId] && waitingRooms[sessionId].length === 0) {
            delete waitingRooms[sessionId];
        }
    }
};
