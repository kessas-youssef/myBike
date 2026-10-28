<script>
	import images from '$lib/images.js';

	let vehicles = $state([]);
	let accessories = $state([]);

	$effect(() => {
		async function load() {
			const [v, a] = await Promise.all([
				fetch('/api/vehicles').then(r => r.json()),
				fetch('/api/accessories').then(r => r.json())
			]);
			vehicles = v;
			accessories = a;
		}
		load();
	});
</script>

<!-- Hero -->
<section class="relative bg-[url('https://s3.ca-central-1.amazonaws.com/cdn.bixi.com/wp-content/uploads/2024/07/DSCF8113-e1721932837623.jpg')] bg-center text-white">
	<div class="absolute inset-0 bg-black/30"></div>
	<div class="relative max-w-7xl mx-auto px-4 py-24 md:py-36">
		<div class="max-w-3xl">
			<h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">
				Bougez librement avec <span class="text-yellow-300">MyBike Djo</span>
			</h1>
			<p class="text-xl md:text-2xl mb-8 text-gray-100">
				Location, réparation et accessoires de vélos & trottinettes électriques à Alger.
			</p>
			<div class="flex flex-wrap gap-4">
				<a href="/reserver" class="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-yellow-300 transition shadow-lg">
					Réserver maintenant
				</a>
				<a href="/#services" class="bg-white/20 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-white/30 transition backdrop-blur-sm">
					Nos services
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Services -->
<section id="services" class="py-20 bg-gray-50">
	<div class="max-w-7xl mx-auto px-4">
		<h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Nos Services</h2>
		<p class="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Tout ce qu'il vous faut pour vos déplacements, du loisir au quotidien</p>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<div class="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition">
				<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
				</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Location</h3>
				<p class="text-gray-600">Vélos à 300 DA/h et trottinettes électriques à 800 DA/h. À l'heure, à la journée ou plus.</p>
			</div>
			<div class="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition">
				<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
				</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Réparation</h3>
				<p class="text-gray-600">Réparation et entretien de vélos et trottinettes. Djo s'occupe de tout.</p>
			</div>
			<div class="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition">
				<div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
				</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Accessoires</h3>
				<p class="text-gray-600">Casques, gants, antivols, lumières et tout l'équipement nécessaire.</p>
			</div>
		</div>
	</div>
</section>

<!-- Tarifs / Véhicules -->
<section id="tarifs" class="py-20 bg-white">
	<div class="max-w-7xl mx-auto px-4">
		<h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Nos Véhicules</h2>
		<p class="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Des tarifs transparents et compétitifs</p>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each vehicles as v}
				<div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition">
					<div class="h-48 bg-gray-200 overflow-hidden">
						<img src={v.image} alt={v.name} class="w-full h-full object-cover hover:scale-105 transition duration-500"
							onerror={(e) => e.target.src = 'https://placehold.co/400x300?text=MyBike'} />
					</div>
					<div class="p-5">
						<div class="flex justify-between items-start mb-2">
							<h3 class="font-bold text-lg text-gray-900">{v.name}</h3>
							<span class="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded">
								{v.type === 'bike' ? 'Vélo' : 'Trottinette'}
							</span>
						</div>
						<p class="text-gray-600 text-sm mb-3">{v.description}</p>
						<div class="flex justify-between items-center">
							<span class="text-2xl font-bold text-emerald-600">{v.pricePerHour} DA<span class="text-sm text-gray-500 font-normal">/h</span></span>
							<span class="text-sm text-gray-500">{v.available}/{v.stock} dispo</span>
						</div>
						<a href="/reserver" class="mt-4 block text-center bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium text-sm">
							Louer
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Accessoires -->
<section class="py-20 bg-gray-50">
	<div class="max-w-7xl mx-auto px-4">
		<h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Accessoires</h2>
		<p class="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Équipez-vous pour rouler en toute sécurité</p>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each accessories as a}
				<div class="bg-white rounded-xl p-5 shadow border border-gray-100 text-center hover:shadow-md transition">
					<div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
						<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
					</div>
					<h4 class="font-semibold text-gray-900 text-sm">{a.name}</h4>
					<p class="text-emerald-600 font-bold mt-1">{a.price} DA</p>
					<p class="text-xs text-gray-500 mt-1">Stock: {a.stock}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Galerie -->
<section class="py-20 bg-white">
	<div class="max-w-7xl mx-auto px-4">
		<h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Galerie</h2>
		<p class="text-gray-600 text-center mb-12">Un aperçu de notre univers</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each images as img}
				<div class="rounded-2xl overflow-hidden shadow-lg group">
					<img src={img.url} alt={img.desc} class="w-full h-72 object-cover group-hover:scale-105 transition duration-500"
						onerror={(e) => e.target.src = 'https://placehold.co/800x600?text=MyBike+Djo'} />
					<div class="p-4 bg-gray-50">
						<p class="text-gray-700 text-sm italic">"{img.desc}"</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="py-20 bg-gradient-to-r from-emerald-700 to-teal-600 text-white">
	<div class="max-w-4xl mx-auto px-4 text-center">
		<h2 class="text-3xl md:text-4xl font-bold mb-6">Prêt à rouler ?</h2>
		<p class="text-xl mb-8 text-gray-100">Réservez dès maintenant et venez récupérer votre vélo ou trottinette chez Djo.</p>
		<a href="/reserver" class="inline-block bg-yellow-400 text-gray-900 px-10 py-4 rounded-xl font-bold text-xl hover:bg-yellow-300 transition shadow-lg">
			Réserver maintenant
		</a>
	</div>
</section>
