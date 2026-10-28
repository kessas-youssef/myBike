<script>
	import { onMount } from 'svelte';
	import { getCachedAdmin, cacheUser } from '$lib/client/auth.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import Icon from '$lib/components/Icon.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let offlineAdmin = $state(null);

	onMount(() => {
		loadPublic();
	});

	async function handleSubmit(event) {
		event.preventDefault();
		error = '';
		offlineAdmin = null;
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data.error || 'Connexion impossible';
				return;
			}
			cacheUser(data.user);
			window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
		} catch {
			const cached = getCachedAdmin();
			if (cached) {
				offlineAdmin = cached;
				error = 'Pas de connexion internet. Vous pouvez continuer avec la session Djo enregistrée sur cet appareil.';
			} else {
				error = 'Pas de connexion internet. Connectez-vous une première fois en ligne pour activer le mode hors ligne.';
			}
		} finally {
			loading = false;
		}
	}

	function continueOffline() {
		window.location.href = '/admin';
	}
</script>

<svelte:head><title>Connexion — {publicStore.settings.shopName || 'MyBike Djo'}</title></svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-md">
		<div class="rounded-3xl border border-gray-100 bg-white p-7 shadow-xl sm:p-9">
			<div class="text-center">
				<span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" style="background-color: {publicStore.settings.primaryColor || '#047857'}">
					<Icon name="lock" class="h-6 w-6" />
				</span>
				<h1 class="mt-4 text-2xl font-black tracking-tight text-gray-900">Connexion</h1>
				<p class="mt-1 text-sm text-gray-500">
					Accédez à votre espace {publicStore.settings.shopName || 'MyBike Djo'}
				</p>
			</div>

			<form onsubmit={handleSubmit} class="mt-7 space-y-4">
				{#if error}
					<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>
				{/if}
				{#if offlineAdmin}
					<button
						type="button"
						class="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800"
						onclick={continueOffline}
					>
						Continuer hors ligne en tant que {offlineAdmin.name || 'Djo'}
					</button>
				{/if}

				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="email@exemple.com"
					/>
				</div>
				<div>
					<label for="password" class="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						autocomplete="current-password"
						class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
					style="background-color: {publicStore.settings.primaryColor || '#047857'}"
				>
					{loading ? 'Connexion…' : 'Se connecter'}
				</button>
			</form>

			<p class="mt-6 text-center text-sm text-gray-500">
				Pas encore de compte ?
				<a href="/register" class="font-semibold hover:underline" style="color: {publicStore.settings.primaryColor || '#047857'}">Créer un compte</a>
			</p>
		</div>

		<p class="mt-5 flex items-start gap-2 px-2 text-xs leading-relaxed text-gray-400">
			<Icon name="wifi-off" class="mt-0.5 h-4 w-4 shrink-0" />
			Le tableau de bord de Djo fonctionne hors ligne après une première connexion. Les modifications sont
			synchronisées avec MongoDB Atlas dès le retour d’internet.
		</p>
	</div>
</div>
