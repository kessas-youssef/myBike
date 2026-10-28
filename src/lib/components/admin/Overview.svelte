<script>
	import { onMount } from 'svelte';
	import { store, visibleDocs } from '$lib/client/store.svelte.js';
	import { distanceMeters } from '$lib/geo.js';
	import {
		formatDateTime,
		formatMoney,
		isOverdue,
		isToday,
		relativeTime
	} from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import StatCard from '../StatCard.svelte';
	import StatusPill from '../StatusPill.svelte';
	import EmptyState from '../EmptyState.svelte';

	let { onNavigate = () => {} } = $props();
	let now = $state(Date.now());

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const settings = $derived(store.settings);
	const vehicles = $derived(visibleDocs('vehicles'));
	const accessories = $derived(visibleDocs('accessories'));
	const rentals = $derived(visibleDocs('rentals'));
	const reservations = $derived(visibleDocs('reservations'));
	const repairs = $derived(visibleDocs('repairs'));
	const activeRentals = $derived(rentals.filter((rental) => rental.status === 'active'));
	const upcomingRentals = $derived(
		rentals
			.filter((rental) => rental.status === 'upcoming')
			.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
	);
	const pendingReservations = $derived(reservations.filter((item) => item.status === 'pending'));
	const openRepairs = $derived(
		repairs.filter((item) => !['delivered', 'cancelled'].includes(item.status))
	);
	const readyRepairs = $derived(repairs.filter((item) => item.status === 'ready'));
	const lowStock = $derived([
		...vehicles
			.filter((vehicle) => Number(vehicle.available) <= 1)
			.map((vehicle) => ({ ...vehicle, kind: 'Véhicule' })),
		...accessories
			.filter((item) => Number(item.stock) <= 2)
			.map((item) => ({ ...item, kind: 'Accessoire' }))
	]);

	const revenueToday = $derived(
		rentals
			.filter((rental) => isToday(rental.startTime) && ['active', 'completed'].includes(rental.status))
			.reduce((sum, rental) => sum + Number(rental.finalPrice ?? rental.totalPrice ?? 0), 0)
	);
	const activeDeposits = $derived(
		activeRentals.reduce((sum, rental) => sum + Number(rental.deposit || 0), 0)
	);

	const alerts = $derived.by(() => {
		const list = [];
		for (const rental of activeRentals) {
			if (isOverdue(rental, now)) {
				list.push({
					id: `overdue-${rental._id}`,
					tone: 'red',
					icon: 'clock',
					title: 'Location en retard',
					text: `${rental.vehicleName} · ${rental.clientName || 'Client'} — retour prévu ${formatDateTime(rental.endTime)}`,
					tab: 'rentals'
				});
			}
			const point = rental.lastLocation;
			if (point?.lat != null) {
				const distance = distanceMeters(point, settings.shopLocation);
				if (distance !== null && distance > Number(settings.geofenceRadius || 0)) {
					list.push({
						id: `outside-${rental._id}`,
						tone: 'red',
						icon: 'location',
						title: 'Hors de la zone',
						text: `${rental.vehicleName} · ${rental.clientName || 'Client'} — à ${distance} m du shop`,
						tab: 'rentals'
					});
				}
			}
			if (!rental.lastPingAt && !rental.trackingConsentAt) {
				list.push({
					id: `notracking-${rental._id}`,
					tone: 'amber',
					icon: 'shield',
					title: 'Suivi non activé',
					text: `${rental.vehicleName} · ${rental.clientName || 'Client'} n’a pas encore partagé sa position.`,
					tab: 'rentals'
				});
			} else if (rental.lastPingAt && now - new Date(rental.lastPingAt).getTime() > 10 * 60_000) {
				list.push({
					id: `nosignal-${rental._id}`,
					tone: 'amber',
					icon: 'wifi-off',
					title: 'Signal perdu',
					text: `${rental.vehicleName} · dernière position ${relativeTime(rental.lastPingAt, now)}.`,
					tab: 'rentals'
				});
			}
		}
		if (pendingReservations.length) {
			list.push({
				id: 'reservations',
				tone: 'blue',
				icon: 'calendar',
				title: `${pendingReservations.length} réservation(s) en attente`,
				text: 'À confirmer ou à convertir en location.',
				tab: 'reservations'
			});
		}
		if (readyRepairs.length) {
			list.push({
				id: 'repairs-ready',
				tone: 'emerald',
				icon: 'wrench',
				title: `${readyRepairs.length} réparation(s) prête(s)`,
				text: 'Prévenez les clients que leur machine est prête.',
				tab: 'repairs'
			});
		}
		if (lowStock.length) {
			list.push({
				id: 'stock',
				tone: 'amber',
				icon: 'package',
				title: 'Stock bas',
				text: `${lowStock.length} article(s) à surveiller.`,
				tab: 'vehicles'
			});
		}
		return list;
	});

	const recent = $derived(
		[
			...rentals.map((item) => ({ ...item, kind: 'Location', tab: 'rentals', date: item.updatedAt || item.createdAt })),
			...reservations.map((item) => ({ ...item, kind: 'Réservation', tab: 'reservations', date: item.updatedAt || item.createdAt })),
			...repairs.map((item) => ({ ...item, kind: 'Réparation', tab: 'repairs', date: item.updatedAt || item.createdAt }))
		]
			.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
			.slice(0, 6)
	);

	const tones = {
		red: 'border-red-200 bg-red-50 text-red-800',
		amber: 'border-amber-200 bg-amber-50 text-amber-800',
		blue: 'border-blue-200 bg-blue-50 text-blue-800',
		emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800'
	};
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Vue d’ensemble</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
				Bonjour Djo 👋
			</h1>
			<p class="mt-1 text-sm text-gray-500">
				{new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-bold text-white hover:bg-gray-800" onclick={() => onNavigate('rentals')}>
				+ Nouvelle location
			</button>
			<button type="button" class="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onclick={() => onNavigate('repairs')}>
				+ Réparation
			</button>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatCard label="CA du jour" value={formatMoney(revenueToday, settings.currency || 'DA')} hint="Locations démarrées aujourd’hui" icon="chart" tone="emerald" />
		<StatCard label="Locations actives" value={activeRentals.length} hint={`${activeDeposits ? formatMoney(activeDeposits) + ' de cautions' : 'Aucune caution en cours'}`} icon="bike" tone="blue" />
		<StatCard label="Réservations" value={pendingReservations.length} hint="En attente de confirmation" icon="calendar" tone="amber" />
		<StatCard label="Réparations" value={openRepairs.length} hint={`${readyRepairs.length} prête(s) à rendre`} icon="wrench" tone="indigo" />
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
		<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-base font-bold text-gray-900">Alertes & priorités</h2>
				<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{alerts.length}</span>
			</div>
			{#if alerts.length}
				<div class="mt-4 space-y-2.5">
					{#each alerts.slice(0, 8) as alert}
						<button
							type="button"
							class="flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition hover:brightness-[0.98] {tones[alert.tone] || tones.amber}"
							onclick={() => onNavigate(alert.tab)}
						>
							<Icon name={alert.icon} class="mt-0.5 h-5 w-5 shrink-0" />
							<span class="min-w-0 flex-1">
								<span class="block text-sm font-bold">{alert.title}</span>
								<span class="mt-0.5 block text-xs opacity-80">{alert.text}</span>
							</span>
							<Icon name="arrow" class="mt-1 h-4 w-4 shrink-0 opacity-50" />
						</button>
					{/each}
				</div>
			{:else}
				<div class="mt-4">
					<EmptyState icon="check" title="Tout est calme" description="Aucune alerte pour le moment. Bonne journée !" />
				</div>
			{/if}
		</section>

		<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
			<h2 class="text-base font-bold text-gray-900">Aujourd’hui</h2>
			<div class="mt-4 space-y-3">
				{#each activeRentals.slice(0, 3) as rental}
					<div class="rounded-xl bg-gray-50 p-3.5">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-bold text-gray-900">{rental.vehicleName}</p>
								<p class="mt-0.5 truncate text-xs text-gray-500">{rental.clientName || 'Client'} · retour {formatDateTime(rental.endTime)}</p>
							</div>
							<StatusPill status={isOverdue(rental, now) ? 'overdue' : rental.status} size="xs" />
						</div>
					</div>
				{/each}
				{#each upcomingRentals.slice(0, 2) as rental}
					<div class="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
						<p class="text-sm font-bold text-blue-950">{rental.vehicleName}</p>
						<p class="mt-0.5 text-xs text-blue-800">Départ {formatDateTime(rental.startTime)} · {rental.clientName || 'Client'}</p>
					</div>
				{/each}
				{#if !activeRentals.length && !upcomingRentals.length}
					<p class="rounded-xl bg-gray-50 p-3.5 text-sm text-gray-500">Aucune location prévue aujourd’hui.</p>
				{/if}
			</div>

			{#if lowStock.length}
				<div class="mt-5 border-t border-gray-100 pt-4">
					<h3 class="text-xs font-bold uppercase tracking-wide text-gray-400">Stock à surveiller</h3>
					<div class="mt-2 space-y-1.5">
						{#each lowStock.slice(0, 4) as item}
							<button type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50" onclick={() => onNavigate(item.kind === 'Véhicule' ? 'vehicles' : 'accessories')}>
								<span class="truncate text-gray-700">{item.name}</span>
								<span class="shrink-0 font-bold text-amber-700">{item.kind === 'Véhicule' ? item.available : item.stock} restant(s)</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</div>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-base font-bold text-gray-900">Activité récente</h2>
			<button type="button" class="text-xs font-semibold text-gray-500 hover:text-gray-900" onclick={() => onNavigate('rentals')}>Tout voir →</button>
		</div>
		{#if recent.length}
			<div class="mt-4 divide-y divide-gray-100">
				{#each recent as item}
					<button type="button" class="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left hover:bg-gray-50" onclick={() => onNavigate(item.tab)}>
						<div class="flex min-w-0 items-center gap-3">
							<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500">
								<Icon name={item.kind === 'Location' ? 'bike' : item.kind === 'Réservation' ? 'calendar' : 'wrench'} class="h-4 w-4" />
							</span>
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-gray-900">
									{item.kind} · {item.vehicleName || item.deviceName || item.clientName || 'Sans titre'}
								</p>
								<p class="truncate text-xs text-gray-500">{item.clientName || item.clientPhone || '—'} · {relativeTime(item.date, now)}</p>
							</div>
						</div>
						<StatusPill status={item.status} size="xs" />
					</button>
				{/each}
			</div>
		{:else}
			<div class="mt-4">
				<EmptyState icon="chart" title="Pas encore d’activité" description="Les locations, réservations et réparations apparaîtront ici." />
			</div>
		{/if}
	</section>
</div>
