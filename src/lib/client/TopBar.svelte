<script lang="ts">
import { Moon, Sun } from '@lucide/svelte'
import { page } from '$app/state'

const routeLabels: Record<string, string> = {
	'/': 'Timer',
	'/today': 'Heute',
	'/week': 'Woche',
	'/projects': 'Projekte',
	'/settings': 'Settings'
}

let currentLabel = $derived(routeLabels[page.url.pathname] ?? 'Timelog')

let isDark = $state(true)

function toggleTheme() {
	isDark = !isDark
	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}
</script>

<header class="topbar">
	<span class="breadcrumb eyebrow">{currentLabel}</span>
	<button class="btn btn-ghost btn-sm" onclick={toggleTheme} aria-label="Toggle theme">
		{#if isDark}
			<Sun size={14} />
		{:else}
			<Moon size={14} />
		{/if}
	</button>
</header>

<style>
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
		height: 44px;
		min-height: 44px;
		border-bottom: 1px solid hsl(var(--border-subtle));
		background: hsl(var(--surface-0));
	}

	.breadcrumb {
		color: hsl(var(--text-muted));
	}
</style>
