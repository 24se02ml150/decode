import { pgTable, text, integer, boolean, timestamp, uniqueIndex, index, serial, varchar, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Users (Admin + Team accounts) ───
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  teamId: varchar('team_id', { length: 50 }).unique(),
  teamName: varchar('team_name', { length: 255 }),
  leaderName: varchar('leader_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  password: text('password').notNull(),
  mustResetPassword: boolean('must_reset_password').notNull().default(false),
  role: varchar('role', { length: 20 }).notNull().default('team'), // 'admin' | 'team'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('users_team_id_idx').on(table.teamId),
  index('users_role_idx').on(table.role),
]);

// ─── Events ───
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, active, paused, completed
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Rounds ───
export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  roundNumber: integer('round_number').notNull(),
  description: text('description'),
  roundType: varchar('round_type', { length: 20 }).notNull().default('qr_hunt'), // 'qr_hunt' | 'questions'
  assignCount: integer('assign_count'), // how many tasks each team gets randomly assigned, null = all
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, paused, completed
  qualifyCount: integer('qualify_count'), // number of teams that qualify
  qualifyBy: varchar('qualify_by', { length: 50 }).default('score'), // score, tasks_completed, time, combined
  timeLimit: integer('time_limit'), // in minutes, null = no limit
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('rounds_event_round_idx').on(table.eventId, table.roundNumber),
  index('rounds_event_id_idx').on(table.eventId),
]);

// ─── Locations ───
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  taskPoolMode: varchar('task_pool_mode', { length: 20 }).notNull().default('single'), // 'single' | 'pool'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('locations_event_id_idx').on(table.eventId),
]);

// ─── Location Task Pool ───
export const locationTaskPool = pgTable('location_task_pool', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('location_task_pool_unique_idx').on(table.locationId, table.taskId),
  index('location_task_pool_location_idx').on(table.locationId),
]);

// ─── Tasks ───
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }),
  taskOrder: integer('task_order').notNull(),
  question: text('question').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  caseSensitive: boolean('case_sensitive').notNull().default(false),
  locationHint: text('location_hint'), // hint for the NEXT location (shown after correct answer)
  points: integer('points').notNull().default(10),
  maxAttempts: integer('max_attempts'), // null = unlimited
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('tasks_round_order_idx').on(table.roundId, table.taskOrder),
  index('tasks_round_id_idx').on(table.roundId),
  index('tasks_location_id_idx').on(table.locationId),
]);

// ─── QR Codes ───
export const qrCodes = pgTable('qr_codes', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'cascade' }),
  secureToken: varchar('secure_token', { length: 64 }).notNull().unique(),
  qrDataUrl: text('qr_data_url'), // base64 QR image
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('qr_codes_token_idx').on(table.secureToken),
  index('qr_codes_task_idx').on(table.taskId),
  index('qr_codes_location_idx').on(table.locationId),
]);

// ─── Team Rounds (team progress per round) ───
export const teamRounds = pgTable('team_rounds', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  score: integer('score').notNull().default(0),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  isQualified: boolean('is_qualified'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('team_rounds_unique_idx').on(table.teamId, table.roundId),
  index('team_rounds_team_idx').on(table.teamId),
  index('team_rounds_round_idx').on(table.roundId),
]);

// ─── Team Tasks (task completion per team) ───
export const teamTasks = pgTable('team_tasks', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  isCompleted: boolean('is_completed').notNull().default(false),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  attempts: integer('attempts').notNull().default(0),
  correctAttempts: integer('correct_attempts').notNull().default(0),
  wrongAttempts: integer('wrong_attempts').notNull().default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('team_tasks_unique_idx').on(table.teamId, table.taskId),
  index('team_tasks_team_idx').on(table.teamId),
  index('team_tasks_task_idx').on(table.taskId),
]);

// ─── Task Attempts (every answer logged) ───
export const taskAttempts = pgTable('task_attempts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('task_attempts_team_task_idx').on(table.teamId, table.taskId),
  index('task_attempts_team_idx').on(table.teamId),
]);

// ─── Team Task Assignments (fixed random assignments per team per round) ───
export const teamTaskAssignments = pgTable('team_task_assignments', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  assignmentOrder: integer('assignment_order').notNull(),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  responseTimeSeconds: integer('response_time_seconds'),
  scanOffsetSeconds: integer('scan_offset_seconds'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('team_task_assignments_unique_idx').on(table.teamId, table.roundId, table.taskId),
  index('team_task_assignments_team_round_idx').on(table.teamId, table.roundId),
  index('team_task_assignments_location_idx').on(table.locationId),
]);

// ─── Round 2 Config (explanation text + WhatsApp link) ───
export const round2Config = pgTable('round2_config', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }).unique(),
  explanationText: text('explanation_text'),
  whatsappLink: text('whatsapp_link'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('round2_config_round_idx').on(table.roundId),
]);

// ─── Admin Logs ───
export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('admin_logs_admin_idx').on(table.adminId),
  index('admin_logs_created_idx').on(table.createdAt),
]);

// ─── Relations ───
export const usersRelations = relations(users, ({ many }) => ({
  teamRounds: many(teamRounds),
  teamTasks: many(teamTasks),
  taskAttempts: many(taskAttempts),
  teamTaskAssignments: many(teamTaskAssignments),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  rounds: many(rounds),
  locations: many(locations),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  event: one(events, { fields: [rounds.eventId], references: [events.id] }),
  tasks: many(tasks),
  teamRounds: many(teamRounds),
  teamTaskAssignments: many(teamTaskAssignments),
  round2Config: one(round2Config, { fields: [rounds.id], references: [round2Config.roundId] }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  event: one(events, { fields: [locations.eventId], references: [events.id] }),
  tasks: many(tasks),
  locationTaskPools: many(locationTaskPool),
  qrCodes: many(qrCodes),
}));

export const locationTaskPoolRelations = relations(locationTaskPool, ({ one }) => ({
  location: one(locations, { fields: [locationTaskPool.locationId], references: [locations.id] }),
  task: one(tasks, { fields: [locationTaskPool.taskId], references: [tasks.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  round: one(rounds, { fields: [tasks.roundId], references: [rounds.id] }),
  location: one(locations, { fields: [tasks.locationId], references: [locations.id] }),
  qrCode: one(qrCodes, { fields: [tasks.id], references: [qrCodes.taskId] }),
  teamTasks: many(teamTasks),
  taskAttempts: many(taskAttempts),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  task: one(tasks, { fields: [qrCodes.taskId], references: [tasks.id] }),
  location: one(locations, { fields: [qrCodes.locationId], references: [locations.id] }),
}));

export const teamRoundsRelations = relations(teamRounds, ({ one }) => ({
  team: one(users, { fields: [teamRounds.teamId], references: [users.id] }),
  round: one(rounds, { fields: [teamRounds.roundId], references: [rounds.id] }),
}));

export const teamTasksRelations = relations(teamTasks, ({ one }) => ({
  team: one(users, { fields: [teamTasks.teamId], references: [users.id] }),
  task: one(tasks, { fields: [teamTasks.taskId], references: [tasks.id] }),
}));

export const taskAttemptsRelations = relations(taskAttempts, ({ one }) => ({
  team: one(users, { fields: [taskAttempts.teamId], references: [users.id] }),
  task: one(tasks, { fields: [taskAttempts.taskId], references: [tasks.id] }),
}));

export const teamTaskAssignmentsRelations = relations(teamTaskAssignments, ({ one }) => ({
  team: one(users, { fields: [teamTaskAssignments.teamId], references: [users.id] }),
  round: one(rounds, { fields: [teamTaskAssignments.roundId], references: [rounds.id] }),
  task: one(tasks, { fields: [teamTaskAssignments.taskId], references: [tasks.id] }),
}));

export const round2ConfigRelations = relations(round2Config, ({ one }) => ({
  round: one(rounds, { fields: [round2Config.roundId], references: [rounds.id] }),
}));
