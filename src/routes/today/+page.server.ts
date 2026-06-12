import { getDb } from '$lib/server/db'
import { entries, projects } from '$lib/server/db/schema'
import { eq, gte, lt, and, sql } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

interface ProjectTotal {
	projectId: number
	projectName: string
	projectColor: string
	totalSeconds: number
}

interface TodayEntry {
	id: number
	task: string
	start: Date
	end: Date | null
	seconds: number
	projectId: number
	projectName: string
	projectColor: string
}

export const load: PageServerLoad = async () => {
	const db = await getDb()

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const tomorrow = new Date(today)
	tomorrow.setDate(tomorrow.getDate() + 1)

	const todayEntries: TodayEntry[] = await db
		.select({
			id: entries.id,
			task: entries.task,
			start: entries.start,
			end: entries.end,
			seconds: entries.seconds,
			projectId: entries.projectId,
			projectName: projects.name,
			projectColor: projects.color
		})
		.from(entries)
		.innerJoin(projects, eq(entries.projectId, projects.id))
		.where(and(gte(entries.start, today), lt(entries.start, tomorrow)))
		.orderBy(entries.start)

	// Aggregate totals by project
	const map = new Map<number, ProjectTotal>()
	for (const entry of todayEntries) {
		const existing = map.get(entry.projectId)
		if (existing) {
			existing.totalSeconds += entry.seconds
		} else {
			map.set(entry.projectId, {
				projectId: entry.projectId,
				projectName: entry.projectName,
				projectColor: entry.projectColor,
				totalSeconds: entry.seconds
			})
		}
	}

	const projectTotals = [...map.values()].sort((a, b) => b.totalSeconds - a.totalSeconds)
	const totalSeconds = todayEntries.reduce((sum, e) => sum + e.seconds, 0)

	return {
		entries: todayEntries,
		projectTotals,
		totalSeconds,
		entryCount: todayEntries.length
	}
}
