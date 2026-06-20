const STORAGE_KEY = 'timelog-timer-state'

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

interface TimerPersistedState {
	currentProjectId: number | null
	currentProjectName: string
	currentProjectColor: string
	currentTask: string
	startTime: number | null
}

export class TimerService {
	currentProjectId: number | null = $state(null)
	currentProjectName = $state('')
	currentProjectColor = $state('')
	currentTask = $state('')
	startTime: number | null = $state(null)
	isRunning = $state(false)
	elapsedSeconds = $state(0)

	private intervalId: ReturnType<typeof setInterval> | null = null
	private destroyEffect: (() => void) | null = null

	constructor() {
		if (isBrowser) {
			this.restoreFromStorage()
			this.setupPersistence()
		}
	}

	destroy(): void {
		if (this.destroyEffect !== null) {
			this.destroyEffect()
			this.destroyEffect = null
		}
		if (this.isRunning) {
			this.clearInterval()
			this.resetState()
		}
	}

	start(projectId: number, projectName: string, projectColor: string, task: string): void {
		if (this.isRunning) {
			this.clearInterval()
		}

		this.currentProjectId = projectId
		this.currentProjectName = projectName
		this.currentProjectColor = projectColor
		this.currentTask = task
		this.startTime = Date.now()
		this.elapsedSeconds = 0
		this.isRunning = true

		this.intervalId = setInterval(() => {
			if (this.startTime !== null) {
				this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000)
			}
		}, 1000)
	}

	stop(): { projectId: number; task: string; start: string; seconds: number } {
		if (!this.isRunning || this.startTime === null || this.currentProjectId === null) {
			throw new Error('Timer is not running')
		}

		const totalSeconds = Math.floor((Date.now() - this.startTime) / 1000)
		const entryData = {
			projectId: this.currentProjectId,
			task: this.currentTask,
			start: new Date(this.startTime).toISOString(),
			seconds: totalSeconds
		}

		this.clearInterval()
		this.resetState()
		this.clearStorage()

		return entryData
	}

	switch(
		projectId: number,
		projectName: string,
		projectColor: string,
		task: string
	): { projectId: number; task: string; start: string; seconds: number } {
		const entryData = this.stop()
		this.start(projectId, projectName, projectColor, task)
		return entryData
	}

	private clearInterval(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	private resetState(): void {
		this.currentProjectId = null
		this.currentProjectName = ''
		this.currentProjectColor = ''
		this.currentTask = ''
		this.startTime = null
		this.isRunning = false
		this.elapsedSeconds = 0
	}

	private setupPersistence(): void {
		this.destroyEffect = $effect.root(() => {
			$effect(() => {
				const running = this.isRunning
				const start = this.startTime

				if (running && start !== null) {
					this.saveToStorage()
				} else if (!running) {
					this.clearStorage()
				}
			})
		})
	}

	private saveToStorage(): void {
		if (!isBrowser) return
		const state: TimerPersistedState = {
			currentProjectId: this.currentProjectId,
			currentProjectName: this.currentProjectName,
			currentProjectColor: this.currentProjectColor,
			currentTask: this.currentTask,
			startTime: this.startTime
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	}

	private clearStorage(): void {
		if (!isBrowser) return
		localStorage.removeItem(STORAGE_KEY)
	}

	private restoreFromStorage(): void {
		if (!isBrowser) return
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		try {
			const state: TimerPersistedState = JSON.parse(stored)
			if (state.startTime && state.currentProjectId !== null) {
				this.currentProjectId = state.currentProjectId
				this.currentProjectName = state.currentProjectName
				this.currentProjectColor = state.currentProjectColor
				this.currentTask = state.currentTask
				this.startTime = state.startTime
				this.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000)
				this.isRunning = true

				this.intervalId = setInterval(() => {
					if (this.startTime !== null) {
						this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000)
					}
				}, 1000)
			}
		} catch {
			this.clearStorage()
		}
	}
}

export const timer = new TimerService()
