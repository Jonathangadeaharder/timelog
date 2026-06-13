import { eq } from 'drizzle-orm'
import { getDb } from '$lib/server/db'
import { settings } from '$lib/server/db/schema'
import type { Actions, PageServerLoad } from './$types'

const DEFAULTS: Record<string, string> = {
	silenceThreshold: '300',
	checkinInterval: '1800',
	speechEnergy: '800',
	theme: 'dark',
	accent: 'cyan'
}

export const load: PageServerLoad = async () => {
	const db = await getDb()
	const rows = await db.select().from(settings)
	const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
	return { settings: { ...DEFAULTS, ...map } }
}

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData()
		const db = await getDb()

		const keys = ['silenceThreshold', 'checkinInterval', 'speechEnergy', 'theme', 'accent']

		for (const key of keys) {
			const value = form.get(key)
			if (typeof value !== 'string') continue

			const existing = await db.select().from(settings).where(eq(settings.key, key))
			if (existing.length > 0) {
				await db.update(settings).set({ value }).where(eq(settings.key, key))
			} else {
				await db.insert(settings).values({ key, value })
			}
		}

		return { success: true }
	}
}
