<script lang="ts">
import { fmtHm, fmtIso } from '$lib/shared/format'

interface Entry {
	task: string
	start: Date
	end: Date | null
	seconds: number
	projectName: string
	projectColor: string
}

interface Props {
	entry: Entry
}

let { entry }: Props = $props()

const startStr = $derived(fmtIso(new Date(entry.start)))
const endStr = $derived(entry.end ? fmtIso(new Date(entry.end)) : null)
const duration = $derived(fmtHm(entry.seconds))
const running = $derived(entry.end === null)
</script>

<div class="entry-row" class:running>
	<div class="entry-left">
		<div class="color-dot" style:background={entry.projectColor} aria-hidden="true"></div>
		<span class="project-name">{entry.projectName}</span>
		{#if entry.task}
			<span class="task-sep">·</span>
			<span class="task-text">{entry.task}</span>
		{/if}
	</div>

	<div class="entry-right">
		<span class="time-range tabular">
			{startStr}
			{#if endStr}
				→ {endStr}
			{:else}
				<span class="badge badge-accent">läuft…</span>
			{/if}
		</span>
		<span class="duration tabular">{duration}</span>
	</div>
</div>

<style>
	.entry-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid hsl(var(--border-subtle));
	}

	.entry-row:last-child {
		border-bottom: none;
	}

	.entry-row.running {
		background: hsl(var(--accent) / 0.04);
		margin: 0 -20px;
		padding-left: 20px;
		padding-right: 20px;
		border-radius: 6px;
	}

	.entry-left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-primary));
		white-space: nowrap;
	}

	.task-sep {
		color: hsl(var(--text-disabled));
	}

	.task-text {
		font-size: 13px;
		color: hsl(var(--text-secondary));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.entry-right {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-shrink: 0;
	}

	.time-range {
		font-size: 12px;
		color: hsl(var(--text-muted));
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.duration {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-secondary));
		min-width: 44px;
		text-align: right;
	}
</style>
