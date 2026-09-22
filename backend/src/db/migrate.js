import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

async function migrate() {
  console.log('🔄 Pushing schema to database...');
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Create tables using raw SQL since drizzle-kit push requires CLI
  const createSQL = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      team_id VARCHAR(50) UNIQUE,
      team_name VARCHAR(255),
      email VARCHAR(255),
      password TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'team',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_team_id_idx ON users(team_id);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

    -- Events table
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Rounds table
    CREATE TABLE IF NOT EXISTS rounds (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      round_number INTEGER NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      qualify_count INTEGER,
      qualify_by VARCHAR(50) DEFAULT 'score',
      time_limit INTEGER,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rounds_event_round_idx ON rounds(event_id, round_number);
    CREATE INDEX IF NOT EXISTS rounds_event_id_idx ON rounds(event_id);

    -- Locations table
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS locations_event_id_idx ON locations(event_id);

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      title VARCHAR(255),
      task_order INTEGER NOT NULL,
      question TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      case_sensitive BOOLEAN NOT NULL DEFAULT false,
      location_hint TEXT,
      points INTEGER NOT NULL DEFAULT 10,
      max_attempts INTEGER,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tasks_round_order_idx ON tasks(round_id, task_order);
    CREATE INDEX IF NOT EXISTS tasks_round_id_idx ON tasks(round_id);
    CREATE INDEX IF NOT EXISTS tasks_location_id_idx ON tasks(location_id);

    -- QR Codes table
    CREATE TABLE IF NOT EXISTS qr_codes (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      secure_token VARCHAR(64) NOT NULL UNIQUE,
      qr_data_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_token_idx ON qr_codes(secure_token);
    CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_task_idx ON qr_codes(task_id);

    -- Team Rounds table
    CREATE TABLE IF NOT EXISTS team_rounds (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      is_qualified BOOLEAN,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS team_rounds_unique_idx ON team_rounds(team_id, round_id);
    CREATE INDEX IF NOT EXISTS team_rounds_team_idx ON team_rounds(team_id);
    CREATE INDEX IF NOT EXISTS team_rounds_round_idx ON team_rounds(round_id);

    -- Team Tasks table
    CREATE TABLE IF NOT EXISTS team_tasks (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      is_unlocked BOOLEAN NOT NULL DEFAULT false,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct_attempts INTEGER NOT NULL DEFAULT 0,
      wrong_attempts INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS team_tasks_unique_idx ON team_tasks(team_id, task_id);
    CREATE INDEX IF NOT EXISTS team_tasks_team_idx ON team_tasks(team_id);
    CREATE INDEX IF NOT EXISTS team_tasks_task_idx ON team_tasks(task_id);

    -- Task Attempts table
    CREATE TABLE IF NOT EXISTS task_attempts (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      attempt_number INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS task_attempts_team_task_idx ON task_attempts(team_id, task_id);
    CREATE INDEX IF NOT EXISTS task_attempts_team_idx ON task_attempts(team_id);

    -- Admin Logs table
    CREATE TABLE IF NOT EXISTS admin_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS admin_logs_admin_idx ON admin_logs(admin_id);
    CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON admin_logs(created_at);

    -- Add round_type and assign_count to rounds (safe ALTER)
    ALTER TABLE rounds ADD COLUMN IF NOT EXISTS round_type VARCHAR(20) NOT NULL DEFAULT 'qr_hunt';
    ALTER TABLE rounds ADD COLUMN IF NOT EXISTS assign_count INTEGER;

    -- Team Task Assignments table
    CREATE TABLE IF NOT EXISTS team_task_assignments (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      assignment_order INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS team_task_assignments_unique_idx ON team_task_assignments(team_id, round_id, task_id);
    CREATE INDEX IF NOT EXISTS team_task_assignments_team_round_idx ON team_task_assignments(team_id, round_id);

    -- Round 2 Config table
    CREATE TABLE IF NOT EXISTS round2_config (
      id SERIAL PRIMARY KEY,
      round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE UNIQUE,
      explanation_text TEXT,
      whatsapp_link TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS round2_config_round_idx ON round2_config(round_id);
  `;

  // Execute each statement separately
  const statements = createSQL.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    try {
      await sql(stmt);
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message?.includes('already exists')) {
        console.error('Error executing:', stmt.trim().substring(0, 60), err.message);
      }
    }
  }

  console.log('✅ Database schema pushed successfully!');
}

migrate().catch(console.error);
