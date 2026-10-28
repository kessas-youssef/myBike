<script>
	import { onMount } from 'svelte';
	import { getCachedUser } from '$lib/client/auth.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import { defaultSettings } from '$lib/defaults.js';
	import {
		formatDateTime,
		formatMoney,
		initials,
		isOverdue,
		phoneHref,
		timeLeft,
		whatsappHref
	} from '$lib/format.js';
	import Icon from '$lib/components/Icon.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import TrackingCard from '$lib/components/TrackingCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';

	const CACHE_KEY = 'mybike:my-cache';

	let user = $state(null);
	let rentals = $state([]);
	let reservations = $state([]);
	let repairs = $state([]);
	let mySettings = $state(null);
	let loading = $state(true);
	let error = $state('');
	let offline = $state(false);
	let now = $state(Date.now());
	let profileOpen = $state(false);
	let profileName = $state('');
	let profilePhone = $state('');
	let profileAddress = $state('');
	let profileError = $state('');
	let profileSaving = $state(false);
	let actionError = $state('');

	const settings = $derived(mySettings || publicStore.settings || defaultSettings);
	const primary = $derived(settings.primaryColor || '#047857');
	const activeRental = $derived(
		[...rentals]
			.filter((rental) => rental.status === 'active')
			.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] || null
	);
	const upcomingRentals = $derived(
		rentals.filter((rental) => rental.status === 'upcoming').sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
	);
	const history = $derived(
		rentals.filter((rental) => !['active', 'upcoming'].includes(rental.status))
	);
	const pendingReservations = $derived(reservations.filter((item) => item.status === 'pending'));
	const activeRepairs = $derived(
		repairs.filter((item) => !['delivered', 'cancelled'].includes(item.status))
	);
	const shopWa = $derived(
		whatsappHref(
			settings.whatsapp,
			`Bonjour Djo, je vous contacte au sujet de ma location ${activeRental?.vehicleName || ''}.`
		)
	);
	const time = $derived(activeRental ? timeLeft(activeRental.endTime, now) : null);
	const overdue = $derived(activeRental ? isOverdue(activeRental, now) : false);

	onMount(() => {
		loadPublic();
		user = getCachedUser();
		readCache();
		loadMine();

		const tick = setInterval(() => (now = Date.now()), 1000);
		const refresh = setInterval(() => {
			if (navigator.onLine) loadMine({ silent: true });
		}, 60_000);

		const onOnline = () => {
			offline = false;
			loadMine({ silent: true });
		};
		const onOffline = () => (offline = true);
		const onFocus = () => {
			if (navigator.onLine) loadMine({ silent: true });
		};
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		window.addEventListener('focus', onFocus);

		return () => {
			clearInterval(tick);
			clearInterval(refresh);
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
			window.removeEventListener('focus', onFocus);
		};
	});

	function readCache() {
		try {
			const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
			if (!cached) return;
			user = cached.user || user;
			rentals = cached.rentals || [];
			reservations = cached.reservations || [];
			repairs = cached.repairs || [];
			mySettings = cached.settings || null;
		} catch {
			// Ignore a corrupt cache.
		}
	}

	function writeCache() {
		try {
			localStorage.setItem(
				CACHE_KEY,
				JSON.stringify({ user, rentals, reservations, repairs, settings: mySettings })
			);
		} catch {
			// Cache quota can be exceeded by images; the app still works online.
		}
	}

	async function loadMine({ silent = false } = {}) {
		if (!navigator.onLine) {
			offline = true;
			loading = false;
			if (!user) window.location.href = '/login';
			return;
		}

		if (!silent) loading = true;
		error = '';
		try {
			const response = await fetch('/api/my');
			if (response.status === 401) {
				window.location.href = '/login';
				return;
			}
			if (!response.ok) throw new Error(`Impossible de charger votre espace (${response.status})`);
			const data = await response.json();
			if (data.user?.role === 'admin') {
				window.location.href = '/admin';
				return;
			}
			user = data.user;
			rentals = data.rentals || [];
			reservations = data.reservations || [];
			repairs = data.repairs || [];
			mySettings = data.settings || null;
			offline = false;
			writeCache();
			if (profileOpen && !profileSaving) fillProfile();
		} catch (err) {
			offline = true;
			if (!silent) error = err?.message || 'Impossible de charger votre espace.';
		} finally {
			loading = false;
		}
	}

	function fillProfile() {
		profileName = user?.name || '';
		profilePhone = user?.phone || '';
		profileAddress = user?.address || '';
		profileError = '';
	}

	function openProfile() {
		fillProfile();
		profileOpen = true;
	}

	async function saveProfile(event) {
		event.preventDefault();
		profileError = '';
		if (!navigator.onLine) {
			profileError = 'La modification du profil nécessite internet.';
			return;
		}
		profileSaving = true;
		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: profileName, phone: profilePhone, address: profileAddress })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				profileError = data.error || 'Enregistrement impossible';
				return;
			}
			user = { ...user, name: profileName, phone: profilePhone, address: profileAddress };
			writeCache();
			profileOpen = false;
		} catch {
			profileError = 'Pas de connexion. Réessayez plus tard.';
		} finally {
			profileSaving = false;
		}
	}

	async function cancelReservation(reservation) {
		if (!confirm('Annuler cette réservation ?')) return;
		actionError = '';
		if (!navigator.onLine) {
			actionError = 'L’annulation nécessite internet.';
			return;
		}
		try {
			const response = await fetch('/api/reservations', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ _id: reservation._id, status: 'cancelled' })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				actionError = data.error || 'Annulation impossible';
				return;
			}
			reservations = reservations.map((item) =>
				item._id === reservation._id ? { ...item, status: 'cancelled' } : item
			);
			writeCache();
		} catch {
			actionError = 'Pas de connexion. Réessayez plus tard.';
		}
	}
</script>

<svelte:head><title>Mon espace — {settings.shopName || 'MyBike Djo'}</title></svelte:head>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 sm:py-10">
	<div class="mx-auto max-w-5xl px-4">
		{#if offline}
			<div class="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
				<Icon name="wifi-off" class="mt-0.5 h-5 w-5 shrink-0" />
				<div>
					<p class="font-bold">Mode hors ligne</p>
					<p class="mt-0.5 text-xs leading-relaxed">
						Vous voyez les dernières données enregistrées sur ce téléphone. Le suivi de position continue et
						les points GPS seront envoyés dès le retour du réseau.
					</p>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
		{/if}

		<header class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<span class="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-black text-white shadow-sm" style="background-color: {primary}">
					{initials(user?.name || 'Client')}
				</span>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-gray-400">Mon espace</p>
					<h1 class="text-2xl font-black tracking-tight text-gray-900">{user?.name || 'Bonjour'}</h1>
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onclick={openProfile}>
					<Icon name="user" class="mr-1 inline h-4 w-4" /> Mon profil
				</button>
				<a href="/reserver" class="rounded-xl px-3.5 py-2 text-sm font-bold text-white" style="background-color: {primary}">
					+ Réserver
				</a>
			</div>
		</header>

		{#if loading && !user}
			<div class="mt-10 grid place-items-center py-20 text-sm text-gray-500">
				<Icon name="sync" class="h-6 w-6 animate-spin" />
				<p class="mt-3">Chargement de votre espace…</p>
			</div>
		{:else}
			<!-- Active rental -->
			{#if activeRental}
				<section class="mt-7 overflow-hidden rounded-3xl bg-gray-950 text-white shadow-xl">
					<div class="relative p-6 sm:p-8">
						<div class="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style="background-color: {primary}"></div>
						<div class="relative flex flex-wrap items-start justify-between gap-5">
							<div>
								<p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Location en cours</p>
								<h2 class="mt-1 text-2xl font-black sm:text-3xl">{activeRental.vehicleName}</h2>
								<p class="mt-1 text-sm text-gray-300">
									Démarrée le {formatDateTime(activeRental.startTime)} · retour prévu {formatDateTime(activeRental.endTime)}
								</p>
								<div class="mt-3 flex flex-wrap gap-2 text-xs">
									<span class="rounded-full bg-white/10 px-2.5 py-1">Total {formatMoney(activeRental.totalPrice)}</span>
									{#if activeRental.deposit}
										<span class="rounded-full bg-white/10 px-2.5 py-1">Caution {formatMoney(activeRental.deposit)}</span>
									{/if}
									{#if activeRental.idHeld}
										<span class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-200">Pièce d’identité au shop</span>
									{/if}
								</div>
							</div>
							<div class="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
								<p class="text-xs font-medium uppercase tracking-wide text-gray-300">{overdue ? 'Temps écoulé' : 'Temps restant'}</p>
								<p class="mt-1 text-3xl font-black tabular-nums sm:text-4xl">{time?.text || '—'}</p>
								{#if overdue}
									<p class="mt-1 text-xs font-medium text-amber-300">Merci de contacter le shop</p>
								{/if}
							</div>
						</div>
						<div class="relative mt-5 flex flex-wrap gap-2">
							<a href={phoneHref(settings.phone)} class="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100">
								<Icon name="phone" class="h-4 w-4" /> Appeler Djo
							</a>
							{#if shopWa}
								<a href={shopWa} target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-500">
									<Icon name="whatsapp" class="h-4 w-4" /> Signaler un problème
								</a>
							{/if}
						</div>
					</div>
					<div class="border-t border-white/10 bg-white p-4 text-gray-900 sm:p-5">
						{#key activeRental._id}
							<TrackingCard rental={activeRental} {settings} />
						{/key}
					</div>
				</section>
			{:else}
				<section class="mt-7 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-start gap-3">
							<span class="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-600"><Icon name="bike" class="h-5 w-5" /></span>
							<div>
								<h2 class="text-lg font-bold text-gray-900">Pas de location en cours</h2>
								<p class="mt-1 text-sm text-gray-500">Réservez un vélo ou une trottinette pour votre prochaine balade.</p>
							</div>
						</div>
						<a href="/reserver" class="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style="background-color: {primary}">Réserver</a>
					</div>
				</section>
			{/if}

			{#if actionError}
				<div class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
			{/if}

			<div class="mt-7 grid gap-6 lg:grid-cols-2">
				<!-- Reservations -->
				<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-base font-bold text-gray-900">Mes réservations</h2>
						{#if pendingReservations.length}
							<span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{pendingReservations.length} en attente</span>
						{/if}
					</div>
					{#if reservations.length}
						<div class="mt-4 space-y-3">
							{#each reservations.slice(0, 6) as reservation}
								<div class="rounded-xl border border-gray-100 p-3.5">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-sm font-bold text-gray-900">{reservation.vehicleName}</p>
											<p class="mt-0.5 text-xs text-gray-500">
												{new Date(reservation.date).toLocaleDateString('fr-FR')} · {reservation.hours}h · {formatMoney(reservation.totalPrice)}
											</p>
											{#if reservation.promoCode}
												<p class="mt-1 text-[11px] text-emerald-700">Code {reservation.promoCode} appliqué</p>
											{/if}
										</div>
										<StatusPill status={reservation.status} size="xs" />
									</div>
									{#if reservation.status === 'pending'}
										<button type="button" class="mt-2 text-xs font-medium text-red-600 hover:underline" onclick={() => cancelReservation(reservation)}>
											Annuler la demande
										</button>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="mt-4">
							<EmptyState icon="calendar" title="Aucune réservation" description="Votre prochaine balade commence ici.">
								<a href="/reserver" class="text-sm font-semibold hover:underline" style="color: {primary}">Réserver maintenant →</a>
							</EmptyState>
						</div>
					{/if}
				</section>

				<!-- Repairs -->
				<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-base font-bold text-gray-900">Mes réparations</h2>
						<a href="/reparer" class="text-xs font-semibold hover:underline" style="color: {primary}">Nouvelle demande</a>
					</div>
					{#if activeRepairs.length}
						<div class="mt-4 space-y-3">
							{#each activeRepairs.slice(0, 5) as repair}
								<div class="rounded-xl border border-gray-100 p-3.5">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-sm font-bold text-gray-900">{repair.deviceName || (repair.deviceType === 'trottinette' ? 'Trottinette' : 'Vélo')}</p>
											<p class="mt-0.5 line-clamp-2 text-xs text-gray-500">{repair.issue}</p>
											{#if repair.estimatedPrice || repair.finalPrice}
												<p class="mt-1 text-xs font-medium text-gray-700">Devis : {formatMoney(repair.finalPrice || repair.estimatedPrice)}</p>
											{/if}
										</div>
										<StatusPill status={repair.status} size="xs" />
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="mt-4">
							<EmptyState icon="wrench" title="Aucune réparation en cours" description="Un bruit, une panne ? Djo peut regarder." />
						</div>
					{/if}
				</section>
			</div>

			{#if upcomingRentals.length}
				<section class="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
					<h2 class="text-base font-bold text-blue-950">Locations à venir</h2>
					<div class="mt-3 grid gap-3 sm:grid-cols-2">
						{#each upcomingRentals as rental}
							<div class="rounded-xl bg-white p-3.5 shadow-sm">
								<p class="text-sm font-bold text-gray-900">{rental.vehicleName}</p>
								<p class="mt-0.5 text-xs text-gray-500">{formatDateTime(rental.startTime)}</p>
								<p class="mt-1 text-xs text-gray-500">{formatMoney(rental.totalPrice)}</p>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- History -->
			<section class="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
				<h2 class="text-base font-bold text-gray-900">Historique</h2>
				{#if history.length}
					<div class="mt-4 divide-y divide-gray-100">
						{#each history.slice(0, 8) as rental}
							<div class="flex flex-wrap items-center justify-between gap-3 py-3">
								<div>
									<p class="text-sm font-semibold text-gray-900">{rental.vehicleName}</p>
									<p class="text-xs text-gray-500">{formatDateTime(rental.startTime)} · {formatMoney(rental.finalPrice ?? rental.totalPrice)}</p>
								</div>
								<StatusPill status={rental.status} size="xs" />
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm text-gray-500">Vos locations terminées apparaîtront ici.</p>
				{/if}
			</section>

			<!-- Shop contact -->
			<section class="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 class="text-base font-bold text-gray-900">Le shop</h2>
						<p class="mt-1 text-sm text-gray-500">{settings.address} · {settings.openingHours}</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<a href={phoneHref(settings.phone)} class="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Appeler</a>
						{#if shopWa}
							<a href={shopWa} target="_blank" rel="noreferrer" class="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-500">WhatsApp</a>
						{/if}
					</div>
				</div>
			</section>
		{/if}
	</div>
</div>

<Modal bind:open={profileOpen} title="Mon profil" subtitle="Vos coordonnées pour les locations et réparations" size="sm">
	<form onsubmit={saveProfile} class="space-y-4">
		{#if profileError}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{profileError}</div>
		{/if}
		<div>
			<label for="profileName" class="mb-1 block text-sm font-medium text-gray-700">Nom complet</label>
			<input id="profileName" type="text" bind:value={profileName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<div>
			<label for="profilePhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
			<input id="profilePhone" type="tel" bind:value={profilePhone} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<div>
			<label for="profileAddress" class="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
			<input id="profileAddress" type="text" bind:value={profileAddress} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (profileOpen = false)}>Annuler</button>
			<button type="submit" disabled={profileSaving} class="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style="background-color: {primary}">
				{profileSaving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</Modal>
