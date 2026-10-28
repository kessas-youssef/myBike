<script>
	import Icon from './Icon.svelte';

	let { icon = 'package', title = 'Rien pour le moment', description = '', children } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
	<span class="grid h-12 w-12 place-items-center rounded-2xl bg-white text-gray-400 shadow-sm">
		<Icon name={icon} class="h-6 w-6" />
	</span>
	<h3 class="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
	{#if description}<p class="mt-1 max-w-sm text-sm text-gray-500">{description}</p>{/if}
	{#if children}<div class="mt-4">{@render children()}</div>{/if}
</div>
