<script>
	import { onMount } from 'svelte';
	import { defaultSettings } from '$lib/defaults.js';
	import { clearAuthCache } from '$lib/client/auth.js';
	import Icon from './Icon.svelte';

	let { user = null, settings = defaultSettings } = $props();

	let menuOpen = $state(false);
	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Offline logout still clears the local session cache.
		}
		clearAuthCache();
		if (typeof caches !== 'undefined') {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key.startsWith('mybike-api')).map((key) => caches.delete(key)));
		}
		window.location.href = '/';
	}

	const shopName = $derived(settings?.shopName || 'MyBike Djo');
	const primary = $derived(settings?.primaryColor || '#047857');
	const accent = $derived(settings?.accentColor || '#facc15');
</script>

<nav class="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
		<a href="/" class="flex items-center gap-2.5" onclick={() => (menuOpen = false)}>
			<span
				class="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm"
				style="background-color: {primary}"
			>
				<Icon name="bike" class="h-5 w-5" />
			</span>
			<span class="flex flex-col leading-none">
				<span class="text-lg font-black tracking-tight text-gray-900">{shopName}</span>
				<span class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
					Canastel · Oran
				</span>
			</span>
		</a>

		<div class="hidden items-center gap-1 lg:flex">
			<a href="/" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">Accueil</a>
			<a href="/#services" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">Services</a>
			<a href="/#vehicules" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">Véhicules</a>
			<a href="/reparer" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">Réparation</a>
			<a href="/#contact" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">Contact</a>

			{#if !online}
				<span class="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
					<Icon name="wifi-off" class="h-3.5 w-3.5" /> Hors ligne
				</span>
			{/if}

			{#if user}
				<a
					href={user.role === 'admin' ? '/admin' : '/dashboard'}
					class="ml-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
				>
					{user.role === 'admin' ? 'Administration' : 'Mon espace'}
				</a>
				<button
					type="button"
					onclick={logout}
					class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-red-600"
				>
					Déconnexion
				</button>
			{:else}
				<a href="/login" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Connexion</a>
			{/if}

			<a
				href="/reserver"
				class="ml-1 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:brightness-105"
				style="background-color: {accent}"
			>
				Réserver
				<Icon name="arrow" class="h-4 w-4" />
			</a>
		</div>

		<button
			type="button"
			class="rounded-lg p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label="Menu"
			aria-expanded={menuOpen}
		>
			<Icon name={menuOpen ? 'x' : 'menu'} class="h-6 w-6" />
		</button>
	</div>

	{#if menuOpen}
		<div class="border-t border-gray-100 bg-white px-4 pb-5 pt-3 lg:hidden">
			<div class="grid gap-1">
				<a href="/" class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onclick={() => (menuOpen = false)}>Accueil</a>
				<a href="/#services" class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onclick={() => (menuOpen = false)}>Services</a>
				<a href="/#vehicules" class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onclick={() => (menuOpen = false)}>Véhicules</a>
				<a href="/reparer" class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onclick={() => (menuOpen = false)}>Réparation</a>
				<a href="/#contact" class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onclick={() => (menuOpen = false)}>Contact</a>
			</div>
			<div class="mt-3 grid gap-2 border-t border-gray-100 pt-3">
				{#if user}
					<a
						href={user.role === 'admin' ? '/admin' : '/dashboard'}
						class="rounded-xl bg-gray-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
					>
						{user.role === 'admin' ? 'Administration' : 'Mon espace'}
					</a>
					<button type="button" onclick={logout} class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700">
						Déconnexion
					</button>
				{:else}
					<a href="/login" class="rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm font-medium text-gray-700">Connexion</a>
				{/if}
				<a
					href="/reserver"
					class="rounded-xl px-4 py-3 text-center text-sm font-bold text-gray-900"
					style="background-color: {accent}"
					onclick={() => (menuOpen = false)}
				>
					Réserver maintenant
				</a>
			</div>
		</div>
	{/if}
</nav>
