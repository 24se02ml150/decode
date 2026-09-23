import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';
import { users, teamRounds, teamTasks, taskAttempts, rounds, tasks, teamTaskAssignments } from '../../db/schema.js';
import { eq, and, sql, desc, ilike, count } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { generateTeamId, generatePassword, paginationParams } from '../../utils/helpers.js';
import bulkImportRoutes from './bulk-import.js';
import { z } from 'zod';

const router = Router();

// Mount bulk import routes first so they don't get caught by /:id
router.use('/bulk-import', bulkImportRoutes);

const createTeamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required').max(255),
  teamId: z.string().optional(),
  password: z.string().optional(),
});

const bulkCreateSchema = z.object({
  count: z.number().int().min(1).max(100),
  prefix: z.string().optional().default('Team'),
});

const updateTeamSchema = z.object({
  teamName: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/teams
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = paginationParams(req.query);
    const search = req.query.search || '';
    const status = req.query.status; // active, inactive

    let query = db.select({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
      leaderName: users.leaderName,
      mustResetPassword: users.mustResetPassword,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, 'team'));

    if (search) {
      query = db.select({
        id: users.id,
        teamId: users.teamId,
        teamName: users.teamName,
        leaderName: users.leaderName,
        mustResetPassword: users.mustResetPassword,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users).where(and(
        eq(users.role, 'team'),
        sql`(${users.teamName} ILIKE ${'%' + search + '%'} OR ${users.teamId} ILIKE ${'%' + search + '%'})`
      ));
    }

    if (status === 'active') {
      query = query.where(eq(users.isActive, true));
    } else if (status === 'inactive') {
      query = query.where(eq(users.isActive, false));
    }

    const teamList = await db.select({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
      leaderName: users.leaderName,
      mustResetPassword: users.mustResetPassword,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(
      search
        ? and(
            eq(users.role, 'team'),
            sql`(${users.teamName} ILIKE ${'%' + search + '%'} OR ${users.teamId} ILIKE ${'%' + search + '%'})`
          )
        : eq(users.role, 'team')
    ).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const [totalResult] = await db.select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.role, 'team'));

    res.json({
      success: true,
      data: {
        teams: teamList,
        pagination: {
          page,
          limit,
          total: parseInt(totalResult.count),
          totalPages: Math.ceil(parseInt(totalResult.count) / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/teams/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [team] = await db.select({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(and(eq(users.id, parseInt(req.params.id)), eq(users.role, 'team')));

    if (!team) throw new NotFoundError('Team not found.');

    // Get round progress
    const roundProgress = await db.select({
      roundId: teamRounds.roundId,
      score: teamRounds.score,
      tasksCompleted: teamRounds.tasksCompleted,
      isQualified: teamRounds.isQualified,
      startedAt: teamRounds.startedAt,
      completedAt: teamRounds.completedAt,
      roundName: rounds.name,
      roundNumber: rounds.roundNumber,
    }).from(teamRounds)
      .innerJoin(rounds, eq(teamRounds.roundId, rounds.id))
      .where(eq(teamRounds.teamId, team.id))
      .orderBy(rounds.roundNumber);

    // Get task details
    const taskDetails = await db.select({
      taskId: teamTasks.taskId,
      isCompleted: teamTasks.isCompleted,
      attempts: teamTasks.attempts,
      correctAttempts: teamTasks.correctAttempts,
      wrongAttempts: teamTasks.wrongAttempts,
      completedAt: teamTasks.completedAt,
      taskTitle: tasks.title,
      taskOrder: tasks.taskOrder,
      points: tasks.points,
      roundId: tasks.roundId,
      scanOffsetSeconds: teamTaskAssignments.scanOffsetSeconds,
      responseTimeSeconds: teamTaskAssignments.responseTimeSeconds,
    }).from(teamTasks)
      .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
      .leftJoin(teamTaskAssignments, and(
        eq(teamTaskAssignments.teamId, teamTasks.teamId),
        eq(teamTaskAssignments.taskId, teamTasks.taskId),
        eq(teamTaskAssignments.roundId, tasks.roundId)
      ))
      .where(eq(teamTasks.teamId, team.id))
      .orderBy(tasks.roundId, tasks.taskOrder);

    // Get recent attempts
    const recentAttempts = await db.select({
      answer: taskAttempts.answer,
      isCorrect: taskAttempts.isCorrect,
      attemptNumber: taskAttempts.attemptNumber,
      createdAt: taskAttempts.createdAt,
      taskTitle: tasks.title,
      taskOrder: tasks.taskOrder,
    }).from(taskAttempts)
      .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
      .where(eq(taskAttempts.teamId, team.id))
      .orderBy(desc(taskAttempts.createdAt))
      .limit(20);

    // Calculate totals
    const totalCorrect = taskDetails.reduce((sum, t) => sum + t.correctAttempts, 0);
    const totalWrong = taskDetails.reduce((sum, t) => sum + t.wrongAttempts, 0);
    const totalScore = roundProgress.reduce((sum, r) => sum + r.score, 0);

    res.json({
      success: true,
      data: {
        team,
        roundProgress,
        taskDetails,
        recentAttempts,
        summary: {
          totalScore,
          totalCorrect,
          totalWrong,
          totalAttempts: totalCorrect + totalWrong,
          lastActivity: recentAttempts[0]?.createdAt || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/teams
router.post('/', validate(createTeamSchema), async (req, res, next) => {
  try {
    const { teamName, teamId: customTeamId, password: customPassword } = req.validatedBody;
    
    const teamId = customTeamId?.toUpperCase() || generateTeamId();
    const password = customPassword || 'Campus@2026';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check duplicate
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.teamId, teamId));
    if (existing) throw new BadRequestError(`Team ID ${teamId} already exists.`);

    const [newTeam] = await db.insert(users).values({
      teamId,
      teamName,
      password: hashedPassword,
      role: 'team',
      mustResetPassword: true,
    }).returning({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
    });

    res.status(201).json({
      success: true,
      data: {
        ...newTeam,
        plainPassword: password, // Only shown once at creation
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/teams/bulk
router.post('/bulk', validate(bulkCreateSchema), async (req, res, next) => {
  try {
    const { count: teamCount, prefix } = req.validatedBody;
    const createdTeams = [];
    const password = 'Campus@2026';
    const hashedPassword = await bcrypt.hash(password, 12);

    for (let i = 0; i < teamCount; i++) {
      const teamId = generateTeamId();
      const teamName = `${prefix} ${i + 1}`;

      const [newTeam] = await db.insert(users).values({
        teamId,
        teamName,
        password: hashedPassword,
        role: 'team',
        mustResetPassword: true,
      }).returning({
        id: users.id,
        teamId: users.teamId,
        teamName: users.teamName,
      });

      createdTeams.push({ ...newTeam, plainPassword: password });
    }

    res.status(201).json({
      success: true,
      data: createdTeams,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teams/:id
router.patch('/:id', validate(updateTeamSchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody, updatedAt: new Date() };
    
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const [updated] = await db.update(users)
      .set(updates)
      .where(and(eq(users.id, parseInt(req.params.id)), eq(users.role, 'team')))
      .returning({
        id: users.id,
        teamId: users.teamId,
        teamName: users.teamName,
        isActive: users.isActive,
      });

    if (!updated) throw new NotFoundError('Team not found.');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});



// POST /api/admin/teams/bulk-delete
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('No team IDs provided.');
    }

    const teamIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (teamIds.length === 0) {
      throw new BadRequestError('Invalid team IDs.');
    }

    // Delete only teams (not admins) using existing cascade behavior
    const deleted = await db.delete(users)
      .where(and(
        inArray(users.id, teamIds),
        eq(users.role, 'team')
      ))
      .returning({ id: users.id });

    res.json({ 
      success: true, 
      message: `${deleted.length} team(s) deleted successfully.`,
      data: { deletedCount: deleted.length }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/teams/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [deleted] = await db.delete(users)
      .where(and(eq(users.id, parseInt(req.params.id)), eq(users.role, 'team')))
      .returning({ id: users.id });

    if (!deleted) throw new NotFoundError('Team not found.');

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    next(err);
  }
});

const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(1, 'New password is required'),
});

// POST /api/admin/teams/:id/reset-password
router.post('/:id/reset-password', validate(adminResetPasswordSchema), async (req, res, next) => {
  try {
    const { newPassword } = req.validatedBody;
    const teamId = parseInt(req.params.id);

    const [user] = await db.select().from(users).where(eq(users.id, teamId));
    if (!user) {
      throw new NotFoundError('Team not found.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ 
        password: hashedPassword, 
        mustResetPassword: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, teamId));

    res.json({ success: true, message: 'Password reset successfully. Team will be forced to change it on next login.' });
  } catch (err) {
    next(err);
  }
});

export default router;
