<script lang="ts">
	import { page } from '$app/state'
	import { Timer, CalendarDays, CalendarRange, FolderKanban, Settings, Mic, MicOff } from 'lucide-svelte'
	import { timer } from './timer.svelte'
	import { MicEngine } from './mic.svelte'

	interface NavItem {
		label: string
		href: string
		icon: typeof Timer
	}

	const nav: NavItem[] = [
		{ label: 'Timer', href: '/', icon: Timer },
		{ label: 'Heute', href: '/today', icon: CalendarDays },
		{ label: 'Woche', href: '/week', icon: CalendarRange },
		{ label: 'Projekte', href: '/projects', icon: FolderKanban },
		{ label: 'Settings', href: '/settings', icon: Settings }
	]

	let mic = $state<MicEngine | null>(null)

	$effect(() => {
		if (timer.isRunning) {
			const engine = new MicEngine()
			engine.start()
			mic = engine
			return () => {
				engine.stop()
				mic = null
			}
		}
	})

	function formatElapsed(seconds: number): string {
		const h = Math.floor(seconds / 3600)
		const m = Math.floor((seconds % 3600) / 60)
		const s = seconds % 60
		return h > 0
			? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
			: `${m}:${String(s).padStart(2, '0')}`
	}
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<span class="brand">Timelog</span>
		{#if timer.isRunning}
			<span class="badge badge-accent tabular">
				{formatElapsed(timer.elapsedSeconds)}
			</span>
		{/if}
		{#if mic}
			<span class="mic-badge" class:active={mic.isSpeaking} class:idle={!mic.isSpeaking}>
				{#if mic.isSpeaking}
					<Mic size={12} />
				{:else}
					<MicOff size={12} />
				{/if}
			</span>
		{/if}
	</div>

	<nav class="sidebar-nav">
		{#each nav as item (item.href)}
			{@const active = item.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(item.href)}
			<a href={item.href} class="nav-item" class:active>
				<item.icon size={16} />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: hsl(var(--surface-0));
		border-right: 1px solid hsl(var(--border-default));
		overflow: hidden;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 16px 12px;
		border-bottom: 1px solid hsl(var(--border-subtle));
	}

	.brand {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 15px;
		color: hsl(var(--text-primary));
		letter-spacing: -0.01em;
	}

	.mic-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 999px;
		margin-left: auto;
	}

	.mic-badge.active {
		color: hsl(var(--state-success));
		background: hsl(var(--state-success-bg) / 0.5);
		animation: mic-pulse 1.2s var(--ease-in-out) infinite;
	}

	.mic-badge.idle {
		color: hsl(var(--text-muted));
		background: hsl(var(--surface-2));
	}

	@keyframes mic-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		border-radius: 6px;
		color: hsl(var(--text-secondary));
		text-decoration: none;
		font-size: 13px;
		font-weight: 500;
		transition: all var(--duration-base) var(--ease-out);
	}

	.nav-item:hover {
		background: hsl(var(--surface-2));
		color: hsl(var(--text-primary));
	}

	.nav-item.active {
		background: hsl(var(--accent) / 0.12);
		color: hsl(var(--accent));
	}
</style>
