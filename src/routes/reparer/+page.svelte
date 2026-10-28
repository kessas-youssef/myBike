<script>
	import { onMount } from 'svelte';
	import { getCachedUser } from '$lib/client/auth.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import { phoneHref } from '$lib/format.js';
	import Icon from '$lib/components/Icon.svelte';

	let user = $state(null);
	let deviceType = $state('bike');
	let deviceName = $state('');
	let issue = $state('');
	let clientName = $state('');
	let clientPhone = $state('');
	let preferredDate = $state('');
	let notes = $state('');
	let website = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	onMount(() => {
		loadPublic();
		user = getCachedUser();
		if (user) {
			clientName = user.name || '';
			clientPhone = user.phone || '';
		}
		(async () => {
			try {
				const response = await fetch('/api/auth/me');
				if (response.ok) {
					const data = await response.json();
					user = data.user;
					if (data.user) {
						clientName = data.user.name || clientName;
						clientPhone = data.user.phone || clientPhone;
					}
				}
			} catch {
				// Offline: keep cached user.
			}
		})();
	});

	const settings = $derived(publicStore.settings);
	const primary = $derived(settings.primaryColor || '#047857');

	async function submit(event) {
		event.preventDefault();
		error = '';
		success = false;
		if (!navigator.onLine) {
			error = 'L’envoi de la demande nécessite internet. Vous pouvez appeler le shop directement.';
			return;
		}
		loading = true;
		try {
			const response = await fetch('/api/repairs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					deviceType,
					deviceName,
					issue,
					clientName,
					clientPhone,
					preferredDate,
					notes,
					website
				})
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data.error || 'Demande impossible';
				return;
			}
			success = true;
			issue = '';
			notes = '';
			deviceName = '';
			preferredDate = '';
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			error = 'Pas de connexion. Vérifiez votre réseau et réessayez.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Réparation — {settings.shopName || 'MyBike Djo'}</title></svelte:head>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 sm:py-14">
	<div class="mx-auto max-w-4xl px-4">
		<div class="max-w-2xl">
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">Atelier</p>
			<h1 class="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Demander une réparation</h1>
			<p class="mt-3 text-gray-600">
				Décrivez le problème. Djo vous rappelle pour un diagnostic et un devis. Aucun compte n’est nécessaire.
			</p>
		</div>

		{#if success}
			<div class="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
				<div class="flex items-start gap-4">
					<span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
						<Icon name="check" class="h-6 w-6" />
					</span>
					<div>
						<h2 class="text-xl font-black text-emerald-950">Demande reçue !</h2>
						<p class="mt-1 text-sm text-emerald-800">
							Djo vous rappellera au {clientPhone}. Vous pouvez aussi passer directement au shop.
						</p>
						{#if user}
							<a href="/dashboard" class="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Suivre dans mon espace</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
		{/if}

		<form onsubmit={submit} class="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
			<div class="grid gap-5 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<span class="mb-2 block text-sm font-medium text-gray-700">Type de machine</span>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition {deviceType === 'bike' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}"
							onclick={() => (deviceType = 'bike')}
						>
							<Icon name="bike" class="h-6 w-6" />
							<span class="text-sm font-semibold text-gray-900">Vélo</span>
						</button>
						<button
							type="button"
							class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition {deviceType === 'trottinette' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}"
							onclick={() => (deviceType = 'trottinette')}
						>
							<Icon name="scooter" class="h-6 w-6" />
							<span class="text-sm font-semibold text-gray-900">Trottinette</span>
						</button>
					</div>
				</div>

				<div>
					<label for="deviceName" class="mb-1 block text-sm font-medium text-gray-700">Marque / modèle</label>
					<input id="deviceName" type="text" bind:value={deviceName} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Ex. Rockrider ST 100" />
				</div>
				<div>
					<label for="preferredDate" class="mb-1 block text-sm font-medium text-gray-700">Date souhaitée</label>
					<input id="preferredDate" type="date" bind:value={preferredDate} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>

				<div class="sm:col-span-2">
					<label for="issue" class="mb-1 block text-sm font-medium text-gray-700">Décrivez le problème</label>
					<textarea id="issue" bind:value={issue} rows="4" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Bruit au freinage, chaîne qui saute, batterie qui ne charge plus…"></textarea>
				</div>

				<div>
					<label for="clientName" class="mb-1 block text-sm font-medium text-gray-700">Votre nom</label>
					<input id="clientName" type="text" bind:value={clientName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Nom complet" />
				</div>
				<div>
					<label for="clientPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
					<input id="clientPhone" type="tel" bind:value={clientPhone} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 12 34 56" />
				</div>

				<div class="sm:col-span-2">
					<label for="notes" class="mb-1 block text-sm font-medium text-gray-700">Autres précisions <span class="text-gray-400">(optionnel)</span></label>
					<textarea id="notes" bind:value={notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Heure de dépôt, accessoires, etc."></textarea>
				</div>

				<!-- Honeypot -->
				<div class="hidden" aria-hidden="true">
					<label for="website">Site web</label>
					<input id="website" type="text" bind:value={website} tabindex="-1" autocomplete="off" />
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
				<button
					type="submit"
					disabled={loading}
					class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-50"
					style="background-color: {primary}"
				>
					{loading ? 'Envoi…' : 'Envoyer la demande'}
					<Icon name="arrow" class="h-4 w-4" />
				</button>
				<a href={phoneHref(settings.phone)} class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
					<Icon name="phone" class="h-4 w-4" /> Appeler le shop
				</a>
			</div>
		</form>
	</div>
</div>
