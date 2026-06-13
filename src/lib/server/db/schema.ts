import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
	id: serial('id').primaryKey(),
	name: text('name').unique().notNull(),
	color: text('color').notNull()
})

export const entries = pgTable('entries', {
	id: serial('id').primaryKey(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id),
	task: text('task').notNull().default(''),
	start: timestamp('start', { withTimezone: true }).notNull(),
	end: timestamp('end', { withTimezone: true }),
	seconds: integer('seconds').notNull().default(0)
})

export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
})
