<script>
	import Icon from './Icon.svelte';

	let { label = '', value = '', hint = '', icon = 'chart', tone = 'emerald' } = $props();

	const tones = {
		emerald: 'bg-emerald-50 text-emerald-700',
		blue: 'bg-blue-50 text-blue-700',
		amber: 'bg-amber-50 text-amber-700',
		red: 'bg-red-50 text-red-700',
		indigo: 'bg-indigo-50 text-indigo-700',
		gray: 'bg-gray-100 text-gray-700'
	};
</script>

<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
			<p class="mt-2 truncate text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
			{#if hint}<p class="mt-1 text-xs text-gray-500">{hint}</p>{/if}
		</div>
		<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl {tones[tone] || tones.emerald}">
			<Icon name={icon} class="h-5 w-5" />
		</span>
	</div>
</div>
