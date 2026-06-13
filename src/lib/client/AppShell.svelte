<script lang="ts">
import Sidebar from './Sidebar.svelte'
import TopBar from './TopBar.svelte'

let { children } = $props()
</script>

<div class="shell">
	<Sidebar />
	<div class="main">
		<TopBar />
		<div class="content">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 224px 1fr;
		grid-template-rows: 1fr;
		height: 100vh;
		overflow: hidden;
	}

	.main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.content {
		flex: 1;
		overflow: auto;
	}
</style>
