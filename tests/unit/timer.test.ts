import { TimerService } from '$lib/client/timer.svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for TimerService.
 *
 * Svelte 5 runes ($state, $effect) in .svelte.ts files work in vitest
 * with jsdom environment when `resolve.conditions: ['browser']` is set
 * in vite.config.ts (already configured).
 *
 * We use vi.useFakeTimers() to control Date.now() and setInterval precisely.
 * The $effect for localStorage persistence runs on microtask — we use
 * vi.advanceTimersByTimeAsync() to flush both timers and microtasks.
 */

const STORAGE_KEY = 'timelog-timer-state'

let timer: TimerService

beforeEach(() => {
	localStorage.clear()
	vi.useFakeTimers()
	timer = new TimerService()
})

afterEach(() => {
	timer.destroy()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('TimerService', () => {
	describe('start()', () => {
		it('sets isRunning to true', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			expect(timer.isRunning).toBe(true)
		})

		it('sets current project and task fields', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			expect(timer.currentProjectId).toBe(1)
			expect(timer.currentProjectName).toBe('Project A')
			expect(timer.currentProjectColor).toBe('#ff0000')
			expect(timer.currentTask).toBe('Writing code')
		})

		it('sets startTime to current time', () => {
			const before = Date.now()
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			expect(timer.startTime).toBeGreaterThanOrEqual(before)
			expect(timer.startTime).toBeLessThanOrEqual(Date.now())
		})

		it('resets elapsedSeconds to 0', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			expect(timer.elapsedSeconds).toBe(0)
		})

		it('updates elapsedSeconds every second', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			expect(timer.elapsedSeconds).toBe(0)

			vi.advanceTimersByTime(1000)
			expect(timer.elapsedSeconds).toBe(1)

			vi.advanceTimersByTime(2000)
			expect(timer.elapsedSeconds).toBe(3)
		})

		it('stops previous timer if already running', () => {
			timer.start(1, 'Project A', '#ff0000', 'Task 1')
			vi.advanceTimersByTime(3000)

			// Starting a new timer without explicit stop should work
			timer.start(2, 'Project B', '#00ff00', 'Task 2')
			expect(timer.currentProjectId).toBe(2)
			expect(timer.currentTask).toBe('Task 2')
			expect(timer.elapsedSeconds).toBe(0)
		})
	})

	describe('stop()', () => {
		it('throws if timer is not running', () => {
			expect(() => timer.stop()).toThrow('Timer is not running')
		})

		it('returns entry data with correct seconds', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			vi.advanceTimersByTime(5000)

			const entry = timer.stop()
			expect(entry.projectId).toBe(1)
			expect(entry.task).toBe('Writing code')
			expect(entry.seconds).toBe(5)
		})

		it('returns ISO start time', () => {
			const now = Date.now()
			timer.start(1, 'Project A', '#ff0000', 'Writing code')

			const entry = timer.stop()
			expect(entry.start).toBe(new Date(now).toISOString())
		})

		it('resets all state fields', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			vi.advanceTimersByTime(2000)

			timer.stop()

			expect(timer.isRunning).toBe(false)
			expect(timer.currentProjectId).toBeNull()
			expect(timer.currentProjectName).toBe('')
			expect(timer.currentProjectColor).toBe('')
			expect(timer.currentTask).toBe('')
			expect(timer.startTime).toBeNull()
			expect(timer.elapsedSeconds).toBe(0)
		})

		it('stops the interval (elapsedSeconds stops updating)', () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			vi.advanceTimersByTime(2000)

			timer.stop()

			// Advance more time — elapsedSeconds should stay at 0
			vi.advanceTimersByTime(5000)
			expect(timer.elapsedSeconds).toBe(0)
		})

		it('clears localStorage', async () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			// Wait for $effect to persist
			await vi.advanceTimersByTimeAsync(100)

			timer.stop()
			await vi.advanceTimersByTimeAsync(100)

			expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
		})
	})

	describe('switch()', () => {
		it('stops old timer and starts new one', () => {
			timer.start(1, 'Project A', '#ff0000', 'Task 1')
			vi.advanceTimersByTime(3000)

			const entry = timer.switch(2, 'Project B', '#00ff00', 'Task 2')

			// Entry data from old timer
			expect(entry.projectId).toBe(1)
			expect(entry.task).toBe('Task 1')
			expect(entry.seconds).toBe(3)

			// New timer is running
			expect(timer.isRunning).toBe(true)
			expect(timer.currentProjectId).toBe(2)
			expect(timer.currentProjectName).toBe('Project B')
			expect(timer.currentProjectColor).toBe('#00ff00')
			expect(timer.currentTask).toBe('Task 2')
			expect(timer.elapsedSeconds).toBe(0)
		})

		it('returns correct entry data for multi-step switch', () => {
			timer.start(1, 'Project A', '#ff0000', 'Task 1')
			vi.advanceTimersByTime(2000)

			const entry1 = timer.switch(2, 'Project B', '#00ff00', 'Task 2')
			expect(entry1.projectId).toBe(1)
			expect(entry1.seconds).toBe(2)

			vi.advanceTimersByTime(5000)

			const entry2 = timer.switch(3, 'Project C', '#0000ff', 'Task 3')
			expect(entry2.projectId).toBe(2)
			expect(entry2.seconds).toBe(5)

			expect(timer.currentProjectId).toBe(3)
		})

		it('throws if no timer is running', () => {
			expect(() => timer.switch(1, 'Project A', '#ff0000', 'Task')).toThrow(
				'Timer is not running'
			)
		})
	})

	describe('localStorage persistence', () => {
		it('persists timer state when running', async () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')

			// Flush microtasks so $effect runs
			await vi.advanceTimersByTimeAsync(100)

			const stored = localStorage.getItem(STORAGE_KEY)
			expect(stored).not.toBeNull()

			const state = JSON.parse(stored!)
			expect(state.currentProjectId).toBe(1)
			expect(state.currentProjectName).toBe('Project A')
			expect(state.currentProjectColor).toBe('#ff0000')
			expect(state.currentTask).toBe('Writing code')
			expect(state.startTime).toBeTypeOf('number')
		})

		it('clears localStorage when timer stops', async () => {
			timer.start(1, 'Project A', '#ff0000', 'Writing code')
			await vi.advanceTimersByTimeAsync(100)

			timer.stop()
			await vi.advanceTimersByTimeAsync(100)

			expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
		})

		it('restores timer state from localStorage on construction', () => {
			// Pre-populate localStorage
			const persistedState = {
				currentProjectId: 5,
				currentProjectName: 'Restored Project',
				currentProjectColor: '#aabbcc',
				currentTask: 'Restored task',
				startTime: Date.now() - 60_000 // 1 minute ago
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))

			const restored = new TimerService()
			expect(restored.isRunning).toBe(true)
			expect(restored.currentProjectId).toBe(5)
			expect(restored.currentProjectName).toBe('Restored Project')
			expect(restored.currentProjectColor).toBe('#aabbcc')
			expect(restored.currentTask).toBe('Restored task')
			expect(restored.elapsedSeconds).toBeGreaterThanOrEqual(60)

			// Clean up the restored timer and its effect
			restored.destroy()
		})

		it('ignores invalid localStorage data', () => {
			localStorage.setItem(STORAGE_KEY, 'not-valid-json')

			const restored = new TimerService()
			expect(restored.isRunning).toBe(false)
			expect(restored.currentProjectId).toBeNull()
			restored.destroy()
		})

		it('ignores localStorage data with missing fields', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentProjectId: null }))

			const restored = new TimerService()
			expect(restored.isRunning).toBe(false)
			restored.destroy()
		})
	})
})
