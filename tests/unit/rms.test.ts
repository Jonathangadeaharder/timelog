import { describe, expect, it } from 'vitest'
import { rmsEnergy } from '$lib/client/mic.svelte'

describe('rmsEnergy', () => {
	it('returns 0 for silence (all zeros)', () => {
		const silence = new Float32Array(1024)
		expect(rmsEnergy(silence)).toBe(0)
	})

	it('returns >0 for noise', () => {
		const noise = new Float32Array(1024)
		for (let i = 0; i < noise.length; i++) {
			noise[i] = Math.random() * 2 - 1
		}
		expect(rmsEnergy(noise)).toBeGreaterThan(0)
	})

	it('returns 0 for empty array', () => {
		const empty = new Float32Array(0)
		expect(rmsEnergy(empty)).toBe(0)
	})

	it('returns value between 0 and 1', () => {
		const signal = new Float32Array(512)
		for (let i = 0; i < signal.length; i++) {
			signal[i] = Math.sin(i / 10)
		}
		const result = rmsEnergy(signal)
		expect(result).toBeGreaterThan(0)
		expect(result).toBeLessThanOrEqual(1)
	})
})
