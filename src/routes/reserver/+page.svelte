<script>
	import { onMount } from 'svelte';
	import { getCachedUser } from '$lib/client/auth.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import { formatMoney, todayInput } from '$lib/format.js';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let selectedId = $state('');
	let hours = $state(2);
	let date = $state(todayInput());
	let promoCode = $state('');
	let phone = $state('');
	let notes = $state('');
	let error = $state('');
	let success = $state(null);
	let loading = $state(false);
	let showAuthModal = $state(false);
	let user = $state(null);

	onMount(() => {
		loadPublic();
		user = getCachedUser();
		selectedId = new URLSearchParams(window.location.search).get('vehicle') || '';
		(async () => {
			try {
				const response = await fetch('/api/auth/me');
				if (response.ok) {
					const data = await response.json();
					user = data.user;
					if (data.user?.phone) phone = data.user.phone;
				}
			} catch {
				// Offline: keep the cached user for display.
			}
		})();
	});

	const settings = $derived(publicStore.settings);
	const primary = $derived(settings.primaryColor || '#047857');
	const vehicles = $derived((publicStore.vehicles || []).filter((v) => v.active !== false));
	const selected = $derived(vehicles.find((v) => v._id === selectedId) || null);

	$effect(() => {
		if (!selectedId && vehicles.length) selectedId = vehicles[0]._id;
	});

	const promo = $derived.by(() => {
		const code = promoCode.trim().toUpperCase();
		if (!code) return null;
		return (
			(publicStore.promotions || []).find(
				(item) => String(item.code || '').toUpperCase() === code && item.active !== false
			) || null
		);
	});

	const basePrice = $derived(selected ? Number(selected.pricePerHour) * Math.max(1, Number(hours) || 1) : 0);
	const discount = $derived.by(() => {
		if (!promo) return 0;
		const value = Number(promo.discountValue || 0);
		const raw = promo.discountType === 'percent' ? (basePrice * value) / 100 : value;
		return Math.max(0, Math.min(basePrice, Math.round(raw)));
	});
	const total = $derived(Math.max(0, basePrice - discount));

	async function submit(event) {
		event.preventDefault();
		error = '';
		success = null;

		if (!selected) {
			error = 'Choisissez un véhicule';
			return;
		}
		if (!user) {
			showAuthModal = true;
			return;
		}
		if (!navigator.onLine) {
			error = 'La réservation en ligne nécessite internet. Vous pouvez appeler le shop directement.';
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/reservations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					vehicleId: selected._id,
					date,
					hours: Number(hours),
					promoCode,
					phone,
					notes
				})
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data.error || 'Réservation impossible';
				return;
			}
			success = {
				...data,
				vehicleName: selected.name,
				date,
				hours: Number(hours)
			};
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			error = 'Pas de connexion. Vérifiez votre réseau et réessayez.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Réserver — {settings.shopName || 'MyBike Djo'}</title></svelte:head>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 sm:py-14">
	<div class="mx-auto max-w-6xl px-4">
		<div class="max-w-2xl">
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">Réservation</p>
			<h1 class="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Choisissez votre machine</h1>
			<p class="mt-3 text-gray-600">
				Réservez en ligne, puis récupérez votre vélo au shop. Une pièce d’identité sera demandée sur place.
			</p>
		</div>

		{#if success}
			<div class="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
				<div class="flex items-start gap-4">
					<span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
						<Icon name="check" class="h-6 w-6" />
					</span>
					<div>
						<h2 class="text-xl font-black text-emerald-950">Demande envoyée !</h2>
						<p class="mt-1 text-sm text-emerald-800">
							{success.vehicleName} · {success.hours}h · {new Date(success.date).toLocaleDateString('fr-FR')}
						</p>
						<p class="mt-2 text-lg font-bold text-emerald-900">
							Total : {formatMoney(success.totalPrice, settings.currency || 'DA')}
							{#if success.discount}
								<span class="ml-2 text-sm font-medium text-emerald-700">(remise {formatMoney(success.discount)})</span>
							{/if}
						</p>
						<p class="mt-2 text-sm text-emerald-800">
							Djo confirmera votre réservation. Vous pouvez suivre son statut dans votre espace client.
						</p>
						<div class="mt-4 flex flex-wrap gap-3">
							<a href="/dashboard" class="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Mon espace</a>
							<a href="/reserver" class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Nouvelle réservation</a>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
		{/if}

		<div class="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
			<div>
				<h2 class="text-sm font-bold uppercase tracking-wide text-gray-500">1. Votre véhicule</h2>
				{#if vehicles.length}
					<div class="mt-3 grid gap-4 sm:grid-cols-2">
						{#each vehicles as vehicle}
							<button
								type="button"
								onclick={() => (selectedId = vehicle._id)}
								class="overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition {selectedId === vehicle._id
									? 'border-emerald-500 ring-2 ring-emerald-100'
									: 'border-transparent hover:border-gray-200'}"
							>
								<div class="relative h-36 bg-gray-100">
									<img
										src={vehicle.image || '/images/bike-mountain.jpg'}
										alt={vehicle.name}
										class="h-full w-full object-cover"
										onerror={(event) => (event.currentTarget.src = '/images/bike-mountain.jpg')}
									/>
									{#if selectedId === vehicle._id}
										<span class="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow">
											<Icon name="check" class="h-4 w-4" />
										</span>
									{/if}
								</div>
								<div class="p-4">
									<div class="flex items-start justify-between gap-2">
										<h3 class="font-bold text-gray-900">{vehicle.name}</h3>
										<span class="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
											{vehicle.type === 'trottinette' ? 'Trottinette' : 'Vélo'}
										</span>
									</div>
									<p class="mt-1 text-sm font-black" style="color: {primary}">
										{formatMoney(vehicle.pricePerHour)} <span class="text-xs font-medium text-gray-500">/h</span>
									</p>
									<p class="mt-1 text-xs text-gray-500">{vehicle.available} disponible(s)</p>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<EmptyState icon="bike" title="Aucun véhicule disponible" description="Appelez Djo pour connaître les disponibilités." />
				{/if}

				<h2 class="mt-8 text-sm font-bold uppercase tracking-wide text-gray-500">2. Détails</h2>
				<form onsubmit={submit} class="mt-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="date" class="mb-1 block text-sm font-medium text-gray-700">Date de location</label>
							<input id="date" type="date" bind:value={date} min={todayInput()} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
						</div>
						<div>
							<label for="hours" class="mb-1 block text-sm font-medium text-gray-700">Durée (heures)</label>
							<input id="hours" type="number" bind:value={hours} min="1" max="72" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
						</div>
						<div>
							<label for="phone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
							<input id="phone" type="tel" bind:value={phone} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 12 34 56" />
						</div>
						<div>
							<label for="promo" class="mb-1 block text-sm font-medium text-gray-700">Code promo <span class="text-gray-400">(optionnel)</span></label>
							<input id="promo" type="text" bind:value={promoCode} class="w-full rounded-xl border-gray-300 uppercase focus:border-emerald-500 focus:ring-emerald-500" placeholder="CANASTEL20" />
						</div>
					</div>
					<div class="mt-4">
						<label for="notes" class="mb-1 block text-sm font-medium text-gray-700">Message pour Djo <span class="text-gray-400">(optionnel)</span></label>
						<textarea id="notes" bind:value={notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Heure d’arrivée, taille, accessoires…"></textarea>
					</div>

					{#if promo}
						<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
							Code <strong>{promo.code}</strong> appliqué : {promo.title}
						</div>
					{:else if promoCode.trim()}
						<p class="mt-4 text-xs text-amber-700">Le code sera vérifié par le shop.</p>
					{/if}

					<button
						type="submit"
						disabled={loading || !selected}
						class="mt-5 w-full rounded-xl px-4 py-3.5 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-50"
						style="background-color: {primary}"
					>
						{loading ? 'Envoi…' : 'Envoyer la demande de réservation'}
					</button>
					<p class="mt-2 text-center text-xs text-gray-400">
						La réservation est confirmée par Djo. Aucun paiement en ligne.
					</p>
				</form>
			</div>

			<aside class="lg:sticky lg:top-24 lg:self-start">
				<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<h2 class="text-sm font-bold uppercase tracking-wide text-gray-500">Récapitulatif</h2>
					{#if selected}
						<div class="mt-4 flex items-center gap-3">
							<img src={selected.image || '/images/bike-mountain.jpg'} alt={selected.name} class="h-16 w-16 rounded-xl object-cover" />
							<div>
								<p class="font-bold text-gray-900">{selected.name}</p>
								<p class="text-xs text-gray-500">{formatMoney(selected.pricePerHour)} / heure</p>
							</div>
						</div>
						<dl class="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
							<div class="flex justify-between"><dt class="text-gray-500">Durée</dt><dd class="font-medium text-gray-900">{hours || 0} h</dd></div>
							<div class="flex justify-between"><dt class="text-gray-500">Sous-total</dt><dd class="font-medium text-gray-900">{formatMoney(basePrice)}</dd></div>
							{#if discount}
								<div class="flex justify-between text-emerald-700"><dt>Remise</dt><dd class="font-medium">−{formatMoney(discount)}</dd></div>
							{/if}
							<div class="flex justify-between border-t border-gray-100 pt-2 text-base"><dt class="font-bold text-gray-900">Total</dt><dd class="font-black" style="color: {primary}">{formatMoney(total)}</dd></div>
						</dl>
						{#if selected.deposit}
							<p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
								Caution : {formatMoney(selected.deposit)} (rendue au retour).
							</p>
						{/if}
					{:else}
						<p class="mt-3 text-sm text-gray-500">Sélectionnez un véhicule pour voir le total.</p>
					{/if}
				</div>

				<div class="mt-4 rounded-2xl border border-gray-100 bg-gray-900 p-5 text-white">
					<p class="text-sm font-bold">Besoin d’aide ?</p>
					<p class="mt-1 text-xs text-gray-300">Appelez Djo, il répond souvent directement.</p>
					<a href={`tel:${settings.phone || ''}`} class="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
						<Icon name="phone" class="h-4 w-4" /> {settings.phone || 'Téléphone'}
					</a>
				</div>
			</aside>
		</div>
	</div>
</div>

{#if showAuthModal}
	<div class="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			tabindex="-1"
			aria-label="Fermer la fenêtre de connexion"
			onclick={() => (showAuthModal = false)}
		></button>
		<div
			class="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-modal-title"
			tabindex="-1"
		>
			<div class="flex items-start justify-between">
				<h2 id="auth-modal-title" class="text-xl font-black text-gray-900">Connexion requise</h2>
				<button type="button" class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" onclick={() => (showAuthModal = false)} aria-label="Fermer">
					<Icon name="x" class="h-5 w-5" />
				</button>
			</div>
			<p class="mt-2 text-sm text-gray-600">Connectez-vous pour réserver et suivre vos locations.</p>
			<div class="mt-5 grid gap-3">
				<a href="/login" class="rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style="background-color: {primary}">Se connecter</a>
				<a href="/register" class="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-200">Créer un compte</a>
			</div>
		</div>
	</div>
{/if}
