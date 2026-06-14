<script lang="ts">
interface ProjectRow {
	id: number
	name: string
	color: string
	totalSeconds: number
	lastActivity: Date | null
}

interface Props {
	data: {
		projects: ProjectRow[]
	}
	form?: {
		error?: string
		success?: boolean
	} | null
}

let { data, form }: Props = $props()

const PRESETS = [
	'hsl(220 70% 55%)',
	'hsl(160 60% 45%)',
	'hsl(340 65% 55%)',
	'hsl(40 80% 50%)',
	'hsl(270 55% 55%)',
	'hsl(190 65% 45%)',
	'hsl(15 70% 55%)',
	'hsl(90 50% 45%)'
]

let _selectedColor = $state(PRESETS[0])

function _relativeTime(date: Date | null): string {
	if (!date) return '—'
	const now = Date.now()
	const then = new Date(date).getTime()
	const diffMs = now - then
	const diffMin = Math.floor(diffMs / 60000)
	if (diffMin < 1) return 'gerade eben'
	if (diffMin < 60) return `vor ${diffMin} Min.`
	const diffH = Math.floor(diffMin / 60)
	if (diffH < 24) return `vor ${diffH} Std.`
	const diffD = Math.floor(diffH / 24)
	return `vor ${diffD} Tag${diffD > 1 ? 'en' : ''}`
}
</script>

<div class="projects-page">
	<section class="section-head">
		<div class="section-head-row">
			<p class="eyebrow">Projekte</p>
		</div>
	</section>

	{#if data.projects.length === 0}
		<p class="empty-text">Noch keine Projekte. Erstelle eins unten.</p>
	{:else}
		<div class="project-grid">
			{#each data.projects as project (project.id)}
				<div class="card card-pad project-card">
					<div class="project-card-header">
						<div class="color-dot" style:background={project.color} aria-hidden="true"></div>
						<span class="project-name">{project.name}</span>
					</div>
					<div class="project-card-stats">
						<div class="stat">
							<span class="stat-value tabular">{fmtHm(project.totalSeconds)}</span>
							<span class="stat-label">Gesamt</span>
						</div>
						<div class="stat">
							<span class="stat-value">{relativeTime(project.lastActivity)}</span>
							<span class="stat-label">Letzte Aktivität</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create form -->
	<div class="card card-pad create-card">
		<p class="eyebrow mb-3">Neues Projekt</p>
		{#if form?.error}
			<p class="form-error">{form.error}</p>
		{/if}
		<form method="POST" action="?/create" use:enhance>
			<div class="form-row">
				<input
					name="name"
					type="text"
					placeholder="Projektname"
					required
					class="input"
					autocomplete="off"
				/>
				<input type="hidden" name="color" value={selectedColor} />
				<button type="submit" class="btn btn-primary">Erstellen</button>
			</div>
			<div class="color-picker">
				{#each PRESETS as color, i (i)}
					<button
						type="button"
						class="color-swatch"
						class:selected={selectedColor === color}
						style:background={color}
						onclick={() => (selectedColor = color)}
						aria-label="Farbe wählen"
					></button>
				{/each}
			</div>
		</form>
	</div>
</div>

<style>
	.projects-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		max-width: 800px;
	}

	.empty-text {
		font-size: 13px;
		color: hsl(var(--text-muted));
		padding: 8px 0;
	}

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}

	.project-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.project-card-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-size: 14px;
		font-weight: 600;
		color: hsl(var(--text-primary));
	}

	.project-card-stats {
		display: flex;
		gap: 20px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-value {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-primary));
	}

	.stat-label {
		font-size: 11px;
		color: hsl(var(--text-muted));
	}

	.create-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-error {
		font-size: 12px;
		color: hsl(var(--state-error));
	}

	.form-row {
		display: flex;
		gap: 8px;
	}

	.input {
		flex: 1;
		height: 32px;
		padding: 0 10px;
		border: 1px solid hsl(var(--border-default));
		border-radius: 6px;
		background: hsl(var(--surface-0));
		color: hsl(var(--text-primary));
		font-size: 13px;
		outline: none;
		transition: border-color var(--duration-base) var(--ease-out);
	}

	.input:focus {
		border-color: hsl(var(--accent));
	}

	.color-picker {
		display: flex;
		gap: 6px;
		margin-top: 4px;
	}

	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition: all var(--duration-base) var(--ease-out);
	}

	.color-swatch:hover {
		opacity: 0.85;
	}

	.color-swatch.selected {
		border-color: hsl(var(--text-primary));
		box-shadow: 0 0 0 2px hsl(var(--surface-1));
	}
</style>
