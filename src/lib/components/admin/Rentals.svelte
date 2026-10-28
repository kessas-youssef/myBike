<script>
	import { onMount } from 'svelte';
	import { removeDoc, saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import {
		formatDateTime,
		formatMoney,
		isOverdue,
		phoneHref,
		timeLeft,
		toDateTimeInput,
		whatsappHref
	} from '$lib/format.js';
	import { distanceMeters, googleMapsUrl, osmEmbedUrl } from '$lib/geo.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import StatusPill from '../StatusPill.svelte';
	import EmptyState from '../EmptyState.svelte';
	import RentalContract from './RentalContract.svelte';

	let search = $state('');
	let filter = $state('all');
	let now = $state(Date.now());
	let error = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	let completeOpen = $state(false);
	let completing = $state(null);
	let completeForm = $state({ finalPrice: 0, depositReturned: true, notes: '' });

	let extendOpen = $state(false);
	let extending = $state(null);
	let extraHours = $state(1);

	let trackingOpen = $state(false);
	let trackingRental = $state(null);
	let trackingPings = $state([]);
	let trackingLoading = $state(false);
	let trackingError = $state('');

	let contractOpen = $state(false);
	let contractRental = $state(null);

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const settings = $derived(store.settings);
	const vehicles = $derived(visibleDocs('vehicles').filter((vehicle) => vehicle.active !== false));
	const clients = $derived(visibleDocs('clients'));
	const rentals = $derived(visibleDocs('rentals'));

	const counts = $derived({
		all: rentals.length,
		active: rentals.filter((rental) => rental.status === 'active').length,
		upcoming: rentals.filter((rental) => rental.status === 'upcoming').length,
		overdue: rentals.filter((rental) => isOverdue(rental, now)).length,
		completed: rentals.filter((rental) => rental.status === 'completed').length,
		cancelled: rentals.filter((rental) => rental.status === 'cancelled').length
	});

	const filtered = $derived.by(() => {
		let rows = rentals;
		if (filter === 'overdue') rows = rows.filter((rental) => isOverdue(rental, now));
		else if (filter !== 'all') rows = rows.filter((rental) => rental.status === filter);

		const query = search.trim().toLowerCase();
		if (query) {
			rows = rows.filter((rental) =>
				[rental.vehicleName, rental.clientName, rental.clientPhone, rental.renterIdNumber]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(query)
			);
		}

		return [...rows].sort(
			(a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0)
		);
	});

	const filters = [
		{ id: 'all', label: 'Toutes' },
		{ id: 'active', label: 'En cours' },
		{ id: 'upcoming', label: 'À venir' },
		{ id: 'overdue', label: 'En retard' },
		{ id: 'completed', label: 'Terminées' },
		{ id: 'cancelled', label: 'Annulées' }
	];

	function blankForm() {
		return {
			vehicleId: '',
			clientId: '',
			clientName: '',
			clientPhone: '',
			renterIdType: 'CNI',
			renterIdNumber: '',
			idHeld: false,
			deposit: 0,
			hours: 2,
			startMode: 'now',
			startAt: toDateTimeInput(new Date()),
			discount: 0,
			notes: '',
			pricePerHour: 0,
			status: 'active'
		};
	}

	function openNew() {
		error = '';
		editing = null;
		form = blankForm();
		const first = vehicles.find((vehicle) => Number(vehicle.available) > 0) || vehicles[0];
		if (first) {
			form.vehicleId = first._id;
			form.pricePerHour = Number(first.pricePerHour || 0);
			form.deposit = Number(first.deposit || 0);
		}
		form.idHeld = Boolean(settings.idRequired);
		formOpen = true;
	}

	function openEdit(rental) {
		error = '';
		editing = rental;
		form = {
			vehicleId: rental.vehicleId || '',
			clientId: rental.clientId || '',
			clientName: rental.clientName || '',
			clientPhone: rental.clientPhone || '',
			renterIdType: rental.renterIdType || 'CNI',
			renterIdNumber: rental.renterIdNumber || '',
			idHeld: Boolean(rental.idHeld),
			deposit: Number(rental.deposit || 0),
			hours: Number(rental.hours || 1),
			startMode: rental.status === 'upcoming' ? 'scheduled' : 'now',
			startAt: toDateTimeInput(rental.startTime || new Date()),
			discount: Number(rental.discount || 0),
			notes: rental.notes || '',
			pricePerHour: Number(rental.pricePerHour || 0),
			status: rental.status
		};
		formOpen = true;
	}

	function onVehicleChange() {
		const vehicle = vehicles.find((item) => item._id === form.vehicleId);
		if (!vehicle) return;
		if (!editing) {
			form.pricePerHour = Number(vehicle.pricePerHour || 0);
			form.deposit = Number(vehicle.deposit || 0);
		}
	}

	function onClientChange() {
		const client = clients.find((item) => item._id === form.clientId);
		if (!client) return;
		form.clientName = client.name || '';
		form.clientPhone = client.phone || '';
	}

	const formVehicle = $derived(vehicles.find((vehicle) => vehicle._id === form.vehicleId) || null);
	const formTotal = $derived(
		Math.max(0, Number(form.pricePerHour || 0) * Math.max(1, Number(form.hours || 1)) - Number(form.discount || 0))
	);

	async function saveRental(event) {
		event.preventDefault();
		error = '';
		if (!form.vehicleId) {
			error = 'Choisissez un véhicule';
			return;
		}
		if (!form.clientName.trim() || !form.clientPhone.trim()) {
			error = 'Le nom et le téléphone du locataire sont requis';
			return;
		}

		const vehicle = vehicles.find((item) => item._id === form.vehicleId);
		if (!vehicle) {
			error = 'Véhicule introuvable';
			return;
		}

		saving = true;
		try {
			const hours = Math.max(1, Number(form.hours) || 1);
			const pricePerHour = Number(form.pricePerHour || vehicle.pricePerHour || 0);
			const discount = Math.max(0, Number(form.discount) || 0);
			const totalPrice = Math.max(0, pricePerHour * hours - discount);
			const nowDate = new Date();

			if (editing) {
				const start =
					editing.status === 'upcoming' ? new Date(form.startAt) : new Date(editing.startTime || nowDate);
				const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
				const wasHeld = Boolean(editing.idHeld);
				await saveDoc('rentals', {
					...editing,
					vehicleId: form.vehicleId,
					vehicleName: vehicle.name,
					vehicleType: vehicle.type,
					clientId: form.clientId || null,
					clientName: form.clientName.trim(),
					clientPhone: form.clientPhone.trim(),
					renterIdType: form.renterIdType,
					renterIdNumber: form.renterIdNumber.trim(),
					idHeld: form.idHeld,
					idHeldAt: form.idHeld ? editing.idHeldAt || nowDate.toISOString() : null,
					deposit: Number(form.deposit) || 0,
					hours,
					pricePerHour,
					discount,
					totalPrice,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					notes: form.notes.trim()
				});
			} else {
				const start = form.startMode === 'now' ? nowDate : new Date(form.startAt);
				if (Number.isNaN(start.getTime())) throw new Error('Date de départ invalide');
				const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
				const status = form.startMode === 'now' ? 'active' : 'upcoming';

				if (status === 'active' && Number(vehicle.available) < 1) {
					throw new Error('Ce véhicule n’est plus disponible');
				}

				const created = await saveDoc('rentals', {
					vehicleId: vehicle._id,
					vehicleName: vehicle.name,
					vehicleType: vehicle.type,
					clientId: form.clientId || null,
					clientName: form.clientName.trim(),
					clientPhone: form.clientPhone.trim(),
					renterIdType: form.renterIdType,
					renterIdNumber: form.renterIdNumber.trim(),
					idHeld: form.idHeld,
					idHeldAt: form.idHeld ? nowDate.toISOString() : null,
					deposit: Number(form.deposit) || 0,
					hours,
					pricePerHour,
					discount,
					totalPrice,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					status,
					notes: form.notes.trim(),
					startedAt: status === 'active' ? nowDate.toISOString() : null,
					returnedAt: null,
					trackingEnabled: false
				});

				if (status === 'active') {
					await saveDoc('vehicles', {
						...vehicle,
						available: Math.max(0, Number(vehicle.available) - 1)
					});
				}

				// Keep a reference for the success path.
				editing = created;
			}

			formOpen = false;
			editing = null;
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function startRental(rental) {
		error = '';
		const vehicle = vehicles.find((item) => item._id === rental.vehicleId);
		if (!vehicle || Number(vehicle.available) < 1) {
			error = 'Impossible de démarrer : véhicule indisponible.';
			return;
		}
		if (!confirm(`Démarrer la location de ${rental.vehicleName} maintenant ?`)) return;

		const nowDate = new Date();
		const hours = Math.max(1, Number(rental.hours) || 1);
		const pricePerHour = Number(rental.pricePerHour || vehicle.pricePerHour || 0);
		const discount = Number(rental.discount || 0);
		await saveDoc('rentals', {
			...rental,
			status: 'active',
			startTime: nowDate.toISOString(),
			endTime: new Date(nowDate.getTime() + hours * 60 * 60 * 1000).toISOString(),
			startedAt: nowDate.toISOString(),
			totalPrice: Math.max(0, pricePerHour * hours - discount)
		});
		await saveDoc('vehicles', {
			...vehicle,
			available: Math.max(0, Number(vehicle.available) - 1)
		});
	}

	function openComplete(rental) {
		completing = rental;
		completeForm = {
			finalPrice: Number(rental.finalPrice ?? rental.totalPrice ?? 0),
			depositReturned: true,
			notes: rental.notes || ''
		};
		completeOpen = true;
	}

	async function completeRental(event) {
		event.preventDefault();
		if (!completing) return;
		error = '';
		saving = true;
		try {
			const vehicle = vehicles.find((item) => item._id === completing.vehicleId);
			await saveDoc('rentals', {
				...completing,
				status: 'completed',
				returnedAt: new Date().toISOString(),
				finalPrice: Number(completeForm.finalPrice) || 0,
				depositReturned: Boolean(completeForm.depositReturned),
				notes: completeForm.notes.trim(),
				trackingEnabled: false
			});
			if (vehicle && completing.status === 'active') {
				await saveDoc('vehicles', {
					...vehicle,
					available: Math.min(Number(vehicle.stock || 0), Number(vehicle.available) + 1)
				});
			}
			completeOpen = false;
			completing = null;
		} catch (err) {
			error = err?.message || 'Impossible de terminer la location';
		} finally {
			saving = false;
		}
	}

	function openExtend(rental) {
		extending = rental;
		extraHours = 1;
		extendOpen = true;
	}

	async function extendRental(event) {
		event.preventDefault();
		if (!extending) return;
		const extra = Math.max(1, Number(extraHours) || 1);
		const hours = Number(extending.hours || 0) + extra;
		const pricePerHour = Number(extending.pricePerHour || 0);
		const discount = Number(extending.discount || 0);
		await saveDoc('rentals', {
			...extending,
			hours,
			endTime: new Date(new Date(extending.startTime).getTime() + hours * 60 * 60 * 1000).toISOString(),
			totalPrice: Math.max(0, pricePerHour * hours - discount),
			extendedAt: new Date().toISOString()
		});
		extendOpen = false;
		extending = null;
	}

	async function cancelRental(rental) {
		if (!confirm(`Annuler la location de ${rental.vehicleName} ?`)) return;
		error = '';
		try {
			if (rental.status === 'active') {
				const vehicle = vehicles.find((item) => item._id === rental.vehicleId);
				if (vehicle) {
					await saveDoc('vehicles', {
						...vehicle,
						available: Math.min(Number(vehicle.stock || 0), Number(vehicle.available) + 1)
					});
				}
			}
			await saveDoc('rentals', {
				...rental,
				status: 'cancelled',
				cancelledAt: new Date().toISOString(),
				trackingEnabled: false
			});
		} catch (err) {
			error = err?.message || 'Annulation impossible';
		}
	}

	async function deleteRental(rental) {
		if (!['completed', 'cancelled'].includes(rental.status)) {
			error = 'Terminez ou annulez la location avant de la supprimer.';
			return;
		}
		if (!confirm('Supprimer définitivement cette location de l’historique ?')) return;
		await removeDoc('rentals', rental._id);
	}

	function trackingState(rental) {
		if (rental.status !== 'active') {
			return { label: rental.lastPingAt ? 'Historique' : '—', tone: 'gray' };
		}
		if (!rental.lastPingAt && !rental.trackingConsentAt) {
			return { label: 'Non activé', tone: 'gray' };
		}
		if (rental.lastPingAt && now - new Date(rental.lastPingAt).getTime() > 10 * 60_000) {
			return { label: 'Signal perdu', tone: 'amber' };
		}
		const point = rental.lastLocation;
		if (point?.lat != null) {
			const distance = distanceMeters(point, settings.shopLocation);
			if (distance !== null && distance > Number(settings.geofenceRadius || 0)) {
				return { label: 'Hors zone', tone: 'red' };
			}
		}
		return { label: 'Suivi actif', tone: 'emerald' };
	}

	async function openTracking(rental) {
		trackingRental = rental;
		trackingPings = [];
		trackingError = '';
		trackingOpen = true;
		await loadPings();
	}

	async function loadPings() {
		if (!trackingRental) return;
		trackingLoading = true;
		trackingError = '';
		try {
			if (!navigator.onLine) throw new Error('Hors ligne : seules les dernières données synchronisées sont disponibles.');
			const response = await fetch(`/api/tracking?rentalId=${encodeURIComponent(trackingRental._id)}&limit=100`);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Impossible de charger les positions');
			trackingRental = { ...trackingRental, ...(data.rental || {}) };
			trackingPings = data.pings || [];
		} catch (err) {
			trackingError = err?.message || 'Impossible de charger les positions';
		} finally {
			trackingLoading = false;
		}
	}

	function openContract(rental) {
		contractRental = rental;
		contractOpen = true;
	}

	const trackingPoint = $derived(trackingRental?.lastLocation || null);
	const trackingDistance = $derived(
		trackingPoint ? distanceMeters(trackingPoint, settings.shopLocation) : null
	);
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Locations</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Gérer les locations</h1>
			<p class="mt-1 text-sm text-gray-500">Départs, retours, cautions et suivi de sécurité.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Nouvelle location
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
			<label class="relative block w-full sm:w-64">
				<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input
					type="search"
					bind:value={search}
					placeholder="Client, véhicule, pièce…"
					class="w-full rounded-xl border-gray-300 py-2 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500"
				/>
			</label>
		</div>
	</div>

	{#if filtered.length}
		<!-- Desktop table -->
		<div class="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
					<tr>
						<th class="px-4 py-3 font-semibold">Client</th>
						<th class="px-4 py-3 font-semibold">Véhicule</th>
						<th class="px-4 py-3 font-semibold">Période</th>
						<th class="px-4 py-3 font-semibold">Total</th>
						<th class="px-4 py-3 font-semibold">Suivi</th>
						<th class="px-4 py-3 font-semibold">Statut</th>
						<th class="px-4 py-3 text-right font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each filtered as rental}
						{@const tracking = trackingState(rental)}
						<tr class="align-top hover:bg-gray-50/60">
							<td class="px-4 py-3">
								<p class="font-semibold text-gray-900">{rental.clientName || '—'}</p>
								<p class="text-xs text-gray-500">{rental.clientPhone || '—'}</p>
								{#if rental.idHeld}
									<p class="mt-1 text-[11px] font-medium text-emerald-700">Pièce d’identité retenue</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								<p class="font-medium text-gray-900">{rental.vehicleName}</p>
								<p class="text-xs text-gray-500">{rental.hours}h · {formatMoney(rental.deposit)} caution</p>
							</td>
							<td class="px-4 py-3">
								<p class="text-xs text-gray-600">{formatDateTime(rental.startTime)}</p>
								<p class="text-xs text-gray-500">→ {formatDateTime(rental.endTime)}</p>
								{#if rental.status === 'active'}
									<p class="mt-1 text-[11px] font-semibold {isOverdue(rental, now) ? 'text-red-600' : 'text-emerald-700'}">
										{isOverdue(rental, now) ? 'En retard' : timeLeft(rental.endTime, now).text}
									</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								<p class="font-bold text-gray-900">{formatMoney(rental.finalPrice ?? rental.totalPrice)}</p>
								{#if rental.discount}
									<p class="text-[11px] text-emerald-700">−{formatMoney(rental.discount)}</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								<StatusPill status={rental.status} label={tracking.label} tone={tracking.tone} size="xs" />
							</td>
							<td class="px-4 py-3">
								<StatusPill status={isOverdue(rental, now) ? 'overdue' : rental.status} size="xs" />
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap justify-end gap-1.5">
									{#if rental.status === 'upcoming'}
										<button type="button" class="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700" onclick={() => startRental(rental)}>Démarrer</button>
									{:else if rental.status === 'active'}
										<button type="button" class="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700" onclick={() => openComplete(rental)}>Terminer</button>
									{/if}
									<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Modifier" aria-label="Modifier" onclick={() => openEdit(rental)}>
										<Icon name="edit" class="h-4 w-4" />
									</button>
									<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Suivi de position" aria-label="Suivi de position" onclick={() => openTracking(rental)}>
										<Icon name="location" class="h-4 w-4" />
									</button>
									<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Contrat" aria-label="Contrat" onclick={() => openContract(rental)}>
										<Icon name="print" class="h-4 w-4" />
									</button>
									{#if rental.status === 'active'}
										<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Prolonger" aria-label="Prolonger" onclick={() => openExtend(rental)}>
											<Icon name="clock" class="h-4 w-4" />
										</button>
										<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50" title="Annuler" aria-label="Annuler" onclick={() => cancelRental(rental)}>
											<Icon name="x" class="h-4 w-4" />
										</button>
									{:else if rental.status === 'upcoming'}
										<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50" title="Annuler" aria-label="Annuler" onclick={() => cancelRental(rental)}>
											<Icon name="x" class="h-4 w-4" />
										</button>
									{:else}
										<button type="button" class="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer" aria-label="Supprimer" onclick={() => deleteRental(rental)}>
											<Icon name="trash" class="h-4 w-4" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile cards -->
		<div class="grid gap-3 lg:hidden">
			{#each filtered as rental}
				{@const tracking = trackingState(rental)}
				<article class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate font-bold text-gray-900">{rental.vehicleName}</p>
							<p class="mt-0.5 text-xs text-gray-500">{rental.clientName || '—'} · {rental.clientPhone || '—'}</p>
						</div>
						<StatusPill status={isOverdue(rental, now) ? 'overdue' : rental.status} size="xs" />
					</div>
					<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Départ</p>
							<p class="mt-0.5 font-medium text-gray-800">{formatDateTime(rental.startTime)}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Retour</p>
							<p class="mt-0.5 font-medium text-gray-800">{formatDateTime(rental.endTime)}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
							<p class="mt-0.5 font-bold text-gray-900">{formatMoney(rental.finalPrice ?? rental.totalPrice)}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2.5 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Suivi</p>
							<div class="mt-1"><StatusPill status={rental.status} label={tracking.label} tone={tracking.tone} size="xs" /></div>
						</div>
					</div>
					{#if rental.status === 'active'}
						<p class="mt-2 text-xs font-semibold {isOverdue(rental, now) ? 'text-red-600' : 'text-emerald-700'}">
							{isOverdue(rental, now) ? 'Retour en retard' : `Temps restant : ${timeLeft(rental.endTime, now).text}`}
						</p>
					{/if}
					<div class="mt-3 flex flex-wrap gap-2">
						{#if rental.status === 'upcoming'}
							<button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white" onclick={() => startRental(rental)}>Démarrer</button>
						{:else if rental.status === 'active'}
							<button type="button" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" onclick={() => openComplete(rental)}>Terminer</button>
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700" onclick={() => openExtend(rental)}>Prolonger</button>
						{/if}
						<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700" onclick={() => openTracking(rental)}>Suivi</button>
						<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700" onclick={() => openContract(rental)}>Contrat</button>
						<button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700" onclick={() => openEdit(rental)}>Modifier</button>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="bike" title="Aucune location" description="Créez une location pour un client, même sans internet.">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white" onclick={openNew}>+ Nouvelle location</button>
		</EmptyState>
	{/if}
</div>

<!-- Rental form -->
<Modal bind:open={formOpen} title={editing ? 'Modifier la location' : 'Nouvelle location'} subtitle={editing ? 'Les modifications sont enregistrées localement puis synchronisées.' : 'Fonctionne hors ligne : tout sera synchronisé au retour d’internet.'} size="lg">
	<form onsubmit={saveRental} class="space-y-5">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="rentalVehicle" class="mb-1 block text-sm font-medium text-gray-700">Véhicule</label>
				<select id="rentalVehicle" bind:value={form.vehicleId} onchange={onVehicleChange} disabled={editing?.status === 'active' || editing?.status === 'completed'} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100">
					<option value="">— Choisir —</option>
					{#each vehicles as vehicle}
						<option value={vehicle._id}>{vehicle.name} · {formatMoney(vehicle.pricePerHour)}/h · {vehicle.available} dispo</option>
					{/each}
				</select>
				{#if formVehicle}
					<p class="mt-1 text-xs text-gray-500">
						{formVehicle.color || ''} {formVehicle.brand ? `· ${formVehicle.brand}` : ''} · caution {formatMoney(formVehicle.deposit)}
					</p>
				{/if}
			</div>

			<div>
				<label for="rentalClient" class="mb-1 block text-sm font-medium text-gray-700">Client enregistré <span class="text-gray-400">(optionnel)</span></label>
				<select id="rentalClient" bind:value={form.clientId} onchange={onClientChange} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value="">— Client de passage —</option>
					{#each clients as client}
						<option value={client._id}>{client.name} · {client.phone || client.email}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="rentalPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone du locataire</label>
				<input id="rentalPhone" type="tel" bind:value={form.clientPhone} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 12 34 56" />
			</div>
			<div class="sm:col-span-2">
				<label for="rentalName" class="mb-1 block text-sm font-medium text-gray-700">Nom du locataire</label>
				<input id="rentalName" type="text" bind:value={form.clientName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Nom complet" />
			</div>
		</div>

		<div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
			<h3 class="flex items-center gap-2 text-sm font-bold text-gray-900"><Icon name="lock" class="h-4 w-4" /> Pièce d’identité & caution</h3>
			<div class="mt-3 grid gap-3 sm:grid-cols-3">
				<div>
					<label for="idType" class="mb-1 block text-xs font-medium text-gray-600">Type de pièce</label>
					<select id="idType" bind:value={form.renterIdType} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500">
						<option value="CNI">Carte d’identité</option>
						<option value="Permis">Permis de conduire</option>
						<option value="Passeport">Passeport</option>
						<option value="Autre">Autre</option>
					</select>
				</div>
				<div>
					<label for="idNumber" class="mb-1 block text-xs font-medium text-gray-600">Numéro</label>
					<input id="idNumber" type="text" bind:value={form.renterIdNumber} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" placeholder="N° de la pièce" />
				</div>
				<div>
					<label for="deposit" class="mb-1 block text-xs font-medium text-gray-600">Caution (DA)</label>
					<input id="deposit" type="number" min="0" bind:value={form.deposit} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
			<label class="mt-3 flex items-center gap-2 text-sm text-gray-700">
				<input type="checkbox" bind:checked={form.idHeld} class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
				La pièce d’identité est physiquement retenue au shop
			</label>
		</div>

		<div class="grid gap-4 sm:grid-cols-3">
			<div>
				<label for="rentalHours" class="mb-1 block text-sm font-medium text-gray-700">Durée (heures)</label>
				<input id="rentalHours" type="number" min="1" max="720" bind:value={form.hours} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="rentalDiscount" class="mb-1 block text-sm font-medium text-gray-700">Remise (DA)</label>
				<input id="rentalDiscount" type="number" min="0" bind:value={form.discount} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="flex items-end">
				<div class="w-full rounded-xl bg-gray-900 px-3 py-2.5 text-center text-white">
					<p class="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
					<p class="text-lg font-black">{formatMoney(formTotal)}</p>
				</div>
			</div>
		</div>

		{#if !editing || editing.status === 'upcoming'}
			<div class="rounded-xl border border-gray-200 p-4">
				<p class="text-sm font-medium text-gray-700">Départ</p>
				<div class="mt-2 flex flex-wrap gap-4">
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" bind:group={form.startMode} value="now" class="text-emerald-600 focus:ring-emerald-500" />
						Maintenant
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" bind:group={form.startMode} value="scheduled" class="text-emerald-600 focus:ring-emerald-500" />
						Planifier
					</label>
				</div>
				{#if form.startMode === 'scheduled'}
					<div class="mt-3">
						<label for="startAt" class="mb-1 block text-xs font-medium text-gray-600">Date et heure de départ</label>
						<input id="startAt" type="datetime-local" bind:value={form.startAt} required class="w-full rounded-xl border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
					</div>
				{/if}
			</div>
		{:else}
			<p class="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
				Location démarrée le {formatDateTime(editing.startTime)}. Pour changer la durée, utilisez « Prolonger ».
			</p>
		{/if}

		<div>
			<label for="rentalNotes" class="mb-1 block text-sm font-medium text-gray-700">Notes <span class="text-gray-400">(optionnel)</span></label>
			<textarea id="rentalNotes" bind:value={form.notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Accessoires prêtés, état du véhicule, remarques…"></textarea>
		</div>

		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
				{saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la location'}
			</button>
		</div>
	</form>
</Modal>

<!-- Complete -->
<Modal bind:open={completeOpen} title="Terminer la location" subtitle={completing?.vehicleName || ''} size="sm">
	<form onsubmit={completeRental} class="space-y-4">
		<div>
			<label for="finalPrice" class="mb-1 block text-sm font-medium text-gray-700">Montant final encaissé (DA)</label>
			<input id="finalPrice" type="number" min="0" bind:value={completeForm.finalPrice} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<label class="flex items-center gap-2 text-sm text-gray-700">
			<input type="checkbox" bind:checked={completeForm.depositReturned} class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
			Caution restituée au client
		</label>
		<div>
			<label for="completeNotes" class="mb-1 block text-sm font-medium text-gray-700">Notes de retour</label>
			<textarea id="completeNotes" bind:value={completeForm.notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="État du véhicule, accessoires rendus…"></textarea>
		</div>
		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700" onclick={() => (completeOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
				{saving ? 'Enregistrement…' : 'Terminer la location'}
			</button>
		</div>
	</form>
</Modal>

<!-- Extend -->
<Modal bind:open={extendOpen} title="Prolonger la location" subtitle={extending?.vehicleName || ''} size="sm">
	<form onsubmit={extendRental} class="space-y-4">
		<div>
			<label for="extraHours" class="mb-1 block text-sm font-medium text-gray-700">Heures supplémentaires</label>
			<input id="extraHours" type="number" min="1" max="72" bind:value={extraHours} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<p class="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
			Nouveau retour prévu : {extending ? formatDateTime(new Date(new Date(extending.startTime).getTime() + (Number(extending.hours) + Number(extraHours || 0)) * 3600000)) : '—'}
		</p>
		<div class="flex gap-3">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700" onclick={() => (extendOpen = false)}>Annuler</button>
			<button type="submit" class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white">Prolonger</button>
		</div>
	</form>
</Modal>

<!-- Tracking -->
<Modal bind:open={trackingOpen} title="Suivi de position" subtitle={trackingRental ? `${trackingRental.vehicleName} · ${trackingRental.clientName}` : ''} size="lg">
	{#if trackingRental}
		<div class="space-y-4">
			<div class="flex flex-wrap gap-2">
				{#if trackingRental.clientPhone}
					<a href={phoneHref(trackingRental.clientPhone)} class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white"><Icon name="phone" class="h-4 w-4" /> Appeler</a>
					<a href={whatsappHref(trackingRental.clientPhone, `Bonjour ${trackingRental.clientName}, je vous contacte au sujet de la location ${trackingRental.vehicleName}.`)} target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white"><Icon name="whatsapp" class="h-4 w-4" /> WhatsApp</a>
				{/if}
				<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onclick={loadPings} disabled={trackingLoading}>
					<Icon name="refresh" class="h-4 w-4 {trackingLoading ? 'animate-spin' : ''}" /> Actualiser
				</button>
			</div>

			{#if trackingError}
				<div class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{trackingError}</div>
			{/if}

			{#if trackingPoint}
				<div class="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
					<div class="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
						<p><span class="text-gray-500">Dernière position :</span> <strong>{formatDateTime(trackingPoint.at || trackingRental.lastPingAt)}</strong></p>
						<p><span class="text-gray-500">Coordonnées :</span> {trackingPoint.lat}, {trackingPoint.lng}</p>
						<p><span class="text-gray-500">Précision :</span> {trackingPoint.accuracy ? `± ${trackingPoint.accuracy} m` : '—'}</p>
						<p><span class="text-gray-500">Distance du shop :</span> <strong class={trackingDistance > Number(settings.geofenceRadius || 0) ? 'text-red-600' : 'text-emerald-700'}>{trackingDistance ?? '—'} m</strong></p>
						<p><span class="text-gray-500">Zone :</span> {trackingDistance > Number(settings.geofenceRadius || 0) ? 'Hors zone' : 'Dans la zone'}</p>
						<a href={googleMapsUrl(trackingPoint)} target="_blank" rel="noreferrer" class="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-100">
							<Icon name="map" class="h-4 w-4" /> Ouvrir dans Google Maps
						</a>
					</div>
					<div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
						{#if navigator.onLine}
							<iframe title="Dernière position" src={osmEmbedUrl(trackingPoint, 15)} class="h-64 w-full" loading="lazy"></iframe>
						{:else}
							<div class="grid h-64 place-items-center p-4 text-center text-sm text-gray-500">Carte indisponible hors ligne.<br />Les coordonnées restent disponibles.</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
					Aucune position partagée pour cette location.
					{#if trackingRental.status === 'active'}<br />Le client doit activer le suivi depuis son espace.{/if}
				</div>
			{/if}

			<div>
				<h3 class="text-sm font-bold text-gray-900">Historique des positions</h3>
				{#if trackingPings.length}
					<div class="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-100">
						<table class="w-full text-xs">
							<thead class="sticky top-0 bg-gray-50 text-left text-gray-500">
								<tr><th class="px-3 py-2">Heure</th><th class="px-3 py-2">Distance shop</th><th class="px-3 py-2">Zone</th></tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each trackingPings as ping}
									<tr>
										<td class="px-3 py-2">{formatDateTime(ping.at)}</td>
										<td class="px-3 py-2">{ping.distanceM ?? '—'} m</td>
										<td class="px-3 py-2">
											<span class={ping.outsideGeofence ? 'font-semibold text-red-600' : 'text-emerald-700'}>{ping.outsideGeofence ? 'Hors zone' : 'OK'}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="mt-2 text-sm text-gray-500">Aucun point enregistré.</p>
				{/if}
			</div>

			<p class="text-[11px] leading-relaxed text-gray-400">
				Le suivi web fonctionne uniquement lorsque le portail du locataire est ouvert. Les positions sont
				envoyées au shop et conservées pour la durée de la location.
			</p>
		</div>
	{/if}
</Modal>

<!-- Contract -->
<Modal bind:open={contractOpen} title="Contrat de location" size="xl">
	{#if contractRental}
		<RentalContract rental={contractRental} {settings} onClose={() => (contractOpen = false)} />
	{/if}
</Modal>
