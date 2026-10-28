<script>
	import { onMount } from 'svelte';
	import { cacheUser, clearAuthCache, getCachedAdmin, getCachedUser } from '$lib/client/auth.js';
	import { initStore, store, syncNow } from '$lib/client/store.svelte.js';
	import { formatDateTime, initials } from '$lib/format.js';
	import Icon from '$lib/components/Icon.svelte';
	import SyncBadge from '$lib/components/SyncBadge.svelte';
	import Overview from '$lib/components/admin/Overview.svelte';
	import Rentals from '$lib/components/admin/Rentals.svelte';
	import Reservations from '$lib/components/admin/Reservations.svelte';
	import Repairs from '$lib/components/admin/Repairs.svelte';
	import Vehicles from '$lib/components/admin/Vehicles.svelte';
	import Accessories from '$lib/components/admin/Accessories.svelte';
	import Clients from '$lib/components/admin/Clients.svelte';
	import Promotions from '$lib/components/admin/Promotions.svelte';
	import SiteEditor from '$lib/components/admin/SiteEditor.svelte';
	import SettingsPanel from '$lib/components/admin/SettingsPanel.svelte';

	const tabs = [
		{ id: 'overview', label: 'Vue d’ensemble', short: 'Accueil', icon: 'chart' },
		{ id: 'rentals', label: 'Locations', short: 'Locations', icon: 'bike' },
		{ id: 'reservations', label: 'Réservations', short: 'Résa', icon: 'calendar' },
		{ id: 'repairs', label: 'Réparations', short: 'Atelier', icon: 'wrench' },
		{ id: 'vehicles', label: 'Véhicules', short: 'Flotte', icon: 'bike' },
		{ id: 'accessories', label: 'Accessoires', short: 'Shop', icon: 'package' },
		{ id: 'clients', label: 'Clients', short: 'Clients', icon: 'users' },
		{ id: 'promotions', label: 'Promotions', short: 'Promos', icon: 'sparkles' },
		{ id: 'site', label: 'Page d’accueil', short: 'Site', icon: 'eye' },
		{ id: 'settings', label: 'Réglages', short: 'Réglages', icon: 'settings' }
	];

	function readTab() {
		if (typeof window === 'undefined') return 'overview';
		const hash = window.location.hash.replace(/^#/, '');
		return tabs.some((tab) => tab.id === hash) ? hash : 'overview';
	}

	let activeTab = $state(readTab());
	let user = $state(null);
	let booting = $state(true);
	let offlineGate = $state(false);
	let serverError = $state('');

	const shopName = $derived(store.settings?.shopName || 'MyBike Djo');

	onMount(() => {
		let disposed = false;

		const onHashChange = () => {
			activeTab = readTab();
		};
		window.addEventListener('hashchange', onHashChange);

		(async () => {
			await initStore();

			const cachedAdmin = getCachedAdmin();
			const cachedUser = getCachedUser();
			user = cachedAdmin || (cachedUser?.role === 'admin' ? cachedUser : null);

			if (navigator.onLine) {
				try {
					const response = await fetch('/api/auth/me');
					if (response.ok) {
						const data = await response.json().catch(() => ({}));
						if (data.user?.role === 'admin') {
							user = data.user;
							cacheUser(data.user);
						} else if (data.user) {
							window.location.href = '/dashboard';
							return;
						} else {
							clearAuthCache();
							user = null;
							window.location.href = '/login';
							return;
						}
					} else if (response.status === 401 || response.status === 403) {
						clearAuthCache();
						user = null;
						window.location.href = '/login';
						return;
					} else {
						serverError = `Le serveur a répondu ${response.status}. Le tableau de bord local reste disponible.`;
					}
				} catch {
					if (!user) {
						offlineGate = true;
					} else {
						serverError = 'Connexion au serveur impossible. Mode local activé.';
					}
				}

				if (user) {
					await syncNow({ silent: true });
				}
			} else if (!user) {
				offlineGate = true;
			}

			if (!disposed) booting = false;
		})();

		return () => {
			disposed = true;
			window.removeEventListener('hashchange', onHashChange);
		};
	});

	function go(tab) {
		activeTab = tab;
		if (typeof history !== 'undefined') {
			history.replaceState(null, '', `#${tab}`);
		}
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Offline logout still clears the local session cache.
		}
		clearAuthCache();
		if (typeof caches !== 'undefined') {
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((key) => key.startsWith('mybike-api')).map((key) => caches.delete(key))
			);
		}
		window.location.href = '/';
	}

	const activeLabel = $derived(tabs.find((tab) => tab.id === activeTab)?.label || 'Tableau de bord');
</script>

<svelte:head>
	<title>Administration — {shopName}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if booting}
		<div class="grid min-h-screen place-items-center bg-gray-50 px-4">
			<div class="text-center">
				<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg">
					<Icon name="bike" class="h-7 w-7" />
				</span>
				<h1 class="mt-4 text-xl font-black text-gray-900">Ouverture du tableau de bord…</h1>
				<p class="mt-1 text-sm text-gray-500">Chargement des données locales de cet appareil.</p>
				<Icon name="sync" class="mx-auto mt-5 h-6 w-6 animate-spin text-emerald-600" />
			</div>
		</div>
	{:else if offlineGate || !user}
		<div class="grid min-h-screen place-items-center bg-gray-50 px-4 py-12">
			<div class="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-xl">
				<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
					<Icon name="wifi-off" class="h-7 w-7" />
				</span>
				<h1 class="mt-4 text-2xl font-black tracking-tight text-gray-900">Mode hors ligne</h1>
				<p class="mt-2 text-sm leading-relaxed text-gray-500">
					Ce navigateur n’a pas encore de session Djo enregistrée. Connectez-vous une première fois avec
					internet, puis le tableau de bord restera accessible même sans réseau.
				</p>
				<div class="mt-6 flex flex-col gap-2">
					<a href="/login" class="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800">Se connecter</a>
					<a href="/" class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Retour au site</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- Desktop sidebar -->
		<aside class="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
			<a href="/" class="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
				<span class="grid h-9 w-9 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm">
					<Icon name="bike" class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-none">
					<span class="text-base font-black tracking-tight text-gray-900">{shopName}</span>
					<span class="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Administration</span>
				</span>
			</a>

			<nav class="flex-1 overflow-y-auto px-3 py-4">
				<div class="space-y-1">
					{#each tabs as tab}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition {activeTab === tab.id ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
							onclick={() => go(tab.id)}
						>
							<Icon name={tab.icon} class="h-5 w-5 {activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}" />
							<span class="flex-1">{tab.label}</span>
							{#if activeTab === tab.id}
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
							{/if}
						</button>
					{/each}
				</div>
			</nav>

			<div class="border-t border-gray-100 p-3">
				<div class="flex items-center gap-2.5 rounded-xl bg-gray-50 p-2.5">
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">
						{initials(user.name || 'Djo')}
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-bold text-gray-900">{user.name || 'Djo'}</p>
						<p class="truncate text-[10px] text-gray-500">{user.email || ''}</p>
					</div>
					<button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600" title="Déconnexion" aria-label="Déconnexion" onclick={logout}>
						<Icon name="x" class="h-4 w-4" />
					</button>
				</div>
				<div class="mt-2 flex items-center justify-between gap-2 px-1">
					<SyncBadge />
					<a href="/" class="text-[11px] font-semibold text-gray-500 hover:text-gray-900">Voir le site →</a>
				</div>
			</div>
		</aside>

		<div class="lg:pl-64">
			<!-- Mobile header -->
			<header class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur lg:hidden">
				<div class="flex h-14 items-center justify-between gap-2 px-3">
					<a href="/" class="flex min-w-0 items-center gap-2">
						<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white">
							<Icon name="bike" class="h-4 w-4" />
						</span>
						<span class="min-w-0">
							<span class="block truncate text-sm font-black text-gray-900">{shopName}</span>
							<span class="block text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">Administration</span>
						</span>
					</a>
					<div class="flex shrink-0 items-center gap-1.5">
						<SyncBadge />
						<button type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Déconnexion" aria-label="Déconnexion" onclick={logout}>
							<Icon name="x" class="h-5 w-5" />
						</button>
					</div>
				</div>
				<div class="flex gap-1 overflow-x-auto px-2 pb-2">
					{#each tabs as tab}
						<button
							type="button"
							class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition {activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}"
							onclick={() => go(tab.id)}
						>
							{tab.short}
						</button>
					{/each}
				</div>
			</header>

			<!-- Desktop top bar -->
			<header class="sticky top-0 z-30 hidden border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur lg:flex lg:items-center lg:justify-between">
				<div class="flex items-center gap-2 text-sm">
					<span class="font-bold text-gray-900">{activeLabel}</span>
					{#if store.lastSync}
						<span class="text-gray-300">·</span>
						<span class="text-xs text-gray-400">Dernière synchro {formatDateTime(store.lastSync)}</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if !store.online}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
							<Icon name="wifi-off" class="h-3.5 w-3.5" /> Hors ligne
						</span>
					{/if}
					<SyncBadge />
					<a href="/" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
						<Icon name="eye" class="h-4 w-4" /> Voir le site
					</a>
				</div>
			</header>

			<main class="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-6 lg:py-6">
				{#if !store.online}
					<div class="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
						<Icon name="wifi-off" class="mt-0.5 h-5 w-5 shrink-0" />
						<div>
							<p class="font-bold">Mode hors ligne</p>
							<p class="mt-0.5 text-xs leading-relaxed">
								Vous travaillez sur les données de cet appareil. Chaque modification est enregistrée et
								sera envoyée à MongoDB Atlas dès le retour du réseau.
							</p>
						</div>
					</div>
				{/if}

				{#if store.authError}
					<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
						<span class="flex items-start gap-2">
							<Icon name="lock" class="mt-0.5 h-5 w-5 shrink-0" />
							Session expirée : reconnectez-vous pour synchroniser les modifications en attente.
						</span>
						<a href="/login" class="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">Se reconnecter</a>
					</div>
				{:else if store.error}
					<div class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{store.error}</div>
				{/if}

				{#if serverError}
					<div class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">{serverError}</div>
				{/if}

				{#if store.ready}
					{#if activeTab === 'overview'}
						<Overview onNavigate={go} />
					{:else if activeTab === 'rentals'}
						<Rentals />
					{:else if activeTab === 'reservations'}
						<Reservations />
					{:else if activeTab === 'repairs'}
						<Repairs />
					{:else if activeTab === 'vehicles'}
						<Vehicles />
					{:else if activeTab === 'accessories'}
						<Accessories />
					{:else if activeTab === 'clients'}
						<Clients />
					{:else if activeTab === 'promotions'}
						<Promotions />
					{:else if activeTab === 'site'}
						<SiteEditor />
					{:else if activeTab === 'settings'}
						<SettingsPanel />
					{/if}
				{:else}
					<div class="grid place-items-center py-24 text-sm text-gray-500">
						<Icon name="sync" class="h-6 w-6 animate-spin" />
						<p class="mt-3">Chargement des données locales…</p>
					</div>
				{/if}
			</main>
		</div>
	{/if}
</div>
