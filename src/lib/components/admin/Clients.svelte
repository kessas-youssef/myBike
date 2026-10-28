<script>
	import { saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import {
		formatDate,
		formatDateTime,
		formatMoney,
		initials,
		phoneHref,
		whatsappHref
	} from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import StatusPill from '../StatusPill.svelte';
	import EmptyState from '../EmptyState.svelte';

	let search = $state('');
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	let historyOpen = $state(false);
	let historyClient = $state(null);

	const settings = $derived(store.settings);
	const currency = $derived(settings.currency || 'DA');
	const clients = $derived(visibleDocs('clients'));
	const rentals = $derived(visibleDocs('rentals'));
	const reservations = $derived(visibleDocs('reservations'));
	const repairs = $derived(visibleDocs('repairs'));

	const rows = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return clients
			.filter((client) => {
				if (!query) return true;
				return [client.name, client.email, client.phone, client.address, client.notes]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(query);
			})
			.map((client) => {
				const clientRentals = rentals.filter((rental) => rental.clientId === client._id);
				const active = clientRentals.filter((rental) => rental.status === 'active').length;
				const spent = clientRentals
					.filter((rental) => rental.status === 'completed')
					.reduce((sum, rental) => sum + Number(rental.finalPrice ?? rental.totalPrice ?? 0), 0);
				const last = [...clientRentals].sort(
					(a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0)
				)[0];
				return { ...client, rentalsCount: clientRentals.length, active, spent, last };
			})
			.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
	});

	const stats = $derived({
		total: clients.length,
		active: rentals.filter((rental) => rental.status === 'active').length,
		revenue: rentals
			.filter((rental) => rental.status === 'completed')
			.reduce((sum, rental) => sum + Number(rental.finalPrice ?? rental.totalPrice ?? 0), 0),
		withPhone: clients.filter((client) => client.phone).length
	});

	const history = $derived.by(() => {
		if (!historyClient) return { rentals: [], reservations: [], repairs: [] };
		return {
			rentals: rentals
				.filter((rental) => rental.clientId === historyClient._id)
				.sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0)),
			reservations: reservations
				.filter((reservation) => reservation.clientId === historyClient._id)
				.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)),
			repairs: repairs
				.filter((repair) => repair.clientId === historyClient._id)
				.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
		};
	});

	function blankForm() {
		return { name: '', email: '', phone: '', address: '', notes: '' };
	}

	function openEdit(client) {
		error = '';
		notice = '';
		editing = client;
		form = {
			name: client.name || '',
			email: client.email || '',
			phone: client.phone || '',
			address: client.address || '',
			notes: client.notes || ''
		};
		formOpen = true;
	}

	function openHistory(client) {
		historyClient = client;
		historyOpen = true;
	}

	async function saveClient(event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (!form.name.trim()) {
			error = 'Le nom du client est requis.';
			return;
		}
		saving = true;
		try {
			await saveDoc('clients', {
				...(editing || {}),
				name: form.name.trim(),
				email: form.email.trim().toLowerCase(),
				phone: form.phone.trim(),
				address: form.address.trim(),
				notes: form.notes.trim(),
				role: 'client'
			});
			formOpen = false;
			editing = null;
			notice = 'Fiche client enregistrée. Les changements seront synchronisés.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Relation client</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Clients</h1>
			<p class="mt-1 text-sm text-gray-500">Coordonnées, historique et fidélité.</p>
		</div>
		<label class="relative block w-full sm:w-72">
			<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
			<input type="search" bind:value={search} placeholder="Nom, téléphone, email…" class="w-full rounded-xl border-gray-300 py-2.5 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
		</label>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}
	{#if notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">{notice}</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Clients inscrits</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.total}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Avec téléphone</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.withPhone}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Locations actives</p>
			<p class="mt-1 text-2xl font-black text-blue-700">{stats.active}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Chiffre d’affaires</p>
			<p class="mt-1 text-lg font-black text-emerald-700">{formatMoney(stats.revenue, currency)}</p>
		</div>
	</div>

	{#if rows.length}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each rows as client}
				<article class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
							{initials(client.name || 'Client')}
						</span>
						<div class="min-w-0 flex-1">
							<h2 class="truncate font-bold text-gray-900">{client.name || 'Client'}</h2>
							<p class="mt-0.5 truncate text-xs text-gray-500">{client.email || 'Pas d’email'}</p>
							{#if client.phone}
								<p class="mt-0.5 text-xs font-medium text-gray-700">{client.phone}</p>
							{/if}
						</div>
						{#if client.active > 0}
							<span class="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{client.active} en cours</span>
						{/if}
					</div>

					<div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
						<div class="rounded-lg bg-gray-50 px-2 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Locations</p>
							<p class="mt-0.5 font-bold text-gray-900">{client.rentalsCount}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Dépensé</p>
							<p class="mt-0.5 truncate font-bold text-gray-900">{formatMoney(client.spent, currency)}</p>
						</div>
						<div class="rounded-lg bg-gray-50 px-2 py-2">
							<p class="text-[10px] uppercase tracking-wide text-gray-400">Dernière</p>
							<p class="mt-0.5 truncate font-semibold text-gray-700">{client.last ? formatDate(client.last.startTime || client.last.createdAt, { month: '2-digit', year: 'numeric' }) : '—'}</p>
						</div>
					</div>

					{#if client.address}
						<p class="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
							<Icon name="location" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span class="line-clamp-1">{client.address}</span>
						</p>
					{/if}

					<div class="mt-3 flex flex-wrap gap-2">
						<button type="button" class="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800" onclick={() => openHistory(client)}>Historique</button>
						<button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => openEdit(client)}>Modifier</button>
						{#if client.phone}
							<a href={phoneHref(client.phone)} class="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Appeler" aria-label="Appeler"><Icon name="phone" class="h-4 w-4" /></a>
							<a href={whatsappHref(client.phone, `Bonjour ${client.name}, c’est Djo de MyBike.`)} target="_blank" rel="noreferrer" class="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-50" title="WhatsApp" aria-label="WhatsApp"><Icon name="whatsapp" class="h-4 w-4" /></a>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="users" title="Aucun client trouvé" description="Les clients qui créent un compte ou réservent apparaissent ici." />
	{/if}
</div>

<Modal bind:open={formOpen} title="Modifier la fiche client" subtitle={editing?.email || ''} size="md">
	<form onsubmit={saveClient} class="space-y-4">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="clientName" class="mb-1 block text-sm font-medium text-gray-700">Nom complet</label>
				<input id="clientName" type="text" bind:value={form.name} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="clientEmail" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
				<input id="clientEmail" type="email" bind:value={form.email} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				<p class="mt-1 text-[11px] text-gray-400">Sert aussi d’identifiant de connexion au portail client.</p>
			</div>
			<div>
				<label for="clientPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
				<input id="clientPhone" type="tel" bind:value={form.phone} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="clientAddress" class="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
				<input id="clientAddress" type="text" bind:value={form.address} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="clientNotes" class="mb-1 block text-sm font-medium text-gray-700">Notes internes</label>
				<textarea id="clientNotes" bind:value={form.notes} rows="3" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Préférences, remarques, historique de confiance…"></textarea>
			</div>
		</div>
		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
		</div>
	</form>
</Modal>

<Modal bind:open={historyOpen} title="Historique client" subtitle={historyClient ? `${historyClient.name} · ${historyClient.phone || historyClient.email || ''}` : ''} size="lg">
	{#if historyClient}
		<div class="space-y-5">
			<div class="grid grid-cols-3 gap-2 text-center text-xs">
				<div class="rounded-xl bg-gray-50 px-3 py-3">
					<p class="text-[10px] uppercase tracking-wide text-gray-400">Locations</p>
					<p class="mt-1 text-xl font-black text-gray-900">{history.rentals.length}</p>
				</div>
				<div class="rounded-xl bg-gray-50 px-3 py-3">
					<p class="text-[10px] uppercase tracking-wide text-gray-400">Réservations</p>
					<p class="mt-1 text-xl font-black text-gray-900">{history.reservations.length}</p>
				</div>
				<div class="rounded-xl bg-gray-50 px-3 py-3">
					<p class="text-[10px] uppercase tracking-wide text-gray-400">Réparations</p>
					<p class="mt-1 text-xl font-black text-gray-900">{history.repairs.length}</p>
				</div>
			</div>

			<section>
				<h3 class="text-sm font-bold text-gray-900">Locations</h3>
				{#if history.rentals.length}
					<div class="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
						{#each history.rentals as rental}
							<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-gray-900">{rental.vehicleName}</p>
									<p class="text-xs text-gray-500">{formatDateTime(rental.startTime)} · {formatMoney(rental.finalPrice ?? rental.totalPrice, currency)}</p>
								</div>
								<StatusPill status={rental.status} size="xs" />
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-1 text-sm text-gray-500">Aucune location enregistrée.</p>
				{/if}
			</section>

			<section>
				<h3 class="text-sm font-bold text-gray-900">Réservations</h3>
				{#if history.reservations.length}
					<div class="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
						{#each history.reservations as reservation}
							<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-gray-900">{reservation.vehicleName}</p>
									<p class="text-xs text-gray-500">{formatDate(reservation.date)} · {reservation.hours}h · {formatMoney(reservation.totalPrice, currency)}</p>
								</div>
								<StatusPill status={reservation.status} size="xs" />
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-1 text-sm text-gray-500">Aucune réservation.</p>
				{/if}
			</section>

			<section>
				<h3 class="text-sm font-bold text-gray-900">Réparations</h3>
				{#if history.repairs.length}
					<div class="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
						{#each history.repairs as repair}
							<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-gray-900">{repair.deviceName || (repair.deviceType === 'trottinette' ? 'Trottinette' : 'Vélo')}</p>
									<p class="truncate text-xs text-gray-500">{repair.issue}</p>
								</div>
								<StatusPill status={repair.status} size="xs" />
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-1 text-sm text-gray-500">Aucune réparation.</p>
				{/if}
			</section>

			{#if historyClient.notes}
				<div class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
					<p class="text-xs font-bold uppercase tracking-wide">Notes internes</p>
					<p class="mt-1 whitespace-pre-line">{historyClient.notes}</p>
				</div>
			{/if}
		</div>
	{/if}
</Modal>
