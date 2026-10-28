<script>
	import { compressImage, dataUrlSize, prettyBytes } from '$lib/client/image.js';
	import Icon from './Icon.svelte';

	let {
		value = $bindable(''),
		label = 'Image',
		help = 'Photo compressée automatiquement. Vous pouvez aussi coller une URL.',
		maxWidth = 1200,
		maxHeight = 1200,
		aspect = 'wide'
	} = $props();

	let busy = $state(false);
	let error = $state('');
	let fileInput;

	const aspectClass = $derived(
		aspect === 'square' ? 'aspect-square' : aspect === 'wide' ? 'aspect-[16/9]' : 'aspect-auto min-h-24'
	);

	async function onFile(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		busy = true;
		error = '';
		try {
			value = await compressImage(file, { maxWidth, maxHeight });
		} catch (err) {
			error = err?.message || 'Impossible de lire cette image';
		} finally {
			busy = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function clear() {
		value = '';
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-3">
		<span class="block text-sm font-medium text-gray-700">{label}</span>
		{#if value}
			<button type="button" class="text-xs font-medium text-red-600 hover:underline" onclick={clear}>
				Retirer
			</button>
		{/if}
	</div>

	<div class="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
		{#if value}
			<div class="{aspectClass} bg-gray-100">
				<img src={value} alt={label} class="h-full w-full object-cover" />
			</div>
		{:else}
			<button
				type="button"
				class="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-gray-500 transition hover:bg-gray-100"
				onclick={() => fileInput?.click()}
			>
				<Icon name="upload" class="h-6 w-6" />
				<span class="text-sm font-medium">Choisir une photo</span>
				<span class="text-xs text-gray-400">JPG, PNG ou WebP</span>
			</button>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
			onclick={() => fileInput?.click()}
			disabled={busy}
		>
			<Icon name="upload" class="h-4 w-4" />
			{busy ? 'Compression…' : value ? 'Remplacer' : 'Ajouter'}
		</button>
		{#if value && value.startsWith('data:')}
			<span class="text-xs text-gray-400">{prettyBytes(dataUrlSize(value))}</span>
		{/if}
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		aria-label={`${label} — fichier image`}
		onchange={onFile}
	/>

	<input
		type="url"
		bind:value
		placeholder="…ou URL de l’image (https://…)"
		aria-label={`${label} — URL de l’image`}
		class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
	/>
	{#if help}<p class="text-xs text-gray-400">{help}</p>{/if}
	{#if error}<p class="text-xs text-red-600">{error}</p>{/if}
</div>
