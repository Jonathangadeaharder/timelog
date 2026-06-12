<script lang="ts">
	interface Project {
		id: number
		name: string
		color: string
	}

	interface Props {
		projects: Project[]
		onstart: (data: { projectId: number; projectName: string; projectColor: string; task: string }) => void
	}

	let { projects, onstart }: Props = $props()

	let selectedProjectId = $state<number | null>(null)
	let task = $state('')

	function handleStart() {
		const project = projects.find((p) => p.id === selectedProjectId)
		if (!project) return

		onstart({
			projectId: project.id,
			projectName: project.name,
			projectColor: project.color,
			task
		})
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Was machst du?">
	<div class="card card-pad modal fade-up">
		<h2 class="display" style:font-size="1.5rem">Was machst du?</h2>

		<div class="flex flex-col gap-4 mt-6">
			<fieldset class="project-grid">
				{#each projects as project (project.id)}
					<button
						class="project-btn"
						class:selected={selectedProjectId === project.id}
						onclick={() => (selectedProjectId = project.id)}
						type="button"
					>
						<div class="color-dot" style:background={project.color}></div>
						<span>{project.name}</span>
					</button>
				{/each}
			</fieldset>

			<input
				type="text"
				class="task-input"
				placeholder="Aufgabe..."
				bind:value={task}
			/>

			<button
				class="btn btn-primary btn-lg w-full justify-center"
				onclick={handleStart}
				disabled={!selectedProjectId}
			>
				Loslegen
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
		max-width: 400px;
	}

	.project-grid {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.project-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--border-default));
		background: hsl(var(--surface-2));
		color: hsl(var(--text-primary));
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-base) var(--ease-out);
	}

	.project-btn:hover {
		border-color: hsl(var(--border-strong));
		background: hsl(var(--surface-3));
	}

	.project-btn.selected {
		border-color: hsl(var(--accent));
		background: hsl(var(--accent) / 0.15);
		color: hsl(var(--accent));
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.task-input {
		width: 100%;
		height: 36px;
		padding: 0 12px;
		border-radius: 6px;
		border: 1px solid hsl(var(--border-default));
		background: hsl(var(--surface-2));
		color: hsl(var(--text-primary));
		font-size: 13px;
		outline: none;
		transition: border-color var(--duration-base) var(--ease-out);
	}

	.task-input:focus {
		border-color: hsl(var(--accent));
	}

	.task-input::placeholder {
		color: hsl(var(--text-muted));
	}
</style>
