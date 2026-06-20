import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from './schema'

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data', 'timelog')

let pgInstance: PGlite | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null
let initPromise: Promise<void> | null = null

async function init(): Promise<void> {
	mkdirSync(dataDir, { recursive: true })
	pgInstance = new PGlite(dataDir)
	await pgInstance.waitReady
	dbInstance = drizzle(pgInstance, { schema })
	await migrate(dbInstance, { migrationsFolder: './drizzle' })
}

export async function getDb() {
	if (!initPromise) initPromise = init()
	await initPromise
	return dbInstance!
}

export async function closeDb() {
	if (pgInstance) {
		await pgInstance.close()
		pgInstance = null
		dbInstance = null
		initPromise = null
	}
}
