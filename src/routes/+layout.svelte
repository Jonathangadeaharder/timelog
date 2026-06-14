<script lang="ts">
import '../app.css'

let { children } = $props()
</script>

<AppShell>
	{@render children()}
</AppShell>
