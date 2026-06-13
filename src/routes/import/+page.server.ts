import { fail } from '@sveltejs/kit'
import { getDb } from '$lib/server/db'
import { entries, projects } from '$lib/server/db/schema'

interface RawEntry {
	project: string
	task?: string
	start?: string
	end?: string
	seconds?: number
}

interface ImportResult {
	projectsCreated: number
	entriesImported: number
	skipped: number
}

export const load = async () => {
	const db = await getDb()
	const allProjects = await db.select().from(projects)
	const entryCount = (await db.select().from(entries)).length
	return { projects: allProjects, entryCount }
}

async function ensureProject(
	db: Awaited<ReturnType<typeof getDb>>,
	name: string,
	existing: Map<string, number>
): Promise<number> {
	const existingId = existing.get(name)
	if (existingId !== undefined) return existingId

	const HSL_PRESETS = [
		'hsl(220 70% 55%)',
		'hsl(160 60% 45%)',
		'hsl(340 65% 55%)',
		'hsl(40 80% 50%)',
		'hsl(270 55% 55%)',
		'hsl(190 65% 45%)',
		'hsl(15 70% 55%)',
		'hsl(90 50% 45%)'
	]
	const color = HSL_PRESETS[existing.size % HSL_PRESETS.length] as string

	const result = await db.insert(projects).values({ name, color }).returning({ id: projects.id })
	const id = result[0]!.id
	existing.set(name, id)
	return id
}

export const actions = {
	import: async ({ request }: { request: Request }) => {
		const form = await request.formData()
		const file = form.get('file')

		if (!file || !(file instanceof File)) {
			return fail(400, { error: 'Datei ist erforderlich' })
		}

		let raw: RawEntry[]
		try {
			const text = await file.text()
			raw = JSON.parse(text)
			if (!Array.isArray(raw)) throw new Error('Not an array')
		} catch {
			return fail(400, { error: 'Ungültige JSON-Datei' })
		}

		const db = await getDb()
		const existingProjects = await db.select().from(projects)
		const projectMap = new Map(existingProjects.map((p) => [p.name, p.id]))

		const existingEntries = await db.select({ start: entries.start }).from(entries)
		const existingStarts = new Set(existingEntries.map((e) => new Date(e.start).getTime()))

		let projectsCreated = 0
		let entriesImported = 0
		let skipped = 0

		for (const entry of raw) {
			if (!entry.project || !entry.start || !entry.end) {
				skipped++
				continue
			}

			const startMs = new Date(entry.start).getTime()
			if (Number.isNaN(startMs) || existingStarts.has(startMs)) {
				skipped++
				continue
			}

			const prevSize = projectMap.size
			const projectId = await ensureProject(db, entry.project, projectMap)
			if (projectMap.size > prevSize) projectsCreated++

			const seconds = Math.round(entry.seconds ?? (startMs - new Date(entry.end).getTime()) / 1000)

			await db.insert(entries).values({
				projectId,
				task: entry.task ?? '',
				start: new Date(entry.start),
				end: new Date(entry.end),
				seconds: Math.max(0, seconds)
			})

			existingStarts.add(startMs)
			entriesImported++
		}

		const result: ImportResult = { projectsCreated, entriesImported, skipped }
		return { success: true, result }
	}
}
