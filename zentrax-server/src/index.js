const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173'
];

// ─── HTTP Server + Socket.io ───
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// ─── Security & Logging ───
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());


// ─── Serve uploaded files statically ───
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── NOTE: No global rate limiter ───
// Rate limiting is applied ONLY to write/abuse-prone routes inside each route file.
// This ensures dashboard, project, notification, and settings reads are never blocked.

// Import Routes
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const aidRoutes = require('./ai/aiRoutes');
const mentorshipRoutes = require('./routes/mentorship');
const notificationRoutes = require('./routes/notifications');
const teamInviteRoutes = require('./routes/teamInvites');
const discussionRoutes = require('./routes/discussions');
const mentorRequestRoutes = require('./routes/mentorRequests');
const feedbackRoutes = require('./routes/feedback');
const studentDashboardRoutes = require('./routes/studentDashboard');
const joinRequestRoutes = require('./routes/joinRequests');
const mentorChatRoutes = require('./routes/mentorChatRoutes');
const mentorSessionRoutes = require('./routes/mentorSessionRoutes');
const uploadRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const matchingRoutes = require('./routes/matchingRoutes');
const mentorDashboardRoutes = require('./routes/mentorDashboard');
const mentorInviteRoutes = require('./routes/mentorInvites');


// New Connection System Routes
const mentorConnectionRoutes = require('./routes/mentorConnection');
const mentorChatV2Routes = require('./routes/mentorChat');
const mentorProgressRoutes = require('./routes/mentorProgress');
const mentorFeedbackRoutes = require('./routes/mentorFeedback');
const dmRoutes = require('./routes/dmRoutes');

// ─── Live Session Socket Handler (must be after route imports so Firebase is initialized) ───
const setupLiveSessionSocket = require('./sockets/liveSessionSocket');
setupLiveSessionSocket(io);

// ─── Mount Routes (NO blanket rate limiters on mounts) ───
app.use('/api/users', userRoutes);
app.use('/api/ai', aidRoutes);                                          // Limiter inside aiRoutes on POST only
app.use('/api/mentorship', mentorshipRoutes);                            // Limiter inside mentorship on POST only
app.use('/api/notifications', notificationRoutes);
app.use('/api/team-invite', teamInviteRoutes);

// Project-related mounts (specific sub-paths first to avoid shadowing by /:id)
app.use('/api/projects', discussionRoutes);
app.use('/api/projects', feedbackRoutes);
app.use('/api/projects', projectRoutes);

app.use('/api/mentor', mentorRequestRoutes);                             // Limiter inside mentorRequests on POST only
app.use('/api/student', studentDashboardRoutes);
app.use('/api/join', joinRequestRoutes);
app.use('/api/mentor-chat', mentorChatRoutes);
app.use('/api/mentor-sessions', mentorSessionRoutes);                    // Limiter inside sessions on POST only
app.use('/api/upload', uploadRoutes);                                    // Limiter already per-route inside uploads.js
app.use('/api/admin', adminRoutes);                                      // Admin-only routes (email whitelist)
app.use('/api/admin', mentorInviteRoutes);                                // Admin: mentor invite management
app.use('/api/auth', mentorInviteRoutes);                                 // Public: validate-invite endpoint
app.use('/api/reports', reportRoutes);                                   // Public report submission
app.use('/api/matching', matchingRoutes);                                 // AI matching (team + mentor)
app.use('/api/mentor', mentorDashboardRoutes);                           // Mentor Analytics & Dashboard


// New Mentor Connection System Mounts
app.use('/api/mentor-connection', mentorConnectionRoutes);
app.use('/api/mentor-chat-v2', mentorChatV2Routes);
app.use('/api/mentor-progress', mentorProgressRoutes);
app.use('/api/mentor-feedback', mentorFeedbackRoutes);
app.use('/api/dm', dmRoutes);                                            // Direct messaging

// Basic health-check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'ZENTRAX API is running' });
});

// ─── Centralized Error Handler (must be last) ───
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`[Server] ZENTRAX API running on port ${PORT}`);
    console.log(`[Socket.io] Live session signaling ready`);
});

