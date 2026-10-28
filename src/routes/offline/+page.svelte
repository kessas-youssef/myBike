<script>
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

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

	function retry() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Hors ligne — MyBike Djo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="grid min-h-[calc(100vh-4rem)] place-items-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-xl">
		<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl {online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
			<Icon name={online ? 'wifi' : 'wifi-off'} class="h-7 w-7" />
		</span>
		<h1 class="mt-4 text-2xl font-black tracking-tight text-gray-900">
			{online ? 'Connexion rétablie' : 'Vous êtes hors ligne'}
		</h1>
		<p class="mt-2 text-sm leading-relaxed text-gray-500">
			{online
				? 'Le réseau est revenu. Rechargez la page pour retrouver le site et synchroniser vos données.'
				: 'Cette page n’a pas encore été enregistrée sur cet appareil. Ouvrez l’application une première fois avec internet : elle restera ensuite disponible hors ligne.'}
		</p>
		<div class="mt-6 flex flex-col gap-2">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800" onclick={retry}>
				Réessayer
			</button>
			<a href="/" class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Retour à l’accueil</a>
		</div>
	</div>
</div>
