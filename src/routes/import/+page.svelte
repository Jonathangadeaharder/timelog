<script lang="ts">
interface ImportResult {
	projectsCreated: number
	entriesImported: number
	skipped: number
}

interface Props {
	data: {
		projects: { id: number; name: string; color: string }[]
		entryCount: number
	}
	form: {
		error?: string
		success?: boolean
		result?: ImportResult
	} | null
}

let { data, form }: Props = $props()
</script>

<div class="import-page">
	<section class="section-head">
		<div class="section-head-row">
			<p class="eyebrow">Import</p>
		</div>
		<p class="text-sm" style:color="hsl(var(--text-secondary))">
			Importiere Einträge aus dem Python-Daemon (entries.json).
			Existierende Projekte werden wiederverwendet, Duplikate übersprungen.
		</p>
	</section>

	<div class="stats-row">
		<div class="stat">
			<span class="stat-value tabular">{data.projects.length}</span>
			<span class="stat-label">Projekte</span>
		</div>
		<div class="stat">
			<span class="stat-value tabular">{data.entryCount}</span>
			<span class="stat-label">Einträge</span>
		</div>
	</div>

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}

	{#if form?.success && form.result}
		<div class="card card-pad result-card fade-up">
			<p class="result-title">Import abgeschlossen</p>
			<div class="result-stats">
				<div class="result-stat">
					<span class="result-value">{form.result.projectsCreated}</span>
					<span class="result-label">Projekte erstellt</span>
				</div>
				<div class="result-stat">
					<span class="result-value">{form.result.entriesImported}</span>
					<span class="result-label">Einträge importiert</span>
				</div>
				<div class="result-stat">
					<span class="result-value">{form.result.skipped}</span>
					<span class="result-label">Übersprungen</span>
				</div>
			</div>
		</div>
	{/if}

	<div class="card card-pad upload-card">
		<form method="POST" action="?/import" use:enhance enctype="multipart/form-data">
			<div class="upload-row">
				<input type="file" name="file" accept=".json" required class="file-input" />
				<button type="submit" class="btn btn-primary">Importieren</button>
			</div>
		</form>
	</div>
</div>

<style>
	.import-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		max-width: 640px;
	}

	.stats-row {
		display: flex;
		gap: 20px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-value {
		font-size: 20px;
		font-weight: 600;
		color: hsl(var(--text-primary));
	}

	.stat-label {
		font-size: 11px;
		color: hsl(var(--text-muted));
	}

	.form-error {
		font-size: 13px;
		color: hsl(var(--state-error));
		background: hsl(var(--state-error-bg) / 0.5);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--state-error) / 0.3);
	}

	.result-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.result-title {
		font-size: 14px;
		font-weight: 600;
		color: hsl(var(--state-success));
	}

	.result-stats {
		display: flex;
		gap: 20px;
	}

	.result-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.result-value {
		font-size: 18px;
		font-weight: 600;
		color: hsl(var(--text-primary));
	}

	.result-label {
		font-size: 11px;
		color: hsl(var(--text-muted));
	}

	.upload-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.upload-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.file-input {
		flex: 1;
		font-size: 13px;
		color: hsl(var(--text-primary));
	}

	.file-input::file-selector-button {
		margin-right: 10px;
		padding: 4px 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--border-default));
		background: hsl(var(--surface-2));
		color: hsl(var(--text-primary));
		font-size: 12px;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
	}

	.file-input::file-selector-button:hover {
		border-color: hsl(var(--border-strong));
	}
</style>
