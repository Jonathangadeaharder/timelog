import { getDb } from '$lib/server/db/index'
import { entries, projects } from '$lib/server/db/schema'
import { isNull, gte, and, sql } from 'drizzle-orm'
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const db = await getDb()

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const [activeEntry] = await db
		.select()
		.from(entries)
		.where(isNull(entries.end))
		.limit(1)

	const todayEntries = await db
		.select()
		.from(entries)
		.where(gte(entries.start, today))

	const allProjects = await db.select().from(projects)

	return {
		activeEntry: activeEntry ?? null,
		todayEntries,
		projects: allProjects
	}
}

export const actions: Actions = {
	start: async ({ request }) => {
		const db = await getDb()
		const data = await request.formData()
		const projectId = Number(data.get('projectId'))
		const task = String(data.get('task') ?? '')

		if (!projectId) {
			return fail(400, { missing: true })
		}

		const now = new Date()

		await db.insert(entries).values({
			projectId,
			task,
			start: now,
			end: null,
			seconds: 0
		})

		return { success: true }
	},

	stop: async ({ request }) => {
		const db = await getDb()
		const data = await request.formData()
		const entryId = Number(data.get('entryId'))

		if (!entryId) {
			return fail(400, { missing: true })
		}

		const now = new Date()

		const [entry] = await db.select().from(entries).where(sql`${entries.id} = ${entryId}`).limit(1)

		if (!entry) {
			return fail(404, { notFound: true })
		}

		const elapsed = Math.floor((now.getTime() - entry.start.getTime()) / 1000)

		await db
			.update(entries)
			.set({ end: now, seconds: elapsed })
			.where(sql`${entries.id} = ${entryId}`)

		return { success: true }
	},

	switch: async ({ request }) => {
		const db = await getDb()
		const data = await request.formData()
		const projectId = Number(data.get('projectId'))
		const task = String(data.get('task') ?? '')

		if (!projectId) {
			return fail(400, { missing: true })
		}

		// Stop current entry
		const [active] = await db.select().from(entries).where(isNull(entries.end)).limit(1)

		if (active) {
			const now = new Date()
			const elapsed = Math.floor((now.getTime() - active.start.getTime()) / 1000)
			await db.update(entries).set({ end: now, seconds: elapsed }).where(sql`${entries.id} = ${active.id}`)
		}

		// Start new entry
		const now = new Date()
		await db.insert(entries).values({
			projectId,
			task,
			start: now,
			end: null,
			seconds: 0
		})

		return { success: true }
	}
}
