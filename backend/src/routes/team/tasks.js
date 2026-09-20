import { Router } from 'express';
import { submitAnswer, getTaskByToken } from '../../services/task.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const answerSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
});

// GET /api/team/tasks/:token — access task via QR code secure token
router.get('/:token', async (req, res, next) => {
  try {
    const task = await getTaskByToken(req.user.id, req.params.token);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// POST /api/team/tasks/:id/answer — submit answer
router.post('/:id/answer', validate(answerSchema), async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const { answer } = req.validatedBody;
    
    const result = await submitAnswer(req.user.id, taskId, answer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
