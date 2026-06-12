import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../apiConfig';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
    MessageCircle, X, Send, Loader2, Users, Clock, AlertTriangle,
    Shield, UserCheck, UserX, Crown, Radio
} from 'lucide-react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
];

const LiveSession = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ─── State ───
    const [session, setSession] = useState(null);
    // loading | connecting | waiting-room | connected | ended | error | denied | removed
    const [status, setStatus] = useState('loading');
    const [isHost, setIsHost] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [participants, setParticipants] = useState([]);
    const [waitingRoom, setWaitingRoom] = useState([]);
    const [duration, setDuration] = useState(0);
    const [cameraError, setCameraError] = useState('');

    // ─── Refs ───
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({}); // { socketId: { pc, name, isHost } }
    const durationInterval = useRef(null);
    const chatEndRef = useRef(null);

    // ─── Fetch session info & persistent chat ───
    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };
                
                // Fetch session + messages in parallel
                const [sessRes, msgRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/mentor-sessions/${sessionId}`, { headers }),
                    fetch(`${API_BASE_URL}/api/mentor-sessions/${sessionId}/messages`, { headers })
                ]);

                if (sessRes.status === 403) { setStatus('denied'); return; }
                if (!sessRes.ok) { setStatus('error'); setErrorMsg('Session not found'); return; }
                const sessData = await sessRes.json();
                setSession(sessData.session);

                if (msgRes.ok) {
                    const msgData = await msgRes.json();
                    setMessages(msgData.messages || []);
                }

                if (sessData.session.status === 'completed') {
                    setStatus('ended');
                } else {
                    setStatus('connecting');
                }
            } catch (err) {
                console.error('[LiveSession] Fetch error:', err.message);
                setStatus('error');
                setErrorMsg('Failed to load session');
            }
        };
        if (user) fetchSessionData();
    }, [user, sessionId]);

    // ─── Get local media ───
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            return stream;
        } catch {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setCameraError('Camera unavailable. Audio only.');
                setCamOn(false);
                return stream;
            } catch {
                setCameraError('Camera and microphone access denied.');
                setCamOn(false);
                setMicOn(false);
                return null;
            }
        }
    }, []);

    // ─── Create peer connection for a remote user ───
    const createPeerConnection = useCallback((remoteSocketId, remoteName, remoteIsHost) => {
        // Close existing if any
        if (peersRef.current[remoteSocketId]) {
            peersRef.current[remoteSocketId].pc.close();
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    to: remoteSocketId,
                    candidate: event.candidate
                });
            }
        };

        // Remote stream
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (!remoteStream) return;

            setParticipants(prev => {
                const idx = prev.findIndex(p => p.socketId === remoteSocketId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], stream: remoteStream };
                    return updated;
                }
                return [...prev, { socketId: remoteSocketId, name: remoteName, isHost: remoteIsHost, stream: remoteStream }];
            });
        };

        pc.onconnectionstatechange = () => {
            if (['connected', 'completed'].includes(pc.iceConnectionState || pc.connectionState)) {
                setStatus('connected');
            }
        };

        peersRef.current[remoteSocketId] = { pc, name: remoteName, isHost: remoteIsHost };
        return pc;
    }, []);

    // ─── Initiate WebRTC offer to a remote user ───
    const initiateOffer = useCallback(async (remoteSocketId, remoteName, remoteIsHost) => {
        const pc = createPeerConnection(remoteSocketId, remoteName, remoteIsHost);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('offer', { to: remoteSocketId, offer });
        } catch (err) {
            console.error('[WebRTC] Offer creation error:', err);
        }
    }, [createPeerConnection]);

    // ─── Connect Socket.io + Signaling ───
    useEffect(() => {
        if (status !== 'connecting' || !session) return;

        let mounted = true;

        const connect = async () => {
            await getLocalStream();

            const token = await user.getIdToken();
            const socket = io(SOCKET_URL + '/live-session', {
                auth: { token },
                transports: ['websocket']
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                if (!mounted) return;
                socket.emit('join-room', { sessionId });
            });

            socket.on('connect_error', (err) => {
                console.error('[LiveSession] Socket error:', err.message);
                if (!mounted) return;
                setStatus('error');
                setErrorMsg(err.message === 'Invalid token' ? 'Authentication failed' : 'Connection failed');
            });

            socket.on('error-message', ({ message }) => {
                if (!mounted) return;
                setStatus('error');
                setErrorMsg(message);
            });

            // ── JOINED: Handle existing users in room (Newcomer is the Initiator) ──
            socket.on('existing-users', async ({ isHost: host, users: existing }) => {
                if (!mounted) return;
                setIsHost(host);
                setStatus('connected');

                if (existing && existing.length > 0) {
                    // Update state to show everyone already in the room
                    setParticipants(existing.map(u => ({ ...u, stream: null })));

                    // THE NEWCOMER INITIATES THE HANDSHAKE (GOOGLE MEET STYLE)
                    for (const u of existing) {
                        await initiateOffer(u.socketId, u.name, u.isHost);
                    }
                }
            });

            // ── NON-HOST: Denied ──
            socket.on('denied', ({ message }) => {
                if (!mounted) return;
                setStatus('denied');
                setErrorMsg(message);
            });

            // ── NON-HOST: Removed ──
            socket.on('removed', ({ message }) => {
                if (!mounted) return;
                setStatus('removed');
                setErrorMsg(message);
            });

            // ── Waiting room updates (for host) ──
            socket.on('waiting-room-update', (wr) => {
                if (!mounted) return;
                setWaitingRoom(wr || []);
            });

            // ── New user joined the room (Existing users wait for an offer) ──
            socket.on('user-joined', (remoteUser) => {
                if (!mounted) return;
                // Add to participant list immediately
                setParticipants(prev => {
                    if (prev.find(p => p.socketId === remoteUser.socketId)) return prev;
                    return [...prev, { ...remoteUser, stream: null }];
                });
                // WE DO NOT INITIATE AN OFFER HERE. 
                // We wait for the newcomer (the initiator) to send us an offer.
                console.log(`[LiveSession] User joined: ${remoteUser.name}. Waiting for offer...`);
            });

            // ── Receive WebRTC offer ──
            socket.on('offer', async ({ from, offer, userName }) => {
                if (!mounted) return;
                let pc = peersRef.current[from]?.pc;
                if (!pc) {
                    pc = createPeerConnection(from, userName, false);
                }
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', { to: from, answer });
                } catch (err) {
                    console.error('[WebRTC] Answer error:', err);
                }
            });

            // ── Receive WebRTC answer ──
            socket.on('answer', async ({ from, answer }) => {
                const pc = peersRef.current[from]?.pc;
                if (pc) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    } catch (err) {
                        console.error('[WebRTC] SetRemote error:', err);
                    }
                }
            });

            // ── ICE candidate ──
            socket.on('ice-candidate', async ({ from, candidate }) => {
                const pc = peersRef.current[from]?.pc;
                if (pc) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error('[WebRTC] ICE error:', err);
                    }
                }
            });

            // ── User left ──
            socket.on('user-left', ({ socketId }) => {
                if (peersRef.current[socketId]) {
                    peersRef.current[socketId].pc.close();
                    delete peersRef.current[socketId];
                }
                setParticipants(prev => prev.filter(p => p.socketId !== socketId));
            });

            // ── Chat ──
            socket.on('chat-message', (msg) => {
                setMessages(prev => [...prev, msg]);
            });
        };

        connect();

        return () => {
            mounted = false;
            if (socketRef.current) {
                socketRef.current.emit('leave-room');
                socketRef.current.disconnect();
            }
            Object.values(peersRef.current).forEach(({ pc }) => pc.close());
            peersRef.current = {};
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [session, user, sessionId, getLocalStream, createPeerConnection]);

    // ─── Duration Timer ───
    useEffect(() => {
        if (status === 'connected') {
            durationInterval.current = setInterval(() => setDuration(p => p + 1), 1000);
        }
        return () => { if (durationInterval.current) clearInterval(durationInterval.current); };
    }, [status]);

    // ─── Auto-scroll chat ───
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ─── Controls ───
    const toggleMic = () => {
        const audio = localStreamRef.current?.getAudioTracks()[0];
        if (audio) { audio.enabled = !audio.enabled; setMicOn(audio.enabled); }
    };

    const toggleCam = () => {
        const video = localStreamRef.current?.getVideoTracks()[0];
        if (video) { video.enabled = !video.enabled; setCamOn(video.enabled); }
    };

    const toggleScreenShare = async () => {
        if (screenSharing) {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
            const camTrack = localStreamRef.current?.getVideoTracks()[0];
            if (camTrack) {
                Object.values(peersRef.current).forEach(({ pc }) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(camTrack);
                });
            }
            setScreenSharing(false);
            socketRef.current?.emit('screen-share-stopped');
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];
                Object.values(peersRef.current).forEach(({ pc }) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });
                screenTrack.onended = () => toggleScreenShare();
                setScreenSharing(true);
                socketRef.current?.emit('screen-share-started');
            } catch { /* user cancelled */ }
        }
    };

    const leaveCall = async () => {
        socketRef.current?.emit('leave-room');
        socketRef.current?.disconnect();
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
        Object.values(peersRef.current).forEach(({ pc }) => pc.close());
        try {
            const token = await user.getIdToken();
            await fetch(`${API_BASE_URL}/api/mentor-sessions/${sessionId}/end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch { /* non-critical */ }
        setStatus('ended');
    };

    const admitUser = (uid) => socketRef.current?.emit('admit-user', { targetUid: uid });
    const denyUser = (uid) => socketRef.current?.emit('deny-user', { targetUid: uid });
    const removeUser = (socketId) => socketRef.current?.emit('remove-user', { targetSocketId: socketId });

    const sendChat = () => {
        if (!chatInput.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', { text: chatInput.trim() });
        setChatInput('');
    };

    const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // ═══════════ STATUS SCREENS ═══════════

    if (status === 'loading' || status === 'connecting') {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="relative">
                    <div className="h-24 w-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-8 w-8 text-indigo-500 animate-pulse" />
                    </div>
                </div>
                <div className="mt-8 text-center space-y-2">
                    <h2 className="text-xl font-bold text-white animate-pulse">Initializing Secure Session</h2>
                    <p className="text-gray-400 text-sm max-w-xs">{status === 'loading' ? 'Fetching session details...' : 'Setting up encrypted WebRTC pipeline...'}</p>
                </div>
                
                {/* Visual feedback for permissions */}
                <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex flex-col items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${camOn ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Camera</span>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex flex-col items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${micOn ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Microphone</span>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'denied' || status === 'removed') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Shield className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{status === 'removed' ? 'Removed' : 'Access Denied'}</h2>
                    <p className="text-gray-400 text-sm">{errorMsg || 'You cannot access this session.'}</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors text-sm font-medium">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-16 w-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle className="h-8 w-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Connection Error</h2>
                    <p className="text-gray-400 text-sm">{errorMsg || 'Something went wrong.'}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium">Retry</button>
                        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors text-sm font-medium">Go Back</button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'ended') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <PhoneOff className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Session Ended</h2>
                    <p className="text-gray-400 text-sm">{session?.topic || 'Live session'} — {fmt(duration)}</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    // ═══════════ WAITING ROOM SCREEN (for non-hosts) ═══════════
    if (status === 'waiting-room') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md px-6">
                    {/* Local preview */}
                    <div className="w-64 h-48 mx-auto bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 relative">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        {!camOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white">{session?.topic || 'Live Session'}</h2>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                            <p className="text-amber-400 text-sm font-medium">Waiting for the host to let you in...</p>
                        </div>
                    </div>

                    {/* Preview controls */}
                    <div className="flex items-center justify-center gap-3">
                        <button onClick={toggleMic}
                            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500 text-white'}`}>
                            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </button>
                        <button onClick={toggleCam}
                            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500 text-white'}`}>
                            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </button>
                        <button onClick={() => { socketRef.current?.emit('leave-room'); socketRef.current?.disconnect(); navigate(-1); }}
                            className="h-12 px-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center gap-2 text-sm font-semibold">
                            <PhoneOff className="h-4 w-4" /> Leave
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════ MAIN VIDEO CALL UI ═══════════
    const showWaitingPanel = isHost && waitingRoom.length > 0;

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* ─── Top Bar ─── */}
            <div className="h-14 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-white font-semibold text-sm truncate max-w-[200px] md:max-w-md">
                        {session?.topic || 'Live Session'}
                    </span>
                    {isHost && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="h-2.5 w-2.5" /> HOST
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {status === 'connecting' && (
                        <span className="text-amber-400 text-xs flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                        </span>
                    )}
                    <span className="text-green-400 text-xs flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3" /> {fmt(duration)}
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Users className="h-3.5 w-3.5" /> {participants.length + 1}
                    </div>
                    {showWaitingPanel && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {waitingRoom.length} waiting
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Video Area ─── */}
            <div className="flex-1 flex relative overflow-hidden">
                <div className={`flex-1 flex flex-col transition-all ${chatOpen ? 'md:mr-80' : ''}`}>
                    {/* Video Grid */}
                    <div className="flex-1 p-3 md:p-4">
                        <div className={`h-full grid gap-3 ${
                            participants.length === 0 ? 'grid-cols-1' :
                            participants.length === 1 ? 'grid-cols-1 md:grid-cols-2' :
                            participants.length <= 3 ? 'grid-cols-2' :
                            participants.length <= 8 ? 'grid-cols-2 md:grid-cols-3' :
                            'grid-cols-3 md:grid-cols-4'
                        }`}>
                            {/* Remote Videos */}
                            {participants.map((p) => (
                                <div key={p.socketId} className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 min-h-[150px]">
                                    {p.stream ? <RemoteVideo stream={p.stream} /> : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                                {p.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-1.5">
                                        {p.isHost && <Crown className="h-3 w-3 text-amber-400" />}
                                        <span className="text-white text-xs font-medium">{p.name}</span>
                                    </div>
                                    {isHost && !p.isHost && (
                                        <button onClick={() => removeUser(p.socketId)}
                                            className="absolute top-2 right-2 h-6 w-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                            title="Remove participant">
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Local Video (full when alone) */}
                            {participants.length === 0 && (
                                <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                    {!camOn && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                            <div className="h-20 w-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                                {user?.email?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-1.5">
                                        {isHost && <Crown className="h-3 w-3 text-amber-400" />}
                                        <span className="text-white text-xs font-medium">You</span>
                                    </div>
                                    {cameraError && (
                                        <div className="absolute top-3 left-3 right-3 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2">
                                            <p className="text-amber-300 text-xs">{cameraError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Local Video PiP */}
                    {participants.length > 0 && (
                        <div className="absolute bottom-24 right-4 w-40 h-28 md:w-52 md:h-36 z-10">
                            <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl">
                                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                {!camOn && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                        <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {user?.email?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                                    {isHost && <Crown className="h-2 w-2 text-amber-400" />} You
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Controls Bar ─── */}
                    <div className="h-20 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 flex items-center justify-center gap-3 px-4 shrink-0">
                        <button onClick={toggleMic} className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`} title={micOn ? 'Mute' : 'Unmute'}>
                            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </button>
                        <button onClick={toggleCam} className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`} title={camOn ? 'Camera off' : 'Camera on'}>
                            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </button>
                        <button onClick={toggleScreenShare} className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${screenSharing ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600 text-white'}`} title="Screen share">
                            {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setChatOpen(!chatOpen)} className={`h-12 w-12 rounded-full flex items-center justify-center transition-all relative ${chatOpen ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`} title="Chat">
                            <MessageCircle className="h-5 w-5" />
                            {messages.length > 0 && !chatOpen && (
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{messages.length > 9 ? '9+' : messages.length}</div>
                            )}
                        </button>
                        <div className="w-px h-8 bg-gray-700 mx-1" />
                        <button onClick={leaveCall} className="h-12 px-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center gap-2 transition-all font-semibold text-sm shadow-lg shadow-red-600/25" title="Leave">
                            <PhoneOff className="h-5 w-5" /><span className="hidden md:inline">Leave</span>
                        </button>
                    </div>
                </div>

                {/* ─── Chat Panel ─── */}
                {chatOpen && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-20">
                        {/* Waiting Room Section (Host only) */}
                        {isHost && waitingRoom.length > 0 && (
                            <div className="border-b border-gray-800 p-3 space-y-2 max-h-40 overflow-y-auto">
                                <p className="text-amber-400 text-xs font-bold flex items-center gap-1.5">
                                    <Users className="h-3 w-3" /> Waiting Room ({waitingRoom.length})
                                </p>
                                {waitingRoom.map(u => (
                                    <div key={u.uid} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-white text-xs font-medium">{u.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => admitUser(u.uid)} className="h-6 w-6 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white" title="Admit">
                                                <UserCheck className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => denyUser(u.uid)} className="h-6 w-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white" title="Deny">
                                                <UserX className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-800 shrink-0">
                            <span className="text-white font-semibold text-sm">In-call Chat</span>
                            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {messages.length === 0 && <p className="text-gray-500 text-xs text-center mt-8">No messages yet 👋</p>}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-500 mb-0.5">{msg.senderName}</span>
                                    <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm ${msg.senderId === user.uid ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>{msg.text}</div>
                                    <span className="text-[9px] text-gray-600 mt-0.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="border-t border-gray-800 p-3 shrink-0">
                            <div className="flex gap-2">
                                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500" />
                                <button onClick={sendChat} disabled={!chatInput.trim()} className="h-9 w-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0">
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Floating Waiting Room Notification (Host, when chat is closed) ─── */}
                {isHost && waitingRoom.length > 0 && !chatOpen && (
                    <div className="absolute top-4 right-4 bg-gray-900 border border-amber-500/30 rounded-2xl p-4 shadow-2xl z-20 w-72 space-y-3 animate-in">
                        <p className="text-amber-400 text-sm font-bold flex items-center gap-2">
                            <Users className="h-4 w-4" /> {waitingRoom.length} in waiting room
                        </p>
                        {waitingRoom.slice(0, 3).map(u => (
                            <div key={u.uid} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]?.toUpperCase()}</div>
                                    <span className="text-white text-xs font-medium truncate max-w-[120px]">{u.name}</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => admitUser(u.uid)} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg">Admit</button>
                                    <button onClick={() => denyUser(u.uid)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded-lg">Deny</button>
                                </div>
                            </div>
                        ))}
                        {waitingRoom.length > 3 && <p className="text-gray-500 text-[10px]">+{waitingRoom.length - 3} more</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Remote Video Component ───
const RemoteVideo = ({ stream }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }, [stream]);
    return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default LiveSession;