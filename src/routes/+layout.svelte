<script lang="ts">
	import '../app.css'
	import AppShell from '$lib/client/AppShell.svelte'

	let { children } = $props()
</script>

<AppShell>
	{@render children()}
</AppShell>
