<script>
	import { onMount } from 'svelte';
	import { relativeTime } from '$lib/format.js';
	import { refreshCounts, store, syncNow } from '$lib/client/store.svelte.js';
	import Icon from './Icon.svelte';

	let now = $state(Date.now());

	onMount(() => {
		const interval = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(interval);
	});

	const pending = $derived(store.pending + store.trackingPending);

	async function handleSync() {
		await syncNow();
		await refreshCounts();
	}
</script>

<button
	type="button"
	class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition {store.online
		? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
		: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'}"
	onclick={handleSync}
	title={store.online ? 'Synchroniser avec MongoDB Atlas' : 'Hors ligne : les données restent sur cet appareil'}
>
	{#if store.syncing}
		<Icon name="sync" class="h-4 w-4 animate-spin" />
		Synchronisation…
	{:else if !store.online}
		<Icon name="wifi-off" class="h-4 w-4" />
		Hors ligne{pending ? ` · ${pending}` : ''}
	{:else}
		<Icon name="wifi" class="h-4 w-4" />
		{#if pending}
			{pending} à envoyer
		{:else if store.lastSync}
			Synchronisé {relativeTime(store.lastSync, now)}
		{:else}
			Synchroniser
		{/if}
	{/if}
</button>
