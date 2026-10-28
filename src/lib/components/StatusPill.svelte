<script>
	import { statusLabel, statusTone } from '$lib/format.js';

	let { status = '', label = '', tone = '', size = 'sm' } = $props();

	const tones = {
		emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
		yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
		orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
		indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
		red: 'bg-red-50 text-red-700 ring-red-600/20',
		gray: 'bg-gray-100 text-gray-700 ring-gray-500/20'
	};

	const toneClass = $derived(tones[tone || statusTone(status)] || tones.gray);
	const text = $derived(label || statusLabel(status));
	const sizeClass = $derived(size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs');
</script>

<span class="inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset {toneClass} {sizeClass}">
	<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
	{text}
</span>
