import { fail } from '@sveltejs/kit'
import { max, sql } from 'drizzle-orm'
import { getDb } from '$lib/server/db'
import { entries, projects } from '$lib/server/db/schema'
import type { Actions, PageServerLoad } from './$types'

interface ProjectRow {
	id: number
	name: string
	color: string
	totalSeconds: number
	lastActivity: Date | null
}

export const load: PageServerLoad = async () => {
	const db = await getDb()

	const allProjects = await db.select().from(projects)

	// Aggregate total seconds and last activity per project
	const agg = await db
		.select({
			projectId: entries.projectId,
			totalSeconds: sql<number>`coalesce(sum(${entries.seconds}), 0)`,
			lastActivity: max(entries.end)
		})
		.from(entries)
		.groupBy(entries.projectId)

	const aggMap = new Map(agg.map((r) => [r.projectId, r]))

	const projectRows: ProjectRow[] = allProjects.map((p) => {
		const a = aggMap.get(p.id)
		return {
			id: p.id,
			name: p.name,
			color: p.color,
			totalSeconds: a?.totalSeconds ?? 0,
			lastActivity: a?.lastActivity ?? null
		}
	})

	return { projects: projectRows }
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData()
		const name = form.get('name')
		const color = form.get('color')

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return fail(400, { error: 'Name ist erforderlich' })
		}
		if (!color || typeof color !== 'string') {
			return fail(400, { error: 'Farbe ist erforderlich' })
		}

		const db = await getDb()
		await db.insert(projects).values({ name: name.trim(), color })
		return { success: true }
	}
}
