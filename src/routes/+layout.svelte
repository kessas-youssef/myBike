<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import { cacheUser, clearAuthCache, getCachedUser } from '$lib/client/auth.js';

	let { children } = $props();
	let user = $state(null);
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));

	onMount(() => {
		user = getCachedUser();
		loadPublic();

		(async () => {
			try {
				const response = await fetch('/api/auth/me');
				if (!response.ok) return;
				const data = await response.json();
				user = data.user;
				if (data.user) cacheUser(data.user);
				else {
					clearAuthCache();
					user = null;
				}
			} catch {
				// Offline: keep the last known user from this device.
			}
		})();
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		root.style.setProperty('--brand', publicStore.settings.primaryColor || '#047857');
		root.style.setProperty('--accent', publicStore.settings.accentColor || '#facc15');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="MyBike Djo — location, réparation et accessoires de vélos et trottinettes électriques à la forêt de Canastel, Oran."
	/>
	<meta name="theme-color" content={publicStore.settings.primaryColor || '#047857'} />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<title>{publicStore.settings.shopName || 'MyBike Djo'} — Location & réparation à Canastel, Oran</title>
</svelte:head>

{#if !isAdmin}
	<Navbar {user} settings={publicStore.settings} />
{/if}
<main class={isAdmin ? 'min-h-screen' : 'min-h-screen pt-16'}>
	{@render children()}
</main>
{#if !isAdmin}
	<Footer settings={publicStore.settings} />
{/if}
