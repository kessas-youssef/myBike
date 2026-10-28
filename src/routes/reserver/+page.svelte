<script>
	let vehicles = $state([]);
	let selectedVehicle = $state(null);
	let hours = $state(1);
	let date = $state(new Date().toISOString().split('T')[0]);
	let showAuthModal = $state(false);
	let totalPrice = $state(0);
	let success = $state('');
	let error = $state('');

	$effect(() => {
		fetch('/api/vehicles').then(r => r.json()).then(data => {
			vehicles = data;
			if (data.length > 0) selectVehicle(data[0]);
		});
	});

	function selectVehicle(v) {
		selectedVehicle = v;
		calculateTotal();
	}

	function calculateTotal() {
		if (selectedVehicle) totalPrice = selectedVehicle.pricePerHour * hours;
	}

	async function handleReserve(e) {
		e.preventDefault();
		if (!selectedVehicle) return;
		error = '';
		success = '';

		const res = await fetch('/api/auth/me');
		const { user } = await res.json();
		if (!user) { showAuthModal = true; return; }

		const r = await fetch('/api/reservations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ vehicleId: selectedVehicle._id, date, hours: parseInt(hours) })
		});
		const data = await r.json();
		if (!r.ok) { error = data.error; return; }

		success = `Réservation confirmée ! Total : ${data.totalPrice} DA. Rendez-vous chez Djo le ${new Date(date).toLocaleDateString('fr-FR')}.`;
	}
</script>

<div class="min-h-[80vh] bg-gray-50 py-12 px-4">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Réserver un véhicule</h1>
		<p class="text-gray-600 mb-8">Choisissez votre véhicule, la durée et la date de location</p>

		{#if success}
			<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-xl mb-8">
				<p class="font-semibold text-lg">✅ {success}</p>
				<p class="mt-2">Vous pouvez suivre votre réservation depuis votre <a href="/dashboard" class="underline font-medium">tableau de bord</a>.</p>
			</div>
		{/if}

		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-8">{error}</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			{#each vehicles as v}
				<button onclick={() => selectVehicle(v)}
					class="text-left bg-white rounded-xl shadow-md overflow-hidden border-2 transition {selectedVehicle?._id === v._id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent hover:border-gray-300'}">
					<div class="h-40 bg-gray-200 overflow-hidden">
						<img src={v.image} alt={v.name} class="w-full h-full object-cover"
							onerror={(e) => e.target.src = 'https://placehold.co/400x300?text=MyBike'} />
					</div>
					<div class="p-4">
						<div class="flex justify-between items-start">
							<h3 class="font-bold text-gray-900">{v.name}</h3>
							<span class="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded">{v.type === 'bike' ? 'Vélo' : 'Trottinette'}</span>
						</div>
						<p class="text-2xl font-bold text-emerald-600 mt-2">{v.pricePerHour} DA<span class="text-sm text-gray-500 font-normal">/h</span></p>
						<p class="text-sm text-gray-500 mt-1">{v.available} disponibles sur {v.stock}</p>
					</div>
				</button>
			{/each}
		</div>

		<form onsubmit={handleReserve} class="bg-white rounded-xl shadow-lg p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Détails de la réservation</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div>
			<label for="hours" class="block text-sm font-medium text-gray-700 mb-1">Durée (heures)</label>
			<input id="hours" type="number" bind:value={hours} min="1" max="24" oninput={calculateTotal}
				class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
		</div>
		<div>
			<label for="rdate" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
			<input id="rdate" type="date" bind:value={date}
				class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div class="flex items-end">
					<div class="w-full bg-gray-50 rounded-lg p-3 text-center">
						<p class="text-sm text-gray-500">Total estimé</p>
						<p class="text-2xl font-bold text-emerald-600">{totalPrice} DA</p>
					</div>
				</div>
			</div>
			<button type="submit" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 transition">
				Réserver maintenant
			</button>
		</form>
	</div>
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showAuthModal = false}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="bg-white rounded-2xl p-8 max-w-md w-full" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h2>
			<p class="text-gray-600 mb-6">Vous devez être connecté pour effectuer une réservation.</p>
			<div class="flex gap-4">
				<a href="/login" class="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-center font-medium hover:bg-emerald-700 transition">Se connecter</a>
				<a href="/register" class="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl text-center font-medium hover:bg-gray-300 transition">S'inscrire</a>
			</div>
			<button onclick={() => showAuthModal = false} class="mt-4 w-full text-gray-500 text-sm hover:underline">Fermer</button>
		</div>
	</div>
{/if}
