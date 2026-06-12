import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { projects, entries, settings } from '$lib/server/db/schema'

describe('Database schema — entries, projects, settings', () => {
	let db: ReturnType<typeof drizzle>
	let pg: PGlite

	beforeAll(async () => {
		pg = new PGlite()
		db = drizzle(pg, { schema: { projects, entries, settings } })

		// Create tables directly for in-memory test (no migration files needed)
		await pg.exec(`
			CREATE TABLE IF NOT EXISTS projects (
				id SERIAL PRIMARY KEY,
				name TEXT UNIQUE NOT NULL,
				color TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS entries (
				id SERIAL PRIMARY KEY,
				project_id INTEGER NOT NULL REFERENCES projects(id),
				task TEXT NOT NULL DEFAULT '',
				start TIMESTAMP NOT NULL,
				"end" TIMESTAMP,
				seconds INTEGER NOT NULL DEFAULT 0
			);
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
		`)
	})

	afterAll(async () => {
		await pg.close()
	})

	it('inserts and reads a project', async () => {
		const inserted = await db
			.insert(projects)
			.values({ name: 'Timelog', color: 'hsl(220, 80%, 55%)' })
			.returning()

		expect(inserted[0]!.name).toBe('Timelog')
		expect(inserted[0]!.color).toBe('hsl(220, 80%, 55%)')
		expect(inserted[0]!.id).toBeTypeOf('number')

		const result = await db.select().from(projects).where(eq(projects.name, 'Timelog'))
		expect(result).toHaveLength(1)
		expect(result[0]!.name).toBe('Timelog')
	})

	it('inserts an entry with null end (running entry)', async () => {
		const project = await db
			.insert(projects)
			.values({ name: 'RunningTest', color: 'hsl(0, 0%, 50%)' })
			.returning()

		const entry = await db
			.insert(entries)
			.values({
				projectId: project[0]!.id,
				task: 'Working on schema',
				start: new Date('2025-01-01T09:00:00Z'),
				end: null,
				seconds: 0
			})
			.returning()

		expect(entry[0]!.task).toBe('Working on schema')
		expect(entry[0]!.end).toBeNull()
		expect(entry[0]!.seconds).toBe(0)

		const result = await db.select().from(entries).where(eq(entries.id, entry[0]!.id))
		expect(result).toHaveLength(1)
		expect(result[0]!.end).toBeNull()
	})

	it('inserts and reads settings', async () => {
		await db.insert(settings).values([
			{ key: 'silenceThreshold', value: '300' },
			{ key: 'checkinInterval', value: '1800' },
			{ key: 'speechEnergy', value: '800' }
		])

		const result = await db.select().from(settings)
		expect(result).toHaveLength(3)

		const silence = result.find((s) => s.key === 'silenceThreshold')
		expect(silence?.value).toBe('300')

		const checkin = result.find((s) => s.key === 'checkinInterval')
		expect(checkin?.value).toBe('1800')

		const energy = result.find((s) => s.key === 'speechEnergy')
		expect(energy?.value).toBe('800')
	})

	it('enforces unique project names', async () => {
		await db.insert(projects).values({ name: 'UniqueProj', color: 'hsl(120, 60%, 50%)' })

		await expect(
			db.insert(projects).values({ name: 'UniqueProj', color: 'hsl(0, 60%, 50%)' })
		).rejects.toThrow()
	})

	it('enforces FK on entries.projectId', async () => {
		await expect(
			db.insert(entries).values({
				projectId: 99999,
				task: 'orphan',
				start: new Date('2025-01-01T10:00:00Z'),
				seconds: 0
			})
		).rejects.toThrow()
	})
})
