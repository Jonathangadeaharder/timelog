<script lang="ts">
	interface Props {
		silenceMinutes: number
		currentTask: string
		currentProject: string
		oncontinue: () => void
		onswitch: () => void
		onstop: () => void
	}

	let { silenceMinutes, currentTask, currentProject, oncontinue, onswitch, onstop }: Props = $props()
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Keine Sprache erkannt">
	<div class="card card-pad modal fade-up">
		<h2 class="display" style:font-size="1.25rem">
			Keine Sprache für {silenceMinutes} Min
		</h2>

		<div class="flex flex-col gap-2 mt-3">
			<div class="flex items-center gap-2">
				<span class="eyebrow">Projekt</span>
				<span class="text-sm">{currentProject}</span>
			</div>
			{#if currentTask}
				<div class="flex items-center gap-2">
					<span class="eyebrow">Aufgabe</span>
					<span class="text-sm">{currentTask}</span>
				</div>
			{/if}
		</div>

		<div class="flex gap-2 mt-6">
			<button class="btn btn-ghost flex-1 justify-center" onclick={oncontinue}>
				Weiter
			</button>
			<button class="btn flex-1 justify-center" onclick={onswitch}>
				Wechseln
			</button>
			<button class="btn btn-danger flex-1 justify-center" onclick={onstop}>
				Stop
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
</style>
