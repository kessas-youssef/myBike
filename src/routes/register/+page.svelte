<script>
	import { onMount } from 'svelte';
	import { cacheUser } from '$lib/client/auth.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import Icon from '$lib/components/Icon.svelte';

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let address = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	onMount(() => {
		loadPublic();
	});

	async function handleSubmit(event) {
		event.preventDefault();
		error = '';
		loading = true;
		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, phone, address, password })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data.error || 'Inscription impossible';
				return;
			}
			cacheUser(data.user);
			window.location.href = '/dashboard';
		} catch {
			error = 'Pas de connexion internet. L’inscription nécessite une connexion.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Inscription — {publicStore.settings.shopName || 'MyBike Djo'}</title></svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-xl sm:p-9">
		<div class="text-center">
			<span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" style="background-color: {publicStore.settings.primaryColor || '#047857'}">
				<Icon name="user" class="h-6 w-6" />
			</span>
			<h1 class="mt-4 text-2xl font-black tracking-tight text-gray-900">Créer un compte</h1>
			<p class="mt-1 text-sm text-gray-500">Pour réserver et suivre vos locations</p>
		</div>

		<form onsubmit={handleSubmit} class="mt-7 space-y-4">
			{#if error}
				<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
			{/if}
			<div>
				<label for="name" class="mb-1 block text-sm font-medium text-gray-700">Nom complet</label>
				<input id="name" type="text" bind:value={name} required autocomplete="name" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Votre nom" />
			</div>
			<div>
				<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
				<input id="email" type="email" bind:value={email} required autocomplete="email" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="email@exemple.com" />
			</div>
			<div>
				<label for="phone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
				<input id="phone" type="tel" bind:value={phone} autocomplete="tel" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 12 34 56" />
			</div>
			<div>
				<label for="address" class="mb-1 block text-sm font-medium text-gray-700">Adresse <span class="text-gray-400">(optionnel)</span></label>
				<input id="address" type="text" bind:value={address} autocomplete="street-address" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Quartier, Oran" />
			</div>
			<div>
				<label for="password" class="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
				<input id="password" type="password" bind:value={password} required minlength="6" autocomplete="new-password" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="6 caractères minimum" />
			</div>
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
				style="background-color: {publicStore.settings.primaryColor || '#047857'}"
			>
				{loading ? 'Inscription…' : 'Créer mon compte'}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-gray-500">
			Déjà un compte ?
			<a href="/login" class="font-semibold hover:underline" style="color: {publicStore.settings.primaryColor || '#047857'}">Se connecter</a>
		</p>
	</div>
</div>
