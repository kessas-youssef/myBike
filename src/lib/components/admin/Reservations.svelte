<script>
	import { saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import { formatDate, formatMoney, todayInput } from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import StatusPill from '../StatusPill.svelte';
	import EmptyState from '../EmptyState.svelte';

	let filter = $state('pending');
	let search = $state('');
	let error = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let form = $state(blankForm());

	const settings = $derived(store.settings);
	const reservations = $derived(visibleDocs('reservations'));
	const vehicles = $derived(visibleDocs('vehicles').filter((vehicle) => vehicle.active !== false));

	const counts = $derived({
		all: reservations.length,
		pending: reservations.filter((item) => item.status === 'pending').length,
		confirmed: reservations.filter((item) => item.status === 'confirmed').length,
		converted: reservations.filter((item) => item.status === 'converted').length,
		cancelled: reservations.filter((item) => item.status === 'cancelled').length
	});

	const filters = [
		{ id: 'pending', label: 'En attente' },
		{ id: 'confirmed', label: 'Confirmées' },
		{ id: 'converted', label: 'Converties' },
		{ id: 'cancelled', label: 'Annulées' },
		{ id: 'all', label: 'Toutes' }
	];

	const filtered = $derived.by(() => {
		let rows = filter === 'all' ? reservations : reservations.filter((item) => item.status === filter);
		const query = search.trim().toLowerCase();
		if (query) {
			rows = rows.filter((item) =>
				[item.clientName, item.clientPhone, item.vehicleName]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(query)
			);
		}
		return [...rows].sort(
			(a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
		);
	});

	function blankForm() {
		return {
			vehicleId: '',
			clientName: '',
			clientPhone: '',
			date: todayInput(),
			hours: 2,
			notes: ''
		};
	}

	const formVehicle = $derived(vehicles.find((vehicle) => vehicle._id === form.vehicleId) || null);
	const formTotal = $derived(
		formVehicle ? Number(formVehicle.pricePerHour || 0) * Math.max(1, Number(form.hours) || 1) : 0
	);

	function openNew() {
		form = blankForm();
		const first = vehicles.find((vehicle) => Number(vehicle.available) > 0) || vehicles[0];
		if (first) form.vehicleId = first._id;
		error = '';
		formOpen = true;
	}

	async function saveReservation(event) {
		event.preventDefault();
		error = '';
		if (!form.vehicleId || !form.clientName.trim() || !form.clientPhone.trim()) {
			error = 'Véhicule, nom et téléphone sont requis';
			return;
		}
		const vehicle = vehicles.find((item) => item._id === form.vehicleId);
		if (!vehicle) {
			error = 'Véhicule introuvable';
			return;
		}
		saving = true;
		try {
			await saveDoc('reservations', {
				vehicleId: vehicle._id,
				vehicleName: vehicle.name,
				vehicleType: vehicle.type,
				clientId: null,
				clientName: form.clientName.trim(),
				clientPhone: form.clientPhone.trim(),
				date: new Date(`${form.date}T09:00:00`).toISOString(),
				hours: Math.max(1, Number(form.hours) || 1),
				basePrice: formTotal,
				discount: 0,
				totalPrice: formTotal,
				promoCode: '',
				status: 'pending',
				notes: form.notes.trim(),
				source: 'admin'
			});
			formOpen = false;
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function confirmReservation(reservation) {
		error = '';
		await saveDoc('reservations', { ...reservation, status: 'confirmed', confirmedAt: new Date().toISOString() });
	}

	async function cancelReservation(reservation) {
		if (!confirm('Annuler cette réservation ?')) return;
		error = '';
		await saveDoc('reservations', { ...reservation, status: 'cancelled', cancelledAt: new Date().toISOString() });
	}

	async function convertReservation(reservation) {
		if (!confirm(`Créer une location à venir pour ${reservation.clientName} ?`)) return;
		error = '';
		const vehicle = vehicles.find((item) => item._id === reservation.vehicleId);
		if (!vehicle) {
			error = 'Véhicule introuvable. La réservation ne peut pas être convertie.';
			return;
		}

		let start = new Date(reservation.date);
		if (Number.isNaN(start.getTime()) || start < new Date()) start = new Date();
		const hours = Math.max(1, Number(reservation.hours) || 1);
		const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

		await saveDoc('rentals', {
			vehicleId: vehicle._id,
			vehicleName: vehicle.name,
			vehicleType: vehicle.type,
			clientId: reservation.clientId || null,
			clientName: reservation.clientName || '',
			clientPhone: reservation.clientPhone || '',
			renterIdType: 'CNI',
			renterIdNumber: '',
			idHeld: false,
			deposit: Number(vehicle.deposit || 0),
			hours,
			pricePerHour: Number(vehicle.pricePerHour || 0),
			discount: Number(reservation.discount || 0),
			totalPrice: Number(reservation.totalPrice || 0),
			startTime: start.toISOString(),
			endTime: end.toISOString(),
			status: 'upcoming',
			notes: reservation.notes || '',
			reservationId: reservation._id,
			startedAt: null,
			returnedAt: null,
			trackingEnabled: false
		});

		await saveDoc('reservations', {
			...reservation,
			status: 'converted',
			convertedAt: new Date().toISOString()
		});
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Réservations</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Demandes de réservation</h1>
			<p class="mt-1 text-sm text-gray-500">Confirmez, convertissez en location ou annulez.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Réservation au shop
		</button>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}

	<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex gap-1 overflow-x-auto pb-1">
				{#each filters as item}
					<button
						type="button"
						class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition {filter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => (filter = item.id)}
					>
						{item.label}
						<span class="ml-1 opacity-60">{counts[item.id] || 0}</span>
					</button>
				{/each}
			</div>
			<label class="relative block w-full sm:w-60">
				<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input type="search" bind:value={search} placeholder="Client, véhicule…" class="w-full rounded-xl border-gray-300 py-2 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
			</label>
		</div>
	</div>

	{#if filtered.length}
		<div class="grid gap-3 md:grid-cols-2">
			{#each filtered as reservation}
				<article class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate font-bold text-gray-900">{reservation.vehicleName}</p>
							<p class="mt-0.5 text-xs text-gray-500">{reservation.clientName} · {reservation.clientPhone}</p>
						</div>
						<StatusPill status={reservation.status} size="xs" />
					</div>
					<div class="mt-3 grid grid-cols-3 gap-2 text-xs">
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Date</p>
							<p class="mt-0.5 font-medium text-gray-800">{formatDate(reservation.date)}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Durée</p>
							<p class="mt-0.5 font-medium text-gray-800">{reservation.hours}h</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
							<p class="mt-0.5 font-bold text-gray-900">{formatMoney(reservation.totalPrice)}</p>
						</div>
					</div>
					{#if reservation.promoCode}
						<p class="mt-2 text-[11px] text-emerald-700">Code {reservation.promoCode} · remise {formatMoney(reservation.discount)}</p>
					{/if}
					{#if reservation.notes}
						<p class="mt-2 line-clamp-2 text-xs text-gray-500">{reservation.notes}</p>
					{/if}
					<div class="mt-3 flex flex-wrap gap-2">
						{#if reservation.status === 'pending'}
							<button type="button" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700" onclick={() => confirmReservation(reservation)}>Confirmer</button>
							<button type="button" class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800" onclick={() => convertReservation(reservation)}>Créer la location</button>
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onclick={() => cancelReservation(reservation)}>Annuler</button>
						{:else if reservation.status === 'confirmed'}
							<button type="button" class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800" onclick={() => convertReservation(reservation)}>Créer la location</button>
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onclick={() => cancelReservation(reservation)}>Annuler</button>
						{:else if reservation.status === 'cancelled'}
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => confirmReservation(reservation)}>Rouvrir</button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="calendar" title="Aucune réservation ici" description="Les demandes envoyées depuis le site apparaissent automatiquement." />
	{/if}
</div>

<Modal bind:open={formOpen} title="Réservation au shop" subtitle="Pour les clients qui appellent ou passent directement" size="md">
	<form onsubmit={saveReservation} class="space-y-4">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}
		<div>
			<label for="resVehicle" class="mb-1 block text-sm font-medium text-gray-700">Véhicule</label>
			<select id="resVehicle" bind:value={form.vehicleId} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
				<option value="">— Choisir —</option>
				{#each vehicles as vehicle}
					<option value={vehicle._id}>{vehicle.name} · {formatMoney(vehicle.pricePerHour)}/h</option>
				{/each}
			</select>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="resName" class="mb-1 block text-sm font-medium text-gray-700">Nom</label>
				<input id="resName" type="text" bind:value={form.clientName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="resPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
				<input id="resPhone" type="tel" bind:value={form.clientPhone} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="resDate" class="mb-1 block text-sm font-medium text-gray-700">Date</label>
				<input id="resDate" type="date" bind:value={form.date} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="resHours" class="mb-1 block text-sm font-medium text-gray-700">Durée (heures)</label>
				<input id="resHours" type="number" min="1" max="72" bind:value={form.hours} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
		</div>
		<div>
			<label for="resNotes" class="mb-1 block text-sm font-medium text-gray-700">Notes</label>
			<textarea id="resNotes" bind:value={form.notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
		</div>
		<div class="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
			<span class="text-sm text-gray-500">Total estimé</span>
			<span class="text-lg font-black text-gray-900">{formatMoney(formTotal)}</span>
		</div>
		<div class="flex gap-3">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
		</div>
	</form>
</Modal>
