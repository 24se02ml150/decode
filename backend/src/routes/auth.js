import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  teamId: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.teamId || data.email, {
  message: 'Team ID or email is required',
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { teamId, email, password } = req.validatedBody;

    let user;
    if (email) {
      // Admin login by email
      const result = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.role, 'admin')));
      user = result[0];
    } else if (teamId) {
      // Team login by team ID
      const result = await db
        .select()
        .from(users)
        .where(eq(users.teamId, teamId.toUpperCase()));
      user = result[0];
    }

    if (!user) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('This account has been disabled.');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        teamId: user.teamId,
        teamName: user.teamName,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          role: user.role,
          teamId: user.teamId,
          teamName: user.teamName,
          email: user.email,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        teamId: users.teamId,
        teamName: users.teamName,
        email: users.email,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      throw new UnauthorizedError('User not found.');
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
