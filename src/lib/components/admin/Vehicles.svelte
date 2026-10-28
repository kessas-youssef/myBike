<script>
	import { removeDoc, saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import { formatMoney } from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import ImagePicker from '../ImagePicker.svelte';
	import EmptyState from '../EmptyState.svelte';

	let search = $state('');
	let typeFilter = $state('all');
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	const settings = $derived(store.settings);
	const currency = $derived(settings.currency || 'DA');
	const vehicles = $derived(visibleDocs('vehicles'));
	const rentals = $derived(visibleDocs('rentals'));

	const filtered = $derived.by(() => {
		let rows = vehicles;
		if (typeFilter !== 'all') rows = rows.filter((vehicle) => vehicle.type === typeFilter);
		const query = search.trim().toLowerCase();
		if (query) {
			rows = rows.filter((vehicle) =>
				[vehicle.name, vehicle.brand, vehicle.model, vehicle.color, vehicle.description]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(query)
			);
		}
		return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
	});

	const stats = $derived({
		total: vehicles.length,
		available: vehicles.reduce((sum, vehicle) => sum + Number(vehicle.available || 0), 0),
		stock: vehicles.reduce((sum, vehicle) => sum + Number(vehicle.stock || 0), 0),
		activeRentals: rentals.filter((rental) => rental.status === 'active').length
	});

	function blankForm() {
		return {
			name: '',
			type: 'bike',
			brand: '',
			model: '',
			color: '',
			colorHex: '#047857',
			pricePerHour: 300,
			pricePerDay: 0,
			deposit: 5000,
			stock: 1,
			available: 1,
			image: '',
			description: '',
			equipmentText: '',
			active: true
		};
	}

	function openNew() {
		error = '';
		notice = '';
		editing = null;
		form = blankForm();
		form.deposit = Number(
			form.type === 'trottinette' ? settings.depositScooter : settings.depositBike
		);
		formOpen = true;
	}

	function openEdit(vehicle) {
		error = '';
		notice = '';
		editing = vehicle;
		form = {
			name: vehicle.name || '',
			type: vehicle.type || 'bike',
			brand: vehicle.brand || '',
			model: vehicle.model || '',
			color: vehicle.color || '',
			colorHex: vehicle.colorHex || '#047857',
			pricePerHour: Number(vehicle.pricePerHour || 0),
			pricePerDay: Number(vehicle.pricePerDay || 0),
			deposit: Number(vehicle.deposit || 0),
			stock: Number(vehicle.stock || 1),
			available: Number(vehicle.available ?? vehicle.stock ?? 1),
			image: vehicle.image || '',
			description: vehicle.description || '',
			equipmentText: Array.isArray(vehicle.equipment) ? vehicle.equipment.join(', ') : '',
			active: vehicle.active !== false
		};
		formOpen = true;
	}

	function onTypeChange() {
		if (editing) return;
		form.deposit = Number(
			form.type === 'trottinette' ? settings.depositScooter : settings.depositBike
		);
	}

	async function saveVehicle(event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (!form.name.trim()) {
			error = 'Le nom du véhicule est requis.';
			return;
		}

		saving = true;
		try {
			const stock = Math.max(0, Math.round(Number(form.stock) || 0));
			const available = Math.min(stock, Math.max(0, Math.round(Number(form.available) || 0)));
			const equipment = form.equipmentText
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);

			await saveDoc('vehicles', {
				...(editing || {}),
				name: form.name.trim(),
				type: form.type === 'trottinette' ? 'trottinette' : 'bike',
				brand: form.brand.trim(),
				model: form.model.trim(),
				color: form.color.trim(),
				colorHex: form.colorHex || '#9ca3af',
				pricePerHour: Math.max(0, Number(form.pricePerHour) || 0),
				pricePerDay: Math.max(0, Number(form.pricePerDay) || 0),
				deposit: Math.max(0, Number(form.deposit) || 0),
				stock,
				available,
				image: form.image,
				description: form.description.trim(),
				equipment,
				active: Boolean(form.active)
			});

			formOpen = false;
			editing = null;
			notice = 'Véhicule enregistré. Il sera publié au prochain passage en ligne.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function adjustAvailable(vehicle, delta) {
		error = '';
		const stock = Number(vehicle.stock || 0);
		const available = Math.min(stock, Math.max(0, Number(vehicle.available || 0) + delta));
		if (available === Number(vehicle.available || 0)) return;
		try {
			await saveDoc('vehicles', { ...vehicle, available });
		} catch (err) {
			error = err?.message || 'Mise à jour impossible';
		}
	}

	async function toggleActive(vehicle) {
		error = '';
		try {
			await saveDoc('vehicles', { ...vehicle, active: vehicle.active === false });
		} catch (err) {
			error = err?.message || 'Mise à jour impossible';
		}
	}

	async function deleteVehicle(vehicle) {
		error = '';
		notice = '';
		const busy = rentals.some(
			(rental) =>
				rental.vehicleId === vehicle._id && ['active', 'upcoming'].includes(rental.status)
		);
		if (busy) {
			error = 'Ce véhicule est utilisé par une location en cours ou à venir. Terminez-la avant de le supprimer.';
			return;
		}
		if (!confirm(`Supprimer « ${vehicle.name} » de la flotte ?`)) return;
		await removeDoc('vehicles', vehicle._id);
		notice = 'Véhicule supprimé. La suppression sera synchronisée.';
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Flotte</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Véhicules</h1>
			<p class="mt-1 text-sm text-gray-500">Tarifs, couleurs, équipements, stock et disponibilité.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Ajouter un véhicule
		</button>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}
	{#if notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">{notice}</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Modèles</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.total}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Unités disponibles</p>
			<p class="mt-1 text-2xl font-black text-emerald-700">{stats.available}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Stock total</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.stock}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">En location</p>
			<p class="mt-1 text-2xl font-black text-blue-700">{stats.activeRentals}</p>
		</div>
	</div>

	<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex gap-1">
				{#each [{ id: 'all', label: 'Tous' }, { id: 'bike', label: 'Vélos' }, { id: 'trottinette', label: 'Trottinettes' }] as item}
					<button
						type="button"
						class="rounded-lg px-3 py-2 text-xs font-semibold transition {typeFilter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => (typeFilter = item.id)}
					>
						{item.label}
					</button>
				{/each}
			</div>
			<label class="relative block w-full sm:w-64">
				<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input type="search" bind:value={search} placeholder="Nom, marque, couleur…" class="w-full rounded-xl border-gray-300 py-2 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
			</label>
		</div>
	</div>

	{#if filtered.length}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filtered as vehicle}
				{@const isBusy = rentals.some((rental) => rental.vehicleId === vehicle._id && ['active', 'upcoming'].includes(rental.status))}
				<article class="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
					<div class="relative h-44 bg-gray-100">
						<img
							src={vehicle.image || '/images/bike-mountain.jpg'}
							alt={vehicle.name}
							class="h-full w-full object-cover"
							onerror={(event) => (event.currentTarget.src = '/images/bike-mountain.jpg')}
						/>
						<div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
							<span class="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-sm">
								{vehicle.type === 'trottinette' ? 'Trottinette' : 'Vélo'}
							</span>
							{#if vehicle.active === false}
								<span class="rounded-full bg-gray-900/90 px-2.5 py-1 text-[11px] font-bold text-white">Masqué</span>
							{/if}
						</div>
						<div class="absolute right-3 top-3">
							{#if Number(vehicle.available) > 0}
								<span class="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">{vehicle.available} dispo</span>
							{:else}
								<span class="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">Complet</span>
							{/if}
						</div>
					</div>

					<div class="flex flex-1 flex-col p-4">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<h2 class="truncate font-bold text-gray-900">{vehicle.name}</h2>
								<p class="mt-0.5 truncate text-xs text-gray-500">
									{[vehicle.brand, vehicle.model].filter(Boolean).join(' · ') || 'Marque non renseignée'}
								</p>
							</div>
							{#if vehicle.color}
								<span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
									<span class="h-2.5 w-2.5 rounded-full border border-gray-300" style="background-color: {vehicle.colorHex || '#9ca3af'}"></span>
									{vehicle.color}
								</span>
							{/if}
						</div>

						<div class="mt-3 flex items-end justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
							<div>
								<p class="text-lg font-black text-gray-900">{formatMoney(vehicle.pricePerHour, currency)}<span class="text-xs font-medium text-gray-500">/h</span></p>
								{#if Number(vehicle.pricePerDay) > 0}
									<p class="text-[11px] text-gray-500">{formatMoney(vehicle.pricePerDay, currency)} / jour</p>
								{/if}
							</div>
							<p class="text-right text-[11px] text-gray-500">Caution<br /><strong class="text-gray-700">{formatMoney(vehicle.deposit, currency)}</strong></p>
						</div>

						{#if vehicle.equipment?.length}
							<div class="mt-2.5 flex flex-wrap gap-1">
								{#each vehicle.equipment.slice(0, 4) as item}
									<span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{item}</span>
								{/each}
								{#if vehicle.equipment.length > 4}
									<span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">+{vehicle.equipment.length - 4}</span>
								{/if}
							</div>
						{/if}

						<div class="mt-3 flex items-center justify-between gap-2 text-xs">
							<span class="text-gray-500">Disponibilité</span>
							<div class="flex items-center gap-1">
								<button type="button" class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100" aria-label="Retirer une unité disponible" onclick={() => adjustAvailable(vehicle, -1)}>−</button>
								<span class="min-w-12 text-center font-bold text-gray-900">{vehicle.available} / {vehicle.stock}</span>
								<button type="button" class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100" aria-label="Ajouter une unité disponible" onclick={() => adjustAvailable(vehicle, 1)}>+</button>
							</div>
						</div>

						<div class="mt-auto flex flex-wrap gap-2 pt-4">
							<button type="button" class="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800" onclick={() => openEdit(vehicle)}>Modifier</button>
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => toggleActive(vehicle)}>
								{vehicle.active === false ? 'Publier' : 'Masquer'}
							</button>
							<button
								type="button"
								class="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
								title={isBusy ? 'Location en cours ou à venir' : 'Supprimer'}
								aria-label="Supprimer"
								disabled={isBusy}
								onclick={() => deleteVehicle(vehicle)}
							>
								<Icon name="trash" class="h-4 w-4" />
							</button>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="bike" title="Aucun véhicule" description="Ajoutez votre premier vélo ou trottinette pour le proposer à la location.">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white" onclick={openNew}>+ Ajouter un véhicule</button>
		</EmptyState>
	{/if}
</div>

<Modal bind:open={formOpen} title={editing ? 'Modifier le véhicule' : 'Nouveau véhicule'} subtitle="Enregistré sur cet appareil puis synchronisé automatiquement." size="lg">
	<form onsubmit={saveVehicle} class="space-y-5">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<ImagePicker bind:value={form.image} label="Photo du véhicule" help="Photo compressée et stockée avec la fiche. Vous pouvez aussi utiliser une URL." />

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="vehicleName" class="mb-1 block text-sm font-medium text-gray-700">Nom affiché</label>
				<input id="vehicleName" type="text" bind:value={form.name} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="VTT Canastel" />
			</div>
			<div>
				<label for="vehicleType" class="mb-1 block text-sm font-medium text-gray-700">Type</label>
				<select id="vehicleType" bind:value={form.type} onchange={onTypeChange} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value="bike">Vélo</option>
					<option value="trottinette">Trottinette électrique</option>
				</select>
			</div>
			<div>
				<label for="vehicleActive" class="mb-1 block text-sm font-medium text-gray-700">Visibilité</label>
				<select id="vehicleActive" bind:value={form.active} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value={true}>Visible sur le site</option>
					<option value={false}>Masqué</option>
				</select>
			</div>
			<div>
				<label for="vehicleBrand" class="mb-1 block text-sm font-medium text-gray-700">Marque</label>
				<input id="vehicleBrand" type="text" bind:value={form.brand} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Décathlon" />
			</div>
			<div>
				<label for="vehicleModel" class="mb-1 block text-sm font-medium text-gray-700">Modèle</label>
				<input id="vehicleModel" type="text" bind:value={form.model} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Rockrider ST 100" />
			</div>
			<div>
				<label for="vehicleColor" class="mb-1 block text-sm font-medium text-gray-700">Couleur</label>
				<input id="vehicleColor" type="text" bind:value={form.color} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Vert forêt" />
			</div>
			<div>
				<label for="vehicleColorHex" class="mb-1 block text-sm font-medium text-gray-700">Pastille de couleur</label>
				<div class="flex gap-2">
					<input id="vehicleColorHex" type="color" bind:value={form.colorHex} class="h-11 w-14 rounded-lg border border-gray-300 p-1" />
					<input type="text" bind:value={form.colorHex} class="w-full rounded-xl border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
			<h3 class="text-sm font-bold text-gray-900">Tarifs & stock</h3>
			<div class="mt-3 grid gap-3 sm:grid-cols-3">
				<div>
					<label for="priceHour" class="mb-1 block text-xs font-medium text-gray-600">Prix / heure ({currency})</label>
					<input id="priceHour" type="number" min="0" step="50" bind:value={form.pricePerHour} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="priceDay" class="mb-1 block text-xs font-medium text-gray-600">Prix / jour ({currency})</label>
					<input id="priceDay" type="number" min="0" step="100" bind:value={form.pricePerDay} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="vehicleDeposit" class="mb-1 block text-xs font-medium text-gray-600">Caution ({currency})</label>
					<input id="vehicleDeposit" type="number" min="0" step="500" bind:value={form.deposit} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="vehicleStock" class="mb-1 block text-xs font-medium text-gray-600">Stock total</label>
					<input id="vehicleStock" type="number" min="0" bind:value={form.stock} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="vehicleAvailable" class="mb-1 block text-xs font-medium text-gray-600">Disponibles</label>
					<input id="vehicleAvailable" type="number" min="0" bind:value={form.available} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
		</div>

		<div>
			<label for="vehicleDescription" class="mb-1 block text-sm font-medium text-gray-700">Description</label>
			<textarea id="vehicleDescription" bind:value={form.description} rows="3" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Parfait pour les sentiers de la forêt…"></textarea>
		</div>
		<div>
			<label for="vehicleEquipment" class="mb-1 block text-sm font-medium text-gray-700">Équipements inclus</label>
			<input id="vehicleEquipment" type="text" bind:value={form.equipmentText} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Casque, antivol, gourde" />
			<p class="mt-1 text-xs text-gray-400">Séparez les éléments par des virgules.</p>
		</div>

		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</Modal>
