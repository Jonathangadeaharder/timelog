import { fmtHm, fmtIso, fmtSeconds } from '$lib/shared/format'
import { describe, expect, it } from 'vitest'

describe('fmtSeconds', () => {
	it('formats 0 as 00:00:00', () => {
		expect(fmtSeconds(0)).toBe('00:00:00')
	})

	it('formats 65 as 00:01:05', () => {
		expect(fmtSeconds(65)).toBe('00:01:05')
	})

	it('formats 3661 as 01:01:01', () => {
		expect(fmtSeconds(3661)).toBe('01:01:01')
	})

	it('pads single-digit values', () => {
		expect(fmtSeconds(1)).toBe('00:00:01')
		expect(fmtSeconds(60)).toBe('00:01:00')
		expect(fmtSeconds(3600)).toBe('01:00:00')
	})
})

describe('fmtHm', () => {
	it('formats 65 as 01:05', () => {
		expect(fmtHm(65)).toBe('01:05')
	})

	it('formats 0 as 00:00', () => {
		expect(fmtHm(0)).toBe('00:00')
	})

	it('formats 3600 as 60:00', () => {
		expect(fmtHm(3600)).toBe('60:00')
	})
})

describe('fmtIso', () => {
	it('extracts HH:MM from a Date', () => {
		const date = new Date(2024, 0, 1, 9, 30, 45)
		expect(fmtIso(date)).toBe('09:30')
	})

	it('pads single-digit hours and minutes', () => {
		const date = new Date(2024, 0, 1, 1, 5, 0)
		expect(fmtIso(date)).toBe('01:05')
	})
})
