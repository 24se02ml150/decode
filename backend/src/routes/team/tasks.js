import { Router } from 'express';
import { submitAnswer, getTaskByToken, getRound2State } from '../../services/task.js';
import { validate } from '../../middleware/validate.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from '../../utils/errors.js';
import { z } from 'zod';

const router = Router();

// Defense-in-depth middleware: check DB directly to ensure password was changed
const enforcePasswordChange = async (req, res, next) => {
  try {
    const [user] = await db.select({ mustResetPassword: users.mustResetPassword }).from(users).where(eq(users.id, req.user.id));
    if (user?.mustResetPassword) {
      throw new UnauthorizedError('You must change your default password before accessing tasks.');
    }
    next();
  } catch (err) {
    next(err);
  }
};

const answerSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
});

// GET /api/team/tasks/:token — access task via QR code secure token
router.get('/:token', enforcePasswordChange, async (req, res, next) => {
  try {
    const task = await getTaskByToken(req.user.id, req.params.token);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// POST /api/team/tasks/:id/answer — submit answer (works for both Round 1 and Round 2)
router.post('/:id/answer', enforcePasswordChange, validate(answerSchema), async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const { answer } = req.validatedBody;
    
    const result = await submitAnswer(req.user.id, taskId, answer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/team/tasks/round2/:roundId — get Round 2 question state
router.get('/round2/:roundId', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);
    const state = await getRound2State(req.user.id, roundId);
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
});

export default router;
