<script lang="ts">
	import { fmtHm } from '$lib/shared/format'

	interface Props {
		isSpeaking: boolean
		silenceSeconds: number
		silenceThreshold: number
	}

	let { isSpeaking, silenceSeconds, silenceThreshold }: Props = $props()

	let remaining = $derived(Math.max(0, silenceThreshold - silenceSeconds))
	let isSilent = $derived(!isSpeaking && remaining > 0)
</script>

{#if isSpeaking}
	<span class="badge badge-success">
		🎤 Sprache
	</span>
{:else if isSilent}
	<span class="badge badge-warn">
		🔇 {fmtHm(remaining)} bis Prompt
	</span>
{/if}
