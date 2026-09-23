import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './utils/errors.js';
import { authMiddleware } from './middleware/auth.js';
import { adminMiddleware } from './middleware/admin.js';

import authRoutes from './routes/auth.js';
import adminTeamRoutes from './routes/admin/teams.js';
import adminEventRoutes from './routes/admin/events.js';
import adminRoundRoutes from './routes/admin/rounds.js';
import adminTaskRoutes from './routes/admin/tasks.js';
import adminLocationRoutes from './routes/admin/locations.js';
import adminQRRoutes from './routes/admin/qr.js';
import adminResultRoutes from './routes/admin/results.js';
import adminReportRoutes from './routes/admin/reports.js';
import adminRound2ConfigRoutes from './routes/admin/round2config.js';
import teamDashboardRoutes from './routes/team/dashboard.js';
import teamTaskRoutes from './routes/team/tasks.js';
import teamProgressRoutes from './routes/team/progress.js';

const app = express();

// Trust reverse proxy (Vercel/Render/Nginx) so rate limiter uses real client IPs
app.set('trust proxy', 1);

// ─── Middleware ───
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // increased significantly to avoid blocking legit traffic during event
  message: { success: false, error: { message: 'Too many requests. Please try again later.' } },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // increased for the same reason
  message: { success: false, error: { message: 'Too many login attempts. Please try again later.' } },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'QR Campus Hunt API is running', timestamp: new Date().toISOString() });
});

// ─── Routes ───
app.use('/api/auth', authRoutes);

// Admin routes (auth + admin middleware)
app.use('/api/admin/teams', authMiddleware, adminMiddleware, adminTeamRoutes);
app.use('/api/admin/events', authMiddleware, adminMiddleware, adminEventRoutes);
app.use('/api/admin/rounds', authMiddleware, adminMiddleware, adminRoundRoutes);
app.use('/api/admin/tasks', authMiddleware, adminMiddleware, adminTaskRoutes);
app.use('/api/admin/locations', authMiddleware, adminMiddleware, adminLocationRoutes);
app.use('/api/admin/qr', authMiddleware, adminMiddleware, adminQRRoutes);
app.use('/api/admin/results', authMiddleware, adminMiddleware, adminResultRoutes);
app.use('/api/admin/reports', authMiddleware, adminMiddleware, adminReportRoutes);
app.use('/api/admin/round2-config', authMiddleware, adminMiddleware, adminRound2ConfigRoutes);

// Team routes (auth middleware, role checked in routes)
app.use('/api/team/dashboard', authMiddleware, teamDashboardRoutes);
app.use('/api/team/tasks', authMiddleware, teamTaskRoutes);
app.use('/api/team/progress', authMiddleware, teamProgressRoutes);

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  });
}

export default app;
