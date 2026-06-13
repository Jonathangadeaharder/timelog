<script lang="ts">
import { enhance } from '$app/forms'
import CheckinDialog from '$lib/client/CheckinDialog.svelte'
import MicBadge from '$lib/client/MicBadge.svelte'
import MorningPrompt from '$lib/client/MorningPrompt.svelte'
import { MicEngine } from '$lib/client/mic.svelte'
import { notify, requestPermission } from '$lib/client/notifications'
import SilenceDialog from '$lib/client/SilenceDialog.svelte'
import TimerDisplay from '$lib/client/TimerDisplay.svelte'
import { timer } from '$lib/client/timer.svelte'
import { pickWellness } from '$lib/shared/wellness'

const CHECKIN_INTERVAL = 30 * 60 * 1000

interface Project {
	id: number
	name: string
	color: string
}

interface Entry {
	id: number
	projectId: number
	task: string
	start: Date
	end: Date | null
	seconds: number
}

interface PageData {
	activeEntry: Entry | null
	todayEntries: Entry[]
	projects: Project[]
}

let { data }: { data: PageData } = $props()

let showMorningPrompt = $state(false)
let showSilenceDialog = $state(false)
let showCheckinDialog = $state(false)
let showWrapUp = $state(false)
let mic: MicEngine | null = $state(null)

let silenceSeconds = $state(0)
let lastCheckinTime = $state(Date.now())

let hourNow = $state(new Date().getHours())
let isAfterSix = $derived(hourNow >= 18)

$effect(() => {
	const id = setInterval(() => {
		hourNow = new Date().getHours()
		if (mic?.silenceStart !== null && mic?.silenceStart !== undefined) {
			silenceSeconds = Math.floor((Date.now() - mic.silenceStart) / 1000)
		} else {
			silenceSeconds = 0
		}
	}, 1000)
	return () => clearInterval(id)
})

$effect(() => {
	if (data.activeEntry && !timer.isRunning) {
		const project = data.projects.find((p) => p.id === data.activeEntry!.projectId)
		if (project) {
			timer.currentProjectId = project.id
			timer.currentProjectName = project.name
			timer.currentProjectColor = project.color
			timer.currentTask = data.activeEntry.task
			timer.startTime = new Date(data.activeEntry.start).getTime()
			timer.elapsedSeconds = Math.floor(
				(Date.now() - new Date(data.activeEntry.start).getTime()) / 1000
			)
			timer.isRunning = true

			const intervalId = setInterval(() => {
				if (timer.startTime !== null) {
					timer.elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000)
				}
			}, 1000)
			;(timer as any).intervalId = intervalId
		}
	}
})

$effect(() => {
	showMorningPrompt = !timer.isRunning && !data.activeEntry
})

$effect(() => {
	showWrapUp = isAfterSix && timer.isRunning
})

$effect(() => {
	if (timer.isRunning && !mic) {
		mic = new MicEngine({ silenceThreshold: 3 * 60 * 1000 })
		mic.onSilence = () => {
			showSilenceDialog = true
			const tip = pickWellness()
			notify('Stille erkannt', tip)
		}
		requestPermission()
		mic.start()
	}

	return () => {
		if (mic) {
			mic.stop()
			mic = null
		}
	}
})

$effect(() => {
	if (!timer.isRunning) {
		lastCheckinTime = Date.now()
		return
	}
	const id = setInterval(() => {
		if (timer.isRunning && !showCheckinDialog && !showSilenceDialog) {
			const elapsed = Date.now() - lastCheckinTime
			if (elapsed >= CHECKIN_INTERVAL) {
				showCheckinDialog = true
				notify('Check-in', 'Zeit für einen Check-in!')
			}
		}
	}, 10000)
	return () => clearInterval(id)
})

function handleCheckinContinue() {
	showCheckinDialog = false
	lastCheckinTime = Date.now()
}

function handleCheckinSwitch() {
	showCheckinDialog = false
	lastCheckinTime = Date.now()
	showMorningPrompt = true
}

function handleMorningStart(details: {
	projectId: number
	projectName: string
	projectColor: string
	task: string
}) {
	showMorningPrompt = false
	timer.start(details.projectId, details.projectName, details.projectColor, details.task)
}

function handleSilenceContinue() {
	showSilenceDialog = false
	if (mic) {
		mic.silenceStart = Date.now()
	}
}

function handleSilenceSwitch() {
	showSilenceDialog = false
	showMorningPrompt = true
}

function handleSilenceStop() {
	showSilenceDialog = false
	stopTimer()
}

function stopTimer() {
	if (!timer.isRunning) return
	timer.stop()
	if (mic) {
		mic.stop()
		mic = null
	}
	showWrapUp = false
}

function handleWrapUpContinue() {
	showWrapUp = false
}
</script>

<div class="flex flex-col items-center gap-6 p-6">
	{#if timer.isRunning}
		<TimerDisplay
			elapsedSeconds={timer.elapsedSeconds}
			projectName={timer.currentProjectName}
			projectColor={timer.currentProjectColor}
			task={timer.currentTask}
		/>

		<div class="flex items-center gap-3">
			{#if mic}
				<MicBadge
					isSpeaking={mic.isSpeaking}
					silenceSeconds={silenceSeconds}
					silenceThreshold={Math.floor(mic.silenceThreshold / 1000)}
				/>
			{/if}
		</div>

		<form method="POST" action="?/stop" use:enhance class="flex gap-2 mt-2">
			<input type="hidden" name="entryId" value={data.activeEntry?.id ?? ''} />
			<button type="submit" class="btn btn-danger">⏹ Stoppen</button>
		</form>

		{#if showWrapUp}
			<div class="card card-pad mt-4 fade-up" role="dialog" aria-label="Feierabend">
				<p class="text-sm mb-3" style:color="hsl(var(--text-secondary))">
					Feierabend — Timer stoppen?
				</p>
				<div class="flex gap-2">
					<form method="POST" action="?/stop" use:enhance>
						<input type="hidden" name="entryId" value={data.activeEntry?.id ?? ''} />
						<button type="submit" class="btn btn-danger">Stop</button>
					</form>
					<button class="btn btn-ghost" onclick={handleWrapUpContinue}>Weiter</button>
				</div>
			</div>
		{/if}
	{:else if !showMorningPrompt}
		<p class="text-sm" style:color="hsl(var(--text-muted))">Kein Timer aktiv</p>
	{/if}
</div>

{#if showMorningPrompt}
	<MorningPrompt projects={data.projects} onstart={handleMorningStart} />
{/if}

{#if showSilenceDialog}
	<SilenceDialog
		silenceMinutes={3}
		currentTask={timer.currentTask}
		currentProject={timer.currentProjectName}
		oncontinue={handleSilenceContinue}
		onswitch={handleSilenceSwitch}
		onstop={handleSilenceStop}
	/>
{/if}

{#if showCheckinDialog}
	<CheckinDialog
		elapsedSeconds={timer.elapsedSeconds}
		currentTask={timer.currentTask}
		currentProject={timer.currentProjectName}
		oncontinue={handleCheckinContinue}
		onswitch={handleCheckinSwitch}
	/>
{/if}
