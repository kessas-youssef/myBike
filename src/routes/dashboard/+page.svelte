<script>
	let user = $state(null);
	let rentals = $state([]);
	let reservations = $state([]);
	let loading = $state(true);

	$effect(() => {
		async function load() {
			const me = await fetch('/api/auth/me').then(r => r.json());
			if (!me.user) { window.location.href = '/login'; return; }
			user = me.user;

			const [r, res] = await Promise.all([
				fetch('/api/rentals').then(r => r.json()),
				fetch('/api/reservations').then(r => r.json())
			]);
			rentals = r;
			reservations = res;
			loading = false;
		}
		load();
	});

	function timeLeft(endTime) {
		const now = new Date();
		const end = new Date(endTime);
		const diff = end - now;
		if (diff <= 0) return 'Terminé';
		const h = Math.floor(diff / 3600000);
		const m = Math.floor((diff % 3600000) / 60000);
		const s = Math.floor((diff % 60000) / 1000);
		return `${h}h ${m}m ${s}s`;
	}

	let now = $state(Date.now());
	$effect(() => {
		const interval = setInterval(() => now = Date.now(), 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="min-h-[80vh] bg-gray-50 py-8 px-4">
	<div class="max-w-5xl mx-auto">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Bonjour, {user?.name} !</h1>
			<p class="text-gray-600">Bienvenue sur votre tableau de bord MyBike Djo</p>
		</div>

		<!-- Active Rental Timer -->
		{#each rentals as rental}
			{#if rental.status === 'active'}
				<div class="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl shadow-lg p-6 md:p-8 text-white mb-8">
					<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div>
							<p class="text-sm text-emerald-100 font-medium">Location en cours</p>
							<h2 class="text-2xl font-bold">{rental.vehicleName}</h2>
							<p class="text-emerald-100">Démarré le {new Date(rental.startTime).toLocaleString('fr-FR')}</p>
						</div>
						<div class="text-center">
							<p class="text-sm text-emerald-100">Temps restant</p>
							<p class="text-4xl md:text-5xl font-bold tabular-nums">{timeLeft(rental.endTime)}</p>
							<p class="text-sm text-emerald-100 mt-1">Total: {rental.totalPrice} DA</p>
						</div>
					</div>
				</div>
			{/if}
		{/each}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Reservations -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4">Mes Réservations</h2>
				{#if reservations.length === 0}
					<p class="text-gray-500">Aucune réservation pour le moment.</p>
					<a href="/reserver" class="mt-3 inline-block text-emerald-600 font-medium hover:underline">Réserver maintenant →</a>
				{:else}
					<div class="space-y-3">
						{#each reservations as res}
							<div class="border rounded-lg p-4 {res.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}">
								<div class="flex justify-between items-start">
									<div>
										<p class="font-semibold text-gray-900">{res.vehicleName}</p>
										<p class="text-sm text-gray-600">{new Date(res.date).toLocaleDateString('fr-FR')} - {res.hours}h</p>
									</div>
									<span class="text-xs font-medium px-2 py-1 rounded {res.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">
										{res.status === 'pending' ? 'En attente' : 'Confirmée'}
									</span>
								</div>
								<p class="text-sm text-gray-500 mt-1">{res.totalPrice} DA</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Rental History -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4">Historique des Locations</h2>
				{#if rentals.length === 0}
					<p class="text-gray-500">Aucune location pour le moment.</p>
				{:else}
					<div class="space-y-3">
						{#each rentals as rental}
							<div class="border rounded-lg p-4 {rental.status === 'active' ? 'border-emerald-200 bg-emerald-50' : rental.status === 'completed' ? 'border-gray-200' : 'border-blue-200 bg-blue-50'}">
								<div class="flex justify-between items-start">
									<div>
										<p class="font-semibold text-gray-900">{rental.vehicleName}</p>
										<p class="text-sm text-gray-600">{new Date(rental.startTime).toLocaleDateString('fr-FR')} - {rental.hours}h</p>
									</div>
									<span class="text-xs font-medium px-2 py-1 rounded {rental.status === 'active' ? 'bg-emerald-200 text-emerald-800' : rental.status === 'completed' ? 'bg-gray-200 text-gray-700' : 'bg-blue-200 text-blue-800'}">
										{rental.status === 'active' ? 'En cours' : rental.status === 'completed' ? 'Terminée' : 'À venir'}
									</span>
								</div>
								<p class="text-sm text-gray-500 mt-1">{rental.totalPrice} DA</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
