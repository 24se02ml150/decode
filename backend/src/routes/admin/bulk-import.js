import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq, like, desc, inArray } from 'drizzle-orm';
import { BadRequestError } from '../../utils/errors.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/admin/teams/bulk-import/preview
router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded.');
    }

    if (!req.file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      throw new BadRequestError('Invalid file format. Please upload an Excel (.xlsx/.xls) or CSV file.');
    }

    // Parse workbook
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) {
      throw new BadRequestError('Excel file is empty.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (rawRows.length === 0) {
      throw new BadRequestError('No data found in the file.');
    }
    if (rawRows.length > 500) {
      throw new BadRequestError('Maximum 500 rows allowed per import.');
    }

    // Process rows and validate
    const preview = [];
    const seenTeamNames = new Set();
    const teamNamesToCheck = [];

    // First pass: extract normalized names to check DB in bulk
    for (const [index, row] of rawRows.entries()) {
      // Find case-insensitive headers
      let teamName = '';
      let leaderName = '';
      
      for (const [key, val] of Object.entries(row)) {
        const lowerKey = key.trim().toLowerCase();
        if (lowerKey === 'team name') teamName = String(val).trim();
        else if (lowerKey === 'team leader name') leaderName = String(val).trim();
      }
      
      if (teamName) {
        teamNamesToCheck.push(teamName);
      }
    }
    
    // Bulk check existing teams
    let existingTeamNames = new Set();
    if (teamNamesToCheck.length > 0) {
      const existing = await db
        .select({ teamName: users.teamName })
        .from(users)
        .where(inArray(users.teamName, teamNamesToCheck));
        
      existingTeamNames = new Set(existing.map(u => u.teamName.toLowerCase()));
    }

    // Second pass: full validation
    for (const [index, row] of rawRows.entries()) {
      let teamName = '';
      let leaderName = '';
      
      for (const [key, val] of Object.entries(row)) {
        const lowerKey = key.trim().toLowerCase();
        if (lowerKey === 'team name') teamName = String(val).trim();
        else if (lowerKey === 'team leader name') leaderName = String(val).trim();
      }

      const rowNumber = index + 2; // +1 for 0-index, +1 for header row
      const result = {
        rowNumber,
        teamName,
        leaderName,
        isValid: true,
        error: null
      };

      if (!teamName) {
        result.isValid = false;
        result.error = 'Team Name is missing';
      } else if (!leaderName) {
        result.isValid = false;
        result.error = 'Team Leader Name is missing';
      } else if (seenTeamNames.has(teamName.toLowerCase())) {
        result.isValid = false;
        result.error = 'Duplicate Team Name within this file';
      } else if (existingTeamNames.has(teamName.toLowerCase())) {
        result.isValid = false;
        result.error = 'Team Name already exists in the system';
      }

      if (teamName) {
        seenTeamNames.add(teamName.toLowerCase());
      }
      
      preview.push(result);
    }

    res.json({ success: true, data: { preview } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/teams/bulk-import/confirm
router.post('/confirm', async (req, res, next) => {
  try {
    const { validRows } = req.body;
    
    if (!validRows || !Array.isArray(validRows) || validRows.length === 0) {
      throw new BadRequestError('No valid rows provided to import.');
    }

    const defaultPassword = 'Campus@2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const createdTeams = [];

    // Use a transaction
    await db.transaction(async (tx) => {
      // Get the highest team ID suffix to continue sequentially
      // teamId format is expected to be e.g. TEAM001, TEAM002, etc.
      let nextNum = 1;
      
      const [highest] = await tx
        .select({ teamId: users.teamId })
        .from(users)
        .where(like(users.teamId, 'TEAM%'))
        .orderBy(desc(users.teamId))
        .limit(1);

      if (highest && highest.teamId) {
        const match = highest.teamId.match(/TEAM(\d+)/i);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      for (const row of validRows) {
        // Double check it doesn't already exist in DB just in case
        const [exists] = await tx
          .select()
          .from(users)
          .where(eq(users.teamName, row.teamName));
          
        if (exists) {
          throw new BadRequestError(`Failed mid-batch: Team Name "${row.teamName}" already exists. Batch aborted.`);
        }

        const teamId = `TEAM${String(nextNum).padStart(3, '0')}`;
        nextNum++;

        const [newTeam] = await tx.insert(users).values({
          teamId,
          teamName: row.teamName,
          leaderName: row.leaderName,
          password: hashedPassword,
          mustResetPassword: true,
          role: 'team',
        }).returning({
          teamId: users.teamId,
          teamName: users.teamName,
          leaderName: users.leaderName
        });

        createdTeams.push({
          ...newTeam,
          defaultPassword
        });
      }
    });

    res.json({ 
      success: true, 
      data: { created: createdTeams } 
    });
  } catch (err) {
    next(err);
  }
});

export default router;
