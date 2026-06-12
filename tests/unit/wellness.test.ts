import { WELLNESS_TIPS, pickWellness } from '$lib/shared/wellness'
import { describe, expect, it } from 'vitest'

describe('pickWellness', () => {
	it('returns a non-empty string', () => {
		const tip = pickWellness()
		expect(typeof tip).toBe('string')
		expect(tip.length).toBeGreaterThan(0)
	})

	it('returns a tip from the known list', () => {
		const tip = pickWellness()
		expect(WELLNESS_TIPS).toContain(tip)
	})

	it('has exactly 8 wellness tips', () => {
		expect(WELLNESS_TIPS).toHaveLength(8)
	})

	it('all tips are non-empty strings', () => {
		for (const tip of WELLNESS_TIPS) {
			expect(tip.length).toBeGreaterThan(0)
		}
	})
})
