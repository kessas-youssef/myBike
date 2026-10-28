<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
	let user = $state(null);

	async function loadUser() {
		try {
			const res = await fetch('/api/auth/me');
			const data = await res.json();
			user = data.user;
		} catch {}
	}

	$effect(() => { loadUser(); });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>MyBike Djo - Location & Réparation de Vélos et Trottinettes</title>
</svelte:head>

<Navbar {user} />
<main class="pt-16 min-h-screen">
	{@render children()}
</main>
<Footer />
