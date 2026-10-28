<script>
	import { saveSettings, store } from '$lib/client/store.svelte.js';
	import { defaultGallery, defaultServices } from '$lib/defaults.js';
	import Icon from '../Icon.svelte';
	import ImagePicker from '../ImagePicker.svelte';

	const serviceIcons = [
		{ value: 'bike', label: 'Vélo' },
		{ value: 'wrench', label: 'Réparation' },
		{ value: 'shield', label: 'Protection' },
		{ value: 'tree', label: 'Balade / forêt' },
		{ value: 'clock', label: 'Horaires' },
		{ value: 'package', label: 'Accessoires' },
		{ value: 'sparkles', label: 'Offre' }
	];

	function clone(value) {
		return JSON.parse(JSON.stringify(value ?? {}));
	}

	let form = $state(clone(store.settings));
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);

	if (!Array.isArray(form.services) || !form.services.length) {
		form.services = clone(defaultServices);
	}
	if (!Array.isArray(form.gallery) || !form.gallery.length) {
		form.gallery = clone(defaultGallery);
	}

	function addService() {
		form.services.push({ title: '', description: '', icon: 'bike' });
	}

	function removeService(index) {
		form.services.splice(index, 1);
	}

	function addGalleryImage() {
		form.gallery.push({ url: '', caption: '' });
	}

	function removeGalleryImage(index) {
		form.gallery.splice(index, 1);
	}

	function resetServices() {
		if (!confirm('Remplacer les services par le contenu par défaut ?')) return;
		form.services = clone(defaultServices);
	}

	function resetGallery() {
		if (!confirm('Remplacer la galerie par les photos par défaut ?')) return;
		form.gallery = clone(defaultGallery);
	}

	async function saveSite(event) {
		event.preventDefault();
		error = '';
		notice = '';
		saving = true;
		try {
			const services = form.services
				.map((service) => ({
					title: String(service.title || '').trim(),
					description: String(service.description || '').trim(),
					icon: service.icon || 'sparkles'
				}))
				.filter((service) => service.title || service.description);

			const gallery = form.gallery
				.map((image) => ({
					url: String(image.url || '').trim(),
					caption: String(image.caption || '').trim()
				}))
				.filter((image) => image.url);

			await saveSettings({
				...form,
				shopName: String(form.shopName || '').trim() || 'MyBike Djo',
				heroTitle: String(form.heroTitle || '').trim(),
				heroSubtitle: String(form.heroSubtitle || '').trim(),
				services,
				gallery
			});
			notice = 'Page d’accueil enregistrée. Elle sera publiée au prochain passage en ligne.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={saveSite} class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Site public</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Page d’accueil</h1>
			<p class="mt-1 text-sm text-gray-500">Textes, photos, couleurs et coordonnées visibles par vos clients.</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a href="/" target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
				<Icon name="eye" class="h-4 w-4" /> Voir le site
			</a>
			<button type="submit" disabled={saving} class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}
	{#if notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">{notice}</div>
	{/if}

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="star" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Identité du shop</h2>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label for="shopName" class="mb-1 block text-sm font-medium text-gray-700">Nom du shop</label>
				<input id="shopName" type="text" bind:value={form.shopName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="shopTagline" class="mb-1 block text-sm font-medium text-gray-700">Slogan court</label>
				<input id="shopTagline" type="text" bind:value={form.tagline} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="primaryColor" class="mb-1 block text-sm font-medium text-gray-700">Couleur principale</label>
				<div class="flex gap-2">
					<input id="primaryColor" type="color" bind:value={form.primaryColor} class="h-11 w-14 rounded-lg border border-gray-300 p-1" />
					<input type="text" bind:value={form.primaryColor} class="w-full rounded-xl border-gray-300 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
			<div>
				<label for="accentColor" class="mb-1 block text-sm font-medium text-gray-700">Couleur d’accent</label>
				<div class="flex gap-2">
					<input id="accentColor" type="color" bind:value={form.accentColor} class="h-11 w-14 rounded-lg border border-gray-300 p-1" />
					<input type="text" bind:value={form.accentColor} class="w-full rounded-xl border-gray-300 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="home" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Bannière d’accueil</h2>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label for="heroBadge" class="mb-1 block text-sm font-medium text-gray-700">Petit badge</label>
				<input id="heroBadge" type="text" bind:value={form.heroBadge} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Forêt de Canastel · Oran" />
			</div>
			<div>
				<label for="heroCta" class="mb-1 block text-sm font-medium text-gray-700">Texte du bouton</label>
				<input id="heroCta" type="text" bind:value={form.heroCta} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Réserver maintenant" />
			</div>
			<div class="sm:col-span-2">
				<label for="heroTitle" class="mb-1 block text-sm font-medium text-gray-700">Titre principal</label>
				<input id="heroTitle" type="text" bind:value={form.heroTitle} class="w-full rounded-xl border-gray-300 text-lg font-bold focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="heroSubtitle" class="mb-1 block text-sm font-medium text-gray-700">Sous-titre</label>
				<textarea id="heroSubtitle" bind:value={form.heroSubtitle} rows="3" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
			</div>
		</div>
		<div class="mt-4">
			<ImagePicker bind:value={form.heroImage} label="Photo de bannière" help="Une photo de l’atelier ou d’une balade à Canastel. Format paysage conseillé." />
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="sparkles" class="h-5 w-5 text-amber-500" />
			<h2 class="text-base font-bold text-gray-900">Bandeau d’annonce</h2>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="promoText" class="mb-1 block text-sm font-medium text-gray-700">Texte affiché en haut du site</label>
				<input id="promoText" type="text" bind:value={form.promoText} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Offre de lancement : -20 %…" />
			</div>
			<div>
				<label for="promoCode" class="mb-1 block text-sm font-medium text-gray-700">Code à copier</label>
				<input id="promoCode" type="text" bind:value={form.promoCode} class="w-full rounded-xl border-gray-300 font-mono uppercase focus:border-emerald-500 focus:ring-emerald-500" placeholder="CANASTEL20" />
			</div>
			<div class="flex items-end">
				<label class="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
					<input type="checkbox" bind:checked={form.promoEnabled} class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
					Afficher le bandeau
				</label>
			</div>
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="user" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">À propos de Djo</h2>
		</div>
		<div class="mt-4 grid gap-4">
			<div>
				<label for="aboutTitle" class="mb-1 block text-sm font-medium text-gray-700">Titre</label>
				<input id="aboutTitle" type="text" bind:value={form.aboutTitle} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="aboutText" class="mb-1 block text-sm font-medium text-gray-700">Présentation</label>
				<textarea id="aboutText" bind:value={form.aboutText} rows="6" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
			</div>
		</div>
		<div class="mt-4">
			<ImagePicker bind:value={form.aboutImage} label="Photo de l’atelier" help="Affichée à côté de la présentation de Djo." />
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<Icon name="wrench" class="h-5 w-5 text-emerald-600" />
				<h2 class="text-base font-bold text-gray-900">Services</h2>
			</div>
			<div class="flex gap-2">
				<button type="button" class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50" onclick={resetServices}>Réinitialiser</button>
				<button type="button" class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800" onclick={addService}>+ Service</button>
			</div>
		</div>
		<div class="mt-4 space-y-3">
			{#each form.services as service, index}
				<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
					<div class="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
						<div>
							<label for="serviceTitle{index}" class="mb-1 block text-xs font-medium text-gray-600">Titre</label>
							<input id="serviceTitle{index}" type="text" bind:value={form.services[index].title} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
						</div>
						<div>
							<label for="serviceIcon{index}" class="mb-1 block text-xs font-medium text-gray-600">Icône</label>
							<select id="serviceIcon{index}" bind:value={form.services[index].icon} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500">
								{#each serviceIcons as item}
									<option value={item.value}>{item.label}</option>
								{/each}
							</select>
						</div>
						<div class="flex items-end">
							<button type="button" class="rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Retirer ce service" aria-label="Retirer ce service" onclick={() => removeService(index)}>
								<Icon name="trash" class="h-4 w-4" />
							</button>
						</div>
					</div>
					<div class="mt-2">
						<label for="serviceDescription{index}" class="mb-1 block text-xs font-medium text-gray-600">Description</label>
						<textarea id="serviceDescription{index}" bind:value={form.services[index].description} rows="2" class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"></textarea>
					</div>
				</div>
			{/each}
			{#if !form.services.length}
				<p class="text-sm text-gray-500">Aucun service. Le site utilisera le contenu par défaut.</p>
			{/if}
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<Icon name="eye" class="h-5 w-5 text-emerald-600" />
				<h2 class="text-base font-bold text-gray-900">Galerie photos</h2>
			</div>
			<div class="flex gap-2">
				<button type="button" class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50" onclick={resetGallery}>Réinitialiser</button>
				<button type="button" class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800" onclick={addGalleryImage}>+ Photo</button>
			</div>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			{#each form.gallery as image, index}
				<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
					<ImagePicker bind:value={form.gallery[index].url} label={`Photo ${index + 1}`} help="" />
					<div class="mt-2 flex items-end gap-2">
						<div class="flex-1">
							<label for="galleryCaption{index}" class="mb-1 block text-xs font-medium text-gray-600">Légende</label>
							<input id="galleryCaption{index}" type="text" bind:value={form.gallery[index].caption} class="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" placeholder="Les sentiers de Canastel" />
						</div>
						<button type="button" class="rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Retirer cette photo" aria-label="Retirer cette photo" onclick={() => removeGalleryImage(index)}>
							<Icon name="trash" class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
		{#if !form.gallery.length}
			<p class="mt-3 text-sm text-gray-500">Aucune photo. Le site utilisera la galerie par défaut.</p>
		{/if}
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="phone" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Contact & réseaux</h2>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label for="shopPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
				<input id="shopPhone" type="tel" bind:value={form.phone} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 00 00 00" />
			</div>
			<div>
				<label for="shopWhatsapp" class="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
				<input id="shopWhatsapp" type="tel" bind:value={form.whatsapp} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="213555000000" />
				<p class="mt-1 text-[11px] text-gray-400">Format international, sans + ni espaces (ex. 213555000000).</p>
			</div>
			<div>
				<label for="shopEmail" class="mb-1 block text-sm font-medium text-gray-700">Email public</label>
				<input id="shopEmail" type="email" bind:value={form.email} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="openingHours" class="mb-1 block text-sm font-medium text-gray-700">Horaires</label>
				<input id="openingHours" type="text" bind:value={form.openingHours} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Tous les jours · 09h00 – 19h00" />
			</div>
			<div class="sm:col-span-2">
				<label for="shopAddress" class="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
				<input id="shopAddress" type="text" bind:value={form.address} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="mapUrl" class="mb-1 block text-sm font-medium text-gray-700">Lien Google Maps</label>
				<input id="mapUrl" type="url" bind:value={form.mapUrl} class="w-full rounded-xl border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="instagram" class="mb-1 block text-sm font-medium text-gray-700">Instagram</label>
				<input id="instagram" type="url" bind:value={form.instagram} class="w-full rounded-xl border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" placeholder="https://instagram.com/…" />
			</div>
			<div>
				<label for="facebook" class="mb-1 block text-sm font-medium text-gray-700">Facebook</label>
				<input id="facebook" type="url" bind:value={form.facebook} class="w-full rounded-xl border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" placeholder="https://facebook.com/…" />
			</div>
		</div>
	</section>

	<div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
		<p class="text-xs text-gray-500">Les changements sont enregistrés sur cet appareil, puis publiés dès que la connexion revient.</p>
		<button type="submit" disabled={saving} class="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
			{saving ? 'Enregistrement…' : 'Enregistrer la page'}
		</button>
	</div>
</form>
