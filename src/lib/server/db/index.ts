import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from './schema'

let pgInstance: PGlite | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

export async function getDb() {
	if (dbInstance) return dbInstance

	pgInstance = new PGlite('./data/timelog')
	await pgInstance.waitReady?.()
	dbInstance = drizzle(pgInstance, { schema })
	return dbInstance
}

export async function closeDb() {
	if (pgInstance) {
		await pgInstance.close()
		pgInstance = null
		dbInstance = null
	}
}
