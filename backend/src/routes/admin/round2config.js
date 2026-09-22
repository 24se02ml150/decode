import { Router } from 'express';
import { db } from '../../db/index.js';
import { round2Config, rounds } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';

const router = Router();

const upsertSchema = z.object({
  explanationText: z.string().optional().default(''),
  whatsappLink: z.string().optional().default(''),
});

// GET /api/admin/round2-config/:roundId
router.get('/:roundId', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);

    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    if (!round) throw new NotFoundError('Round not found.');

    const [config] = await db.select().from(round2Config).where(eq(round2Config.roundId, roundId));

    res.json({
      success: true,
      data: config || { roundId, explanationText: '', whatsappLink: '' },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/round2-config/:roundId
router.put('/:roundId', validate(upsertSchema), async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);
    const { explanationText, whatsappLink } = req.validatedBody;

    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    if (!round) throw new NotFoundError('Round not found.');

    // Check if config exists
    const [existing] = await db.select().from(round2Config).where(eq(round2Config.roundId, roundId));

    let result;
    if (existing) {
      [result] = await db.update(round2Config)
        .set({ explanationText, whatsappLink, updatedAt: new Date() })
        .where(eq(round2Config.roundId, roundId))
        .returning();
    } else {
      [result] = await db.insert(round2Config)
        .values({ roundId, explanationText, whatsappLink })
        .returning();
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
