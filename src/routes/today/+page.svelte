<script lang="ts">
	import { fmtHm } from '$lib/shared/format'
	import EntryRow from '$lib/client/EntryRow.svelte'

	interface ProjectTotal {
		projectId: number
		projectName: string
		projectColor: string
		totalSeconds: number
	}

	interface TodayEntry {
		id: number
		task: string
		start: Date
		end: Date | null
		seconds: number
		projectId: number
		projectName: string
		projectColor: string
	}

	interface Props {
		data: {
			entries: TodayEntry[]
			projectTotals: ProjectTotal[]
			totalSeconds: number
			entryCount: number
		}
	}

	let { data }: Props = $props()

	const totalHm = $derived(fmtHm(data.totalSeconds))
	const maxProjectSeconds = $derived(
		data.projectTotals.length > 0 ? (data.projectTotals[0]?.totalSeconds ?? 0) : 0
	)
</script>

<div class="today-page">
	<!-- Hero stats -->
	<section class="card card-pad hero-section">
		<p class="eyebrow">Heute</p>
		<div class="hero-stats">
			<div class="hero-stat">
				<span class="display tabular hero-value">{totalHm}</span>
				<span class="hero-label">Stunden</span>
			</div>
			<div class="hero-divider"></div>
			<div class="hero-stat">
				<span class="display tabular hero-value">{data.entryCount}</span>
				<span class="hero-label">Einträge</span>
			</div>
		</div>
	</section>

	<!-- Chronological entry list -->
	<section class="card card-pad entries-section">
		<p class="eyebrow mb-3">Einträge</p>
		{#if data.entries.length === 0}
			<p class="empty-text">Noch keine Einträge heute.</p>
		{:else}
			{#each data.entries as entry (entry.id)}
				<EntryRow {entry} />
			{/each}
		{/if}
	</section>

	<!-- Project breakdown -->
	{#if data.projectTotals.length > 0}
		<section class="card card-pad breakdown-section">
			<p class="eyebrow mb-3">Nach Projekt</p>
			{#each data.projectTotals as pt (pt.projectId)}
				<div class="project-row">
					<div class="project-row-header">
						<div class="project-row-left">
							<div class="color-dot" style:background={pt.projectColor} aria-hidden="true"></div>
							<span class="project-row-name">{pt.projectName}</span>
						</div>
						<span class="project-row-time tabular">{fmtHm(pt.totalSeconds)}</span>
					</div>
					<div class="bar-track">
						<div
							class="bar-fill"
							style:width="{maxProjectSeconds > 0 ? (pt.totalSeconds / maxProjectSeconds) * 100 : 0}%"
							style:background={pt.projectColor}
						></div>
					</div>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.today-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		max-width: 640px;
	}

	.hero-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hero-stats {
		display: flex;
		align-items: baseline;
		gap: 24px;
	}

	.hero-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.hero-value {
		font-size: 2.5rem;
		line-height: 1;
		color: hsl(var(--text-primary));
	}

	.hero-label {
		font-size: 12px;
		color: hsl(var(--text-muted));
	}

	.hero-divider {
		width: 1px;
		height: 36px;
		background: hsl(var(--border-subtle));
		align-self: center;
	}

	.entries-section {
		display: flex;
		flex-direction: column;
	}

	.empty-text {
		font-size: 13px;
		color: hsl(var(--text-muted));
		padding: 8px 0;
	}

	.breakdown-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.project-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.project-row-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.project-row-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-row-name {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-primary));
	}

	.project-row-time {
		font-size: 13px;
		color: hsl(var(--text-secondary));
		font-weight: 500;
	}

	.bar-track {
		height: 4px;
		border-radius: 2px;
		background: hsl(var(--surface-2));
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width var(--duration-slow) var(--ease-out);
	}
</style>
