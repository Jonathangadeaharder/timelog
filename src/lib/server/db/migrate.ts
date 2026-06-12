import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from './schema'

async function main() {
	const pg = new PGlite('./data/timelog')
	const db = drizzle(pg, { schema })

	console.log('Running migrations...')
	await migrate(db, { migrationsFolder: './drizzle' })
	console.log('Migrations complete.')

	await pg.close()
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
