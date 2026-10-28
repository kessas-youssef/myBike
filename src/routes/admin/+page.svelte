<script>
	let user = $state(null);
	let vehicles = $state([]);
	let rentals = $state([]);
	let reservations = $state([]);
	let accessories = $state([]);
	let clients = $state([]);
	let activeTab = $state('vehicules');
	let loading = $state(true);

	// Edit modals
	let editingVehicle = $state(null);
	let editingAccessory = $state(null);
	let showAddVehicle = $state(false);
	let showAddAccessory = $state(false);

	$effect(() => {
		async function load() {
			const me = await fetch('/api/auth/me').then(r => r.json());
			if (!me.user || me.user.role !== 'admin') { window.location.href = '/login'; return; }
			user = me.user;
			await loadData();
			loading = false;
		}
		load();
	});

	async function loadData() {
		const [v, r, res, a, c] = await Promise.all([
			fetch('/api/vehicles').then(r => r.json()),
			fetch('/api/rentals').then(r => r.json()),
			fetch('/api/reservations').then(r => r.json()),
			fetch('/api/accessories').then(r => r.json()),
			fetch('/api/clients').then(r => r.json())
		]);
		vehicles = v;
		console.log(v);
		rentals = r;
		reservations = res;
		accessories = a;
		clients = c;
	}

	async function saveVehicle(e) {
		e.preventDefault();
		const form = new FormData(e.target);
		const data = Object.fromEntries(form.entries());
		data.pricePerHour = parseInt(data.pricePerHour);
		data.stock = parseInt(data.stock);
		data.available = parseInt(data.available);

		const method = data._id ? 'PUT' : 'POST';
		await fetch('/api/vehicles', {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		showAddVehicle = false;
		editingVehicle = null;
		await loadData();
	}

	async function deleteVehicle(id) {
		if (!confirm('Supprimer ce véhicule ?')) return;
		await fetch('/api/vehicles', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ _id: id })
		});
		await loadData();
	}

	async function saveAccessory(e) {
		e.preventDefault();
		const form = new FormData(e.target);
		const data = Object.fromEntries(form.entries());
		data.price = parseInt(data.price);
		data.stock = parseInt(data.stock);

		const method = data._id ? 'PUT' : 'POST';
		await fetch('/api/accessories', {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		showAddAccessory = false;
		editingAccessory = null;
		await loadData();
	}

	async function deleteAccessory(id) {
		if (!confirm('Supprimer cet accessoire ?')) return;
		await fetch('/api/accessories', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ _id: id })
		});
		await loadData();
	}

	async function updateRentalStatus(id, status) {
		await fetch('/api/rentals', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ _id: id, status })
		});
		await loadData();
	}

	async function updateReservationStatus(id, status) {
		await fetch('/api/reservations', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ _id: id, status })
		});
		await loadData();
	}

	const tabs = [
		{ id: 'vehicules', label: 'Véhicules', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
		{ id: 'accessoires', label: 'Accessoires', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
		{ id: 'locations', label: 'Locations', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
		{ id: 'reservations', label: 'Réservations', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ id: 'clients', label: 'Clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<div class="bg-emerald-700 text-white py-8 px-4">
		<div class="max-w-7xl mx-auto">
			<h1 class="text-3xl font-bold">Admin - MyBike Djo</h1>
			<p class="text-emerald-100 mt-1">Gérez votre inventaire, locations, réservations et clients</p>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 -mt-4">
		<!-- Tabs -->
		<div class="bg-white rounded-xl shadow-md p-2 mb-6 flex overflow-x-auto gap-1">
			{#each tabs as tab}
				<button onclick={() => activeTab = tab.id}
					class="flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition {activeTab === tab.id ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon}/></svg>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Vehicles Tab -->
		{#if activeTab === 'vehicules'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">Gestion des Véhicules</h2>
					<button onclick={() => { showAddVehicle = true; editingVehicle = null; }} class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
						+ Ajouter
					</button>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left text-gray-500">
								<th class="pb-3 font-medium">Nom</th>
								<th class="pb-3 font-medium">Type</th>
								<th class="pb-3 font-medium">Prix/h</th>
								<th class="pb-3 font-medium">Stock</th>
								<th class="pb-3 font-medium">Dispo</th>
								<th class="pb-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each vehicles as v}
								<tr class="border-b last:border-0 hover:bg-gray-50">
									<td class="py-3 font-medium text-gray-900">{v.name}</td>
									<td class="py-3"><span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{v.type === 'bike' ? 'Vélo' : 'Trottinette'}</span></td>
									<td class="py-3">{v.pricePerHour} DA</td>
									<td class="py-3">{v.stock}</td>
									<td class="py-3">
										<span class="{v.available > 0 ? 'text-emerald-600' : 'text-red-500'} font-medium">{v.available}</span>
									</td>
									<td class="py-3">
										<div class="flex gap-2">
											<button onclick={() => { editingVehicle = v; showAddVehicle = true; }} class="text-blue-600 hover:underline text-xs">Modifier</button>
											<button onclick={() => deleteVehicle(v._id)} class="text-red-600 hover:underline text-xs">Suppr.</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Vehicle Modal -->
			{#if showAddVehicle}
		
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showAddVehicle = false}>
		
			<div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
						<h2 class="text-xl font-bold text-gray-900 mb-4">{editingVehicle ? 'Modifier' : 'Ajouter'} un véhicule</h2>
						<form onsubmit={saveVehicle} class="space-y-4">
							<input type="hidden" name="_id" value={editingVehicle?._id || ''} />
							<div>
								<label for="vname" class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
								<input id="vname" type="text" name="name" value={editingVehicle?.name || ''} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="vtype" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
								<select id="vtype" name="type" value={editingVehicle?.type || 'bike'} class="w-full rounded-lg border-gray-300">
									<option value="bike">Vélo</option>
									<option value="trottinette">Trottinette</option>
								</select>
							</div>
							<div>
								<label for="vprice" class="block text-sm font-medium text-gray-700 mb-1">Prix par heure (DA)</label>
								<input id="vprice" type="number" name="pricePerHour" value={editingVehicle?.pricePerHour || 300} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="vstock" class="block text-sm font-medium text-gray-700 mb-1">Stock total</label>
								<input id="vstock" type="number" name="stock" value={editingVehicle?.stock || 1} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="vavail" class="block text-sm font-medium text-gray-700 mb-1">Disponibles</label>
								<input id="vavail" type="number" name="available" value={editingVehicle?.available || editingVehicle?.stock || 1} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="vimage" class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
								<input id="vimage" type="url" name="image" value={editingVehicle?.image || ''} class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="vdesc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea id="vdesc" name="description" rows="2" class="w-full rounded-lg border-gray-300">{editingVehicle?.description || ''}</textarea>
							</div>
							<div class="flex gap-3">
								<button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition">Enregistrer</button>
								<button type="button" onclick={() => showAddVehicle = false} class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Annuler</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

		<!-- Accessories Tab -->
		{:else if activeTab === 'accessoires'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">Gestion des Accessoires</h2>
					<button onclick={() => { showAddAccessory = true; editingAccessory = null; }} class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
						+ Ajouter
					</button>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left text-gray-500">
								<th class="pb-3 font-medium">Nom</th>
								<th class="pb-3 font-medium">Catégorie</th>
								<th class="pb-3 font-medium">Prix</th>
								<th class="pb-3 font-medium">Stock</th>
								<th class="pb-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each accessories as a}
								<tr class="border-b last:border-0 hover:bg-gray-50">
									<td class="py-3 font-medium text-gray-900">{a.name}</td>
									<td class="py-3"><span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{a.category}</span></td>
									<td class="py-3">{a.price} DA</td>
									<td class="py-3">{a.stock}</td>
									<td class="py-3">
										<div class="flex gap-2">
											<button onclick={() => { editingAccessory = a; showAddAccessory = true; }} class="text-blue-600 hover:underline text-xs">Modifier</button>
											<button onclick={() => deleteAccessory(a._id)} class="text-red-600 hover:underline text-xs">Suppr.</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			{#if showAddAccessory}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showAddAccessory = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="bg-white rounded-2xl p-6 w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
						<h2 class="text-xl font-bold text-gray-900 mb-4">{editingAccessory ? 'Modifier' : 'Ajouter'} un accessoire</h2>
						<form onsubmit={saveAccessory} class="space-y-4">
							<input type="hidden" name="_id" value={editingAccessory?._id || ''} />
							<div>
								<label for="aname" class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
								<input id="aname" type="text" name="name" value={editingAccessory?.name || ''} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="acat" class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
								<select id="acat" name="category" value={editingAccessory?.category || 'accessoire'} class="w-full rounded-lg border-gray-300">
									<option value="protection">Protection</option>
									<option value="securite">Sécurité</option>
									<option value="accessoire">Accessoire</option>
									<option value="outil">Outil</option>
									<option value="entretien">Entretien</option>
								</select>
							</div>
							<div>
								<label for="aprice" class="block text-sm font-medium text-gray-700 mb-1">Prix (DA)</label>
								<input id="aprice" type="number" name="price" value={editingAccessory?.price || 0} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div>
								<label for="astock" class="block text-sm font-medium text-gray-700 mb-1">Stock</label>
								<input id="astock" type="number" name="stock" value={editingAccessory?.stock || 1} required class="w-full rounded-lg border-gray-300" />
							</div>
							<div class="flex gap-3">
								<button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition">Enregistrer</button>
								<button type="button" onclick={() => showAddAccessory = false} class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Annuler</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

		<!-- Rentals Tab -->
		{:else if activeTab === 'locations'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-6">Gestion des Locations</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left text-gray-500">
								<th class="pb-3 font-medium">Client</th>
								<th class="pb-3 font-medium">Véhicule</th>
								<th class="pb-3 font-medium">Début</th>
								<th class="pb-3 font-medium">Fin</th>
								<th class="pb-3 font-medium">Total</th>
								<th class="pb-3 font-medium">Statut</th>
								<th class="pb-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each rentals as r}
								<tr class="border-b last:border-0 hover:bg-gray-50">
									<td class="py-3 font-medium text-gray-900">{r.clientName}</td>
									<td class="py-3">{r.vehicleName}</td>
									<td class="py-3 text-gray-600">{new Date(r.startTime).toLocaleString('fr-FR')}</td>
									<td class="py-3 text-gray-600">{new Date(r.endTime).toLocaleString('fr-FR')}</td>
									<td class="py-3 font-medium">{r.totalPrice} DA</td>
									<td class="py-3">
										<span class="text-xs font-medium px-2 py-1 rounded {r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : r.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}">
											{r.status === 'active' ? 'En cours' : r.status === 'completed' ? 'Terminée' : 'À venir'}
										</span>
									</td>
									<td class="py-3">
										{#if r.status === 'active'}
											<button onclick={() => updateRentalStatus(r._id, 'completed')} class="text-emerald-600 hover:underline text-xs font-medium">Terminer</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

		<!-- Reservations Tab -->
		{:else if activeTab === 'reservations'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-6">Gestion des Réservations</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left text-gray-500">
								<th class="pb-3 font-medium">Client</th>
								<th class="pb-3 font-medium">Véhicule</th>
								<th class="pb-3 font-medium">Date</th>
								<th class="pb-3 font-medium">Durée</th>
								<th class="pb-3 font-medium">Total</th>
								<th class="pb-3 font-medium">Statut</th>
								<th class="pb-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each reservations as res}
								<tr class="border-b last:border-0 hover:bg-gray-50">
									<td class="py-3 font-medium text-gray-900">{res.clientName}</td>
									<td class="py-3">{res.vehicleName}</td>
									<td class="py-3 text-gray-600">{new Date(res.date).toLocaleDateString('fr-FR')}</td>
									<td class="py-3">{res.hours}h</td>
									<td class="py-3 font-medium">{res.totalPrice} DA</td>
									<td class="py-3">
										<span class="text-xs font-medium px-2 py-1 rounded {res.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
											{res.status === 'pending' ? 'En attente' : res.status === 'confirmed' ? 'Confirmée' : 'Annulée'}
										</span>
									</td>
									<td class="py-3">
										<div class="flex gap-2">
											{#if res.status === 'pending'}
												<button onclick={() => updateReservationStatus(res._id, 'confirmed')} class="text-emerald-600 hover:underline text-xs font-medium">Confirmer</button>
												<button onclick={() => updateReservationStatus(res._id, 'cancelled')} class="text-red-600 hover:underline text-xs font-medium">Annuler</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

		<!-- Clients Tab -->
		{:else if activeTab === 'clients'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-6">Gestion des Clients</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left text-gray-500">
								<th class="pb-3 font-medium">Nom</th>
								<th class="pb-3 font-medium">Email</th>
								<th class="pb-3 font-medium">Téléphone</th>
								<th class="pb-3 font-medium">Inscrit le</th>
							</tr>
						</thead>
						<tbody>
							{#each clients as c}
								<tr class="border-b last:border-0 hover:bg-gray-50">
									<td class="py-3 font-medium text-gray-900">{c.name}</td>
									<td class="py-3 text-gray-600">{c.email}</td>
									<td class="py-3 text-gray-600">{c.phone || '-'}</td>
									<td class="py-3 text-gray-600">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>
