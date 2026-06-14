<script lang="ts">
interface Props {
	data: {
		settings: Record<string, string>
	}
	form: { success?: boolean; error?: string } | null
}

let { data, form }: Props = $props()

let silenceThreshold = $state(Number(data.settings.silenceThreshold ?? '300'))
let checkinInterval = $state(Number(data.settings.checkinInterval ?? '1800'))
let speechEnergy = $state(Number(data.settings.speechEnergy ?? '800'))
let theme = $state(data.settings.theme ?? 'dark')
let accent = $state(data.settings.accent ?? 'cyan')

const _accents = ['cyan', 'violet', 'amber', 'emerald'] as const
const _accentColors: Record<string, string> = {
	cyan: 'hsl(195 40% 55%)',
	violet: 'hsl(268 50% 65%)',
	amber: 'hsl(38 75% 60%)',
	emerald: 'hsl(158 45% 55%)'
}

function _fmtSeconds(s: number): string {
	const m = Math.floor(s / 60)
	const sec = s % 60
	return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function applyTheme() {
	document.documentElement.setAttribute('data-theme', theme)
}

function applyAccent() {
	document.documentElement.setAttribute('data-accent', accent)
}

$effect(() => {
	applyTheme()
})

$effect(() => {
	applyAccent()
})
</script>

<div class="settings-page">
	<div class="settings-header">
		<p class="eyebrow">Einstellungen</p>
		<h1 class="display" style="font-size: 1.5rem; color: hsl(var(--text-primary))">Settings</h1>
	</div>

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}

	{#if form?.success}
		<p class="form-success">Gespeichert.</p>
	{/if}

	<form method="POST" action="?/save" use:enhance>
		<!-- Timing card -->
		<section class="card card-pad settings-card">
			<p class="eyebrow mb-4">Timing</p>

			<div class="setting-row">
				<div class="setting-label">
					<span class="setting-name">Silence Threshold</span>
					<span class="setting-value tabular">{fmtSeconds(silenceThreshold)}</span>
				</div>
				<input
					type="range"
					name="silenceThreshold"
					min={60}
					max={900}
					step={10}
					bind:value={silenceThreshold}
				/>
			</div>

			<div class="setting-row">
				<div class="setting-label">
					<span class="setting-name">Check-in Interval</span>
					<span class="setting-value tabular">{fmtSeconds(checkinInterval)}</span>
				</div>
				<input
					type="range"
					name="checkinInterval"
					min={300}
					max={3600}
					step={60}
					bind:value={checkinInterval}
				/>
			</div>

			<div class="setting-row">
				<div class="setting-label">
					<span class="setting-name">Speech Energy</span>
					<span class="setting-value tabular">{speechEnergy}</span>
				</div>
				<input
					type="range"
					name="speechEnergy"
					min={200}
					max={2000}
					step={10}
					bind:value={speechEnergy}
				/>
			</div>
		</section>

		<!-- Appearance card -->
		<section class="card card-pad settings-card">
			<p class="eyebrow mb-4">Appearance</p>

			<div class="setting-row">
				<span class="setting-name">Theme</span>
				<div class="toggle-group">
					<label class="toggle-label">
						<input type="radio" name="theme" value="dark" bind:group={theme} />
						<span class="toggle-btn" class:active={theme === 'dark'}>Dark</span>
					</label>
					<label class="toggle-label">
						<input type="radio" name="theme" value="light" bind:group={theme} />
						<span class="toggle-btn" class:active={theme === 'light'}>Light</span>
					</label>
				</div>
			</div>

			<div class="setting-row">
				<span class="setting-name">Accent Color</span>
				<div class="accent-group">
					{#each accents as a}
						<label class="accent-label">
							<input type="radio" name="accent" value={a} bind:group={accent} />
							<span
								class="accent-swatch"
								class:active={accent === a}
								style:background={accentColors[a]}
							></span>
							<span class="accent-name">{a}</span>
						</label>
					{/each}
				</div>
			</div>
		</section>

		<div class="save-row">
			<button type="submit" class="btn btn-primary">Save</button>
		</div>
	</form>
</div>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		max-width: 640px;
	}

	.settings-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.settings-card {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.setting-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.setting-label {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.setting-name {
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--text-primary));
	}

	.setting-value {
		font-size: 12px;
		color: hsl(var(--accent));
	}

	/* Range slider */
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: hsl(var(--surface-3));
		outline: none;
		cursor: pointer;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: hsl(var(--accent));
		border: 2px solid hsl(var(--surface-0));
		cursor: pointer;
		transition: transform var(--duration-fast) var(--ease-out);
	}
	input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}
	input[type='range']::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: hsl(var(--accent));
		border: 2px solid hsl(var(--surface-0));
		cursor: pointer;
	}

	/* Toggle group (theme) */
	.toggle-group {
		display: flex;
		gap: 4px;
		background: hsl(var(--surface-2));
		border-radius: 6px;
		padding: 3px;
	}

	.toggle-label input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.toggle-label {
		position: relative;
	}

	.toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 14px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		color: hsl(var(--text-secondary));
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
	}

	.toggle-btn.active {
		background: hsl(var(--surface-0));
		color: hsl(var(--text-primary));
		box-shadow: var(--shadow-1);
	}

	/* Accent swatches */
	.accent-group {
		display: flex;
		gap: 12px;
	}

	.accent-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.accent-label input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.accent-swatch {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid transparent;
		transition: all var(--duration-fast) var(--ease-out);
	}

	.accent-swatch.active {
		border-color: hsl(var(--text-primary));
		transform: scale(1.15);
	}

	.accent-name {
		font-size: 11px;
		color: hsl(var(--text-muted));
		text-transform: capitalize;
	}

	/* Save row */
	.save-row {
		display: flex;
		justify-content: flex-end;
		padding-top: 4px;
	}

	/* Form feedback */
	.form-error {
		font-size: 13px;
		color: hsl(var(--state-error));
		background: hsl(var(--state-error-bg) / 0.5);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--state-error) / 0.3);
	}

	.form-success {
		font-size: 13px;
		color: hsl(var(--state-success));
		background: hsl(var(--state-success-bg) / 0.5);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--state-success) / 0.3);
	}
</style>
