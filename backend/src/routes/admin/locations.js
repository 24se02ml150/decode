import { Router } from 'express';
import { db } from '../../db/index.js';
import { locations } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';

const router = Router();

const createLocationSchema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1, 'Location name is required').max(255),
  description: z.string().optional(),
});

const updateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// GET /api/admin/locations
router.get('/', async (req, res, next) => {
  try {
    const eventId = req.query.eventId ? parseInt(req.query.eventId) : null;
    
    let locationList;
    if (eventId) {
      locationList = await db.select().from(locations).where(eq(locations.eventId, eventId)).orderBy(locations.name);
    } else {
      locationList = await db.select().from(locations).orderBy(locations.name);
    }

    res.json({ success: true, data: locationList });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/locations
router.post('/', validate(createLocationSchema), async (req, res, next) => {
  try {
    const [newLocation] = await db.insert(locations).values(req.validatedBody).returning();
    res.status(201).json({ success: true, data: newLocation });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/locations/:id
router.patch('/:id', validate(updateLocationSchema), async (req, res, next) => {
  try {
    const [updated] = await db.update(locations)
      .set(req.validatedBody)
      .where(eq(locations.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Location not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/locations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [deleted] = await db.delete(locations)
      .where(eq(locations.id, parseInt(req.params.id)))
      .returning({ id: locations.id });

    if (!deleted) throw new NotFoundError('Location not found.');
    res.json({ success: true, message: 'Location deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
