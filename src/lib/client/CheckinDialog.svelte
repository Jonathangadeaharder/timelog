<script lang="ts">
import { pickWellness } from '$lib/shared/wellness'

interface Props {
	elapsedSeconds: number
	currentTask: string
	currentProject: string
	oncontinue: () => void
	onswitch: () => void
}

let { elapsedSeconds, currentTask, currentProject, oncontinue, onswitch }: Props = $props()

let _tip = $state(pickWellness())
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Check-in">
	<div class="card card-pad modal fade-up">
		<h2 class="display" style:font-size="1.25rem">Check-in</h2>

		<div class="tip-box">
			<p class="tip-text">{tip}</p>
		</div>

		<div class="info-row">
			<div class="info-item">
				<span class="eyebrow">Projekt</span>
				<span class="info-value">{currentProject}</span>
			</div>
			{#if currentTask}
				<div class="info-item">
					<span class="eyebrow">Aufgabe</span>
					<span class="info-value">{currentTask}</span>
				</div>
			{/if}
			<div class="info-item">
				<span class="eyebrow">Dauer</span>
				<span class="info-value tabular">{fmtHm(elapsedSeconds)}</span>
			</div>
		</div>

		<div class="flex gap-2 mt-6">
			<button class="btn btn-ghost flex-1 justify-center" onclick={oncontinue}>
				Weiter
			</button>
			<button class="btn flex-1 justify-center" onclick={onswitch}>
				Wechseln
			</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(220 13% 4% / 0.7);
		backdrop-filter: blur(var(--blur));
	}

	.modal {
		width: 100%;
		max-width: 360px;
	}

	.tip-box {
		margin-top: 12px;
		padding: 10px 14px;
		border-radius: 8px;
		background: hsl(var(--accent) / 0.1);
		border: 1px solid hsl(var(--accent) / 0.2);
	}

	.tip-text {
		font-size: 13px;
		color: hsl(var(--accent));
		line-height: 1.5;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 16px;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.info-value {
		font-size: 13px;
		color: hsl(var(--text-primary));
	}
</style>
