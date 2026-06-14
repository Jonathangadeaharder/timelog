<script lang="ts">
import { fmtSeconds } from '$lib/shared/format'

interface Props {
	elapsedSeconds: number
	projectName: string
	projectColor: string
	task: string
}

let { elapsedSeconds, projectName, projectColor, task }: Props = $props()
</script>

<div class="flex flex-col items-center gap-3 py-8">
	<div class="timer-display tabular" style:font-family="var(--font-mono)">
		{fmtSeconds(elapsedSeconds)}
	</div>

	<div class="flex items-center gap-2">
		<div
			class="color-dot"
			style:background={projectColor}
			aria-hidden="true"
		></div>
		<span class="project-name">{projectName}</span>
	</div>

	{#if task}
		<p class="task-text">{task}</p>
	{/if}
</div>

<style>
	.timer-display {
		font-size: 3.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: hsl(var(--text-primary));
		line-height: 1;
		animation: timelog-pulse 3s var(--ease-in-out) infinite;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-size: 15px;
		font-weight: 500;
		color: hsl(var(--text-secondary));
	}

	.task-text {
		font-size: 13px;
		color: hsl(var(--text-muted));
		margin: 0;
	}
</style>
