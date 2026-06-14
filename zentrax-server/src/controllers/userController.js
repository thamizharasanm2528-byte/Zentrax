const { db } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

exports.createUserProfile = async (req, res) => {
    try {
        const { uid, role, name, college, skills, experience, availability } = req.body;

        if (!uid || !role || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userData = {
            uid,
            role,
            name,
            college: college || '',
            skills: skills || [],
            experience: experience || '',
            availability: availability || 'Available',
            createdAt: new Date().toISOString()
        };

        await db.collection('users').doc(uid).set(userData);

        // Send welcome email (fire-and-forget — signup succeeds even if email fails)
        const userEmail = req.user?.email || req.body.email || '';
        if (userEmail) {
            sendWelcomeEmail({ userEmail, userName: name, role }).catch(emailErr => {
                console.error('[Email] Non-fatal error in welcome email flow:', emailErr.message);
            });
        }

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            welcomeEmailSent,
            user: userData
        });
    } catch (error) {
        console.error('Error creating user profile:', error);
        res.status(500).json({ error: 'Failed to create user profile' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const { uid } = req.params;
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user: userDoc.data() });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query; // 'student' or 'mentor'
        const currentUserId = req.user?.uid; // From verifyToken middleware
        const requestedRole = (role || '').toLowerCase().trim();

        // Fetch ALL users — Firestore where() is case-sensitive so we filter in-memory
        const snapshot = await db.collection('users').get();
        const users = [];
        let excludedSelf = 0;
        let excludedInternal = 0;
        let excludedRole = 0;

        const internalKeywords = ['admin', 'platform', 'zentrax', 'system', 'test'];
        const seenKeys = new Set(); // For deduplication

        snapshot.forEach(doc => {
            const userData = doc.data();
            const docId = doc.id;
            const userUid = userData.uid || docId;
            const userName = (userData.name || '').toLowerCase().trim();
            const userEmail = (userData.email || '').toLowerCase().trim();
            const userRole = (userData.role || '').toLowerCase().trim();

            // ── 1. Exclude currently logged-in user (UID + Email check) ──
            const currentUserEmail = (req.user?.email || '').toLowerCase().trim();
            const isSelf = (currentUserId && (userUid === currentUserId || docId === currentUserId)) || 
                          (currentUserEmail && userEmail === currentUserEmail);
            
            if (isSelf) {
                excludedSelf++;
                return;
            }

            // ── 2. Exclude internal/admin-like/test accounts ──
            const isInternal = internalKeywords.some(keyword =>
                userName.includes(keyword) || userEmail.includes(keyword)
            );
            if (isInternal) {
                excludedInternal++;
                return;
            }

            // ── 3. Case-insensitive role filtering ──
            if (requestedRole && userRole !== requestedRole) {
                excludedRole++;
                return;
            }

            // ── 4. Strict Student Filtering & Completeness Gate ──
            if (requestedRole === 'student') {
                // Remove users with missing "necessary" data
                if (!userName || !userData.skills || !Array.isArray(userData.skills) || userData.skills.length === 0) {
                    excludedRole++;
                    return;
                }

                // Verify they aren't actually mentors mislabeled as students
                const isMentorByName = userName.includes('mentor');
                const hasMentorOnboardingFields = userData.profession || userData.expertise 
                    || userData.mentorProfile || userData.isMentor === true
                    || (Array.isArray(userData.mentoringInterests) && userData.mentoringInterests.length > 0);
                
                if (isMentorByName || hasMentorOnboardingFields) {
                    excludedRole++;
                    return;
                }
            }

            // ── 5. Deduplication by uid + email ──
            const dedupeKey = userEmail || userUid;
            if (seenKeys.has(dedupeKey)) return;
            seenKeys.add(dedupeKey);
            if (userUid && userUid !== dedupeKey) {
                if (seenKeys.has(userUid)) return;
                seenKeys.add(userUid);
            }

            users.push({
                id: docId,
                uid: userUid,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                skills: userData.skills,
                college: userData.college,
                profilePicture: userData.profilePicture || null,
                availability: userData.availability || 'Available'
            });
        });

        console.log(`[Users] Requested role: ${requestedRole || 'all'}`);
        console.log(`[Users] DB Total: ${snapshot.size}`);
        console.log(`[Users] Excluded Self: ${excludedSelf}, Internal: ${excludedInternal}, Role: ${excludedRole}`);
        console.log(`[Users] Final Return: ${users.length}`);

        if (users.length === 0) {
            return res.status(200).json({
                success: true,
                message: requestedRole === 'student' ? 'No students found' : 'No users found',
                data: []
            });
        }

        res.status(200).json({
            success: true,
            message: `${requestedRole ? requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1) : 'User'} list fetched successfully`,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            data: []
        });
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        const uid = req.user.uid;

        if (!availability) {
            return res.status(400).json({ error: 'Availability status is required' });
        }

        await db.collection('users').doc(uid).update({ 
            availability,
            updatedAt: new Date().toISOString()
        });

        console.log(`[Users] Updated availability for ${uid} to: ${availability}`);
        res.status(200).json({ success: true, message: 'Availability updated successfully' });
    } catch (error) {
        console.error('[Users] Failed to update availability:', error.message);
        res.status(500).json({ error: 'Failed to update availability' });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const updates = req.body;

        // Security: Remove fields that should not be updated via this endpoint
        delete updates.uid;
        delete updates.role;
        delete updates.createdAt;
        delete updates.email;
        delete updates.level;
        delete updates.points;
        delete updates.badges;

        // Handle nested objects if provided flatly from frontend or structure them
        // For example, if the frontend sends { notifications: { email: true } }
        // We update the entire object or specific fields. Firestore update merges if field is dot-notated.
        
        await db.collection('users').doc(uid).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });

        console.log(`[Users] Updated profile for ${uid}`);
        res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('[Users] Failed to update profile:', error.message);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
};
