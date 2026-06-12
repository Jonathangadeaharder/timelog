import { getDb } from '$lib/server/db'
import { entries, projects } from '$lib/server/db/schema'
import { eq, gte, lt, and } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

interface DayEntry {
	id: number
	task: string
	start: Date
	end: Date | null
	seconds: number
	projectId: number
	projectName: string
	projectColor: string
}

interface DayData {
	date: string
	dayName: string
	totalSeconds: number
	entries: DayEntry[]
}

interface ProjectTotal {
	projectId: number
	projectName: string
	projectColor: string
	totalSeconds: number
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function formatDate(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function getWeekBounds(): { monday: Date; sunday: Date } {
	const now = new Date()
	const dayOfWeek = now.getDay()
	// getDay(): 0=Sun, 1=Mon, ... 6=Sat
	// Monday offset: if Sun (0) → -6, else → 1 - dayOfWeek
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
	const monday = new Date(now)
	monday.setDate(now.getDate() + mondayOffset)
	monday.setHours(0, 0, 0, 0)

	const sunday = new Date(monday)
	sunday.setDate(monday.getDate() + 7)

	return { monday, sunday }
}

export const load: PageServerLoad = async () => {
	const db = await getDb()
	const { monday, sunday } = getWeekBounds()

	const weekEntries: DayEntry[] = await db
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
		.where(and(gte(entries.start, monday), lt(entries.start, sunday)))
		.orderBy(entries.start)

	// Build 7-day structure
	const days: DayData[] = []
	const projectMap = new Map<number, ProjectTotal>()

	for (let i = 0; i < 7; i++) {
		const dayDate = new Date(monday)
		dayDate.setDate(monday.getDate() + i)
		const isoDate = formatDate(dayDate)
		const dayName = DAY_NAMES[i] ?? ''

		const dayEntries = weekEntries.filter((e) => {
			const entryDate = formatDate(new Date(e.start))
			return entryDate === isoDate
		})

		const totalSeconds = dayEntries.reduce((sum, e) => sum + e.seconds, 0)

		days.push({
			date: isoDate,
			dayName,
			totalSeconds,
			entries: dayEntries
		})

		// Aggregate project totals
		for (const entry of dayEntries) {
			const existing = projectMap.get(entry.projectId)
			if (existing) {
				existing.totalSeconds += entry.seconds
			} else {
				projectMap.set(entry.projectId, {
					projectId: entry.projectId,
					projectName: entry.projectName,
					projectColor: entry.projectColor,
					totalSeconds: entry.seconds
				})
			}
		}
	}

	const projectTotals = [...projectMap.values()].sort((a, b) => b.totalSeconds - a.totalSeconds)
	const weekTotalSeconds = weekEntries.reduce((sum, e) => sum + e.seconds, 0)

	return {
		days,
		projectTotals,
		weekTotalSeconds
	}
}
