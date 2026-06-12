<script lang="ts">
	import { fmtHm } from '$lib/shared/format'

	interface DayData {
		date: string
		dayName: string
		totalSeconds: number
		entries: {
			id: number
			task: string
			start: Date
			end: Date | null
			seconds: number
			projectId: number
			projectName: string
			projectColor: string
		}[]
	}

	interface ProjectTotal {
		projectId: number
		projectName: string
		projectColor: string
		totalSeconds: number
	}

	interface Props {
		data: {
			days: DayData[]
			projectTotals: ProjectTotal[]
			weekTotalSeconds: number
		}
	}

	let { data }: Props = $props()

	const weekTotalHm = $derived(fmtHm(data.weekTotalSeconds))
	const maxDaySeconds = $derived(Math.max(...data.days.map((d) => d.totalSeconds), 1))
	const maxProjectSeconds = $derived(
		data.projectTotals.length > 0 ? (data.projectTotals[0]?.totalSeconds ?? 0) : 0
	)

	function barHeight(seconds: number): string {
		if (maxDaySeconds === 0) return '0%'
		return `${(seconds / maxDaySeconds) * 100}%`
	}
</script>

<div class="week-page">
	<!-- Hero -->
	<section class="card card-pad hero-section">
		<p class="eyebrow">Woche</p>
		<span class="display tabular hero-value">{weekTotalHm}</span>
		<span class="hero-label">Stunden diese Woche</span>
	</section>

	<!-- 7-column day grid -->
	<section class="card card-pad days-section">
		<p class="eyebrow mb-4">Tage</p>
		<div class="day-grid">
			{#each data.days as day, i (day.date)}
				<div class="day-col" class:day-col--today={day.date === new Date().toISOString().slice(0, 10)}>
					<span class="day-name">{day.dayName}</span>
					<span class="day-date tabular">{day.date.slice(8)}</span>
					<div class="day-bar-track">
						<div
							class="day-bar-fill"
							style:height={barHeight(day.totalSeconds)}
						></div>
					</div>
					<span class="day-hours tabular">{fmtHm(day.totalSeconds)}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Project totals -->
	{#if data.projectTotals.length > 0}
		<section class="card card-pad projects-section">
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
							style:width={maxProjectSeconds > 0 ? `${(pt.totalSeconds / maxProjectSeconds) * 100}%` : '0%'}
							style:background={pt.projectColor}
						></div>
					</div>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.week-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		max-width: 800px;
	}

	.hero-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
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

	/* Day grid */
	.days-section {
		display: flex;
		flex-direction: column;
	}

	.day-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 8px;
	}

	.day-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 8px 4px;
		border-radius: 8px;
		transition: background var(--duration-base) var(--ease-out);
	}

	.day-col--today {
		background: hsl(var(--accent) / 0.08);
	}

	.day-name {
		font-family: var(--font-mono);
		font-size: 11px;
		color: hsl(var(--text-muted));
		letter-spacing: 0.04em;
	}

	.day-date {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-secondary));
	}

	.day-bar-track {
		width: 100%;
		height: 80px;
		border-radius: 4px;
		background: hsl(var(--surface-2));
		display: flex;
		align-items: flex-end;
		overflow: hidden;
	}

	.day-bar-fill {
		width: 100%;
		background: hsl(var(--accent));
		border-radius: 4px 4px 0 0;
		transition: height var(--duration-slow) var(--ease-out);
	}

	.day-hours {
		font-size: 12px;
		font-weight: 500;
		color: hsl(var(--text-primary));
	}

	/* Project rows — same pattern as today page */
	.projects-section {
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
