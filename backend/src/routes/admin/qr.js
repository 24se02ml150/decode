import { Router } from 'express';
import { db } from '../../db/index.js';
import { qrCodes, tasks, rounds } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors.js';
import { generateSecureToken } from '../../utils/helpers.js';
import QRCode from 'qrcode';

const router = Router();

// GET /api/admin/qr — list all QR codes
router.get('/', async (req, res, next) => {
  try {
    const qrList = await db.select({
      id: qrCodes.id,
      taskId: qrCodes.taskId,
      secureToken: qrCodes.secureToken,
      qrDataUrl: qrCodes.qrDataUrl,
      createdAt: qrCodes.createdAt,
      taskTitle: tasks.title,
      taskOrder: tasks.taskOrder,
      roundName: rounds.name,
      roundNumber: rounds.roundNumber,
    }).from(qrCodes)
      .innerJoin(tasks, eq(qrCodes.taskId, tasks.id))
      .innerJoin(rounds, eq(tasks.roundId, rounds.id))
      .orderBy(rounds.roundNumber, tasks.taskOrder);

    res.json({ success: true, data: qrList });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/qr/:taskId
router.get('/:taskId', async (req, res, next) => {
  try {
    const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.taskId, parseInt(req.params.taskId)));
    if (!qr) throw new NotFoundError('QR code not found for this task.');
    res.json({ success: true, data: qr });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/qr/:taskId/regenerate
router.post('/:taskId/regenerate', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId);

    // Check task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) throw new NotFoundError('Task not found.');

    // Delete existing QR
    await db.delete(qrCodes).where(eq(qrCodes.taskId, taskId));

    // Generate new
    const secureToken = generateSecureToken();
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const qrUrl = `${frontendUrl}/task/${secureToken}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1A1D21', light: '#FFFFFF' },
    });

    const [newQr] = await db.insert(qrCodes).values({
      taskId,
      secureToken,
      qrDataUrl,
    }).returning();

    res.json({ success: true, data: newQr });
  } catch (err) {
    next(err);
  }
});

export default router;
