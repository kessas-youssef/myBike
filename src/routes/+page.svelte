<script>
	import { onMount } from 'svelte';
	import { defaultGallery, defaultServices } from '$lib/defaults.js';
	import { loadPublic, publicStore } from '$lib/client/public.svelte.js';
	import { formatMoney, phoneHref, whatsappHref } from '$lib/format.js';
	import { osmEmbedUrl } from '$lib/geo.js';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let copied = $state('');

	onMount(() => {
		loadPublic();
	});

	const settings = $derived(publicStore.settings);
	const services = $derived(settings.services?.length ? settings.services : defaultServices);
	const gallery = $derived(settings.gallery?.length ? settings.gallery : defaultGallery);
	const vehicles = $derived((publicStore.vehicles || []).filter((v) => v.active !== false));
	const accessories = $derived((publicStore.accessories || []).filter((a) => a.active !== false));
	const promotions = $derived((publicStore.promotions || []).filter((p) => p.active !== false));
	const primary = $derived(settings.primaryColor || '#047857');
	const accent = $derived(settings.accentColor || '#facc15');
	const wa = $derived(
		whatsappHref(settings.whatsapp, `Bonjour ${settings.shopName || 'MyBike Djo'}, je voudrais des informations.`)
	);
	const mapEmbed = $derived(osmEmbedUrl(settings.shopLocation || { lat: 35.7256, lng: -0.585 }, 14));

	const serviceIcons = {
		bike: 'bike',
		wrench: 'wrench',
		shield: 'shield',
		tree: 'tree',
		clock: 'clock',
		package: 'package'
	};

	async function copyCode(code) {
		try {
			await navigator.clipboard.writeText(code);
			copied = code;
			setTimeout(() => (copied = ''), 2000);
		} catch {
			copied = '';
		}
	}
</script>

<svelte:head>
	<title>{settings.shopName || 'MyBike Djo'} — Location & réparation à Canastel, Oran</title>
	<meta
		name="description"
		content={settings.heroSubtitle ||
			'Location, réparation et accessoires de vélos et trottinettes électriques à la forêt de Canastel, Oran.'}
	/>
</svelte:head>

<!-- Hero -->
<section class="relative isolate overflow-hidden bg-gray-950 text-white">
	<img
		src={settings.heroImage || '/images/workshop.jpg'}
		alt="Atelier MyBike Djo à Canastel"
		class="absolute inset-0 h-full w-full object-cover opacity-60"
		onerror={(event) => (event.currentTarget.src = '/images/workshop.jpg')}
	/>
	<div class="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/65 to-gray-950/20"></div>
	<div class="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent"></div>

	<div class="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-36">
		<div class="max-w-3xl">
			<span class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
				<Icon name="location" class="h-4 w-4" />
				{settings.heroBadge || 'Forêt de Canastel · Oran'}
			</span>

			<h1 class="mt-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
				{settings.heroTitle || 'Roulez librement avec MyBike Djo'}
			</h1>
			<p class="mt-5 max-w-2xl text-lg leading-relaxed text-gray-200 sm:text-xl">
				{settings.heroSubtitle ||
					'Location, réparation et accessoires de vélos & trottinettes électriques au cœur de la forêt de Canastel, à Oran.'}
			</p>

			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href="/reserver"
					class="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-black text-gray-950 shadow-lg transition hover:brightness-105"
					style="background-color: {accent}"
				>
					{settings.heroCta || 'Réserver maintenant'}
					<Icon name="arrow" class="h-5 w-5" />
				</a>
				<a
					href="/#vehicules"
					class="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15"
				>
					Voir les tarifs
				</a>
				{#if wa}
					<a
						href={wa}
						target="_blank"
						rel="noreferrer"
						class="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-6 py-3.5 text-base font-semibold text-emerald-100 backdrop-blur transition hover:bg-emerald-500/25"
					>
						<Icon name="whatsapp" class="h-5 w-5" />
						WhatsApp
					</a>
				{/if}
			</div>

			<div class="mt-10 grid max-w-2xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<div class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
					<p class="font-bold text-white">Dès 250 DA</p>
					<p class="text-xs text-gray-300">location à l’heure</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
					<p class="font-bold text-white">Casque & antivol</p>
					<p class="text-xs text-gray-300">sur demande</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
					<p class="font-bold text-white">Réparation</p>
					<p class="text-xs text-gray-300">souvent le jour même</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
					<p class="font-bold text-white">Canastel</p>
					<p class="text-xs text-gray-300">départ forêt</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Promo banner -->
{#if settings.promoEnabled && settings.promoText}
	<div class="border-b border-amber-200 bg-amber-50">
		<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-3 text-center text-sm font-medium text-amber-900">
			<Icon name="sparkles" class="h-4 w-4" />
			<span>{settings.promoText}</span>
			{#if settings.promoCode}
				<button
					type="button"
					class="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-bold tracking-wide text-amber-800 hover:bg-amber-100"
					onclick={() => copyCode(settings.promoCode)}
				>
					{copied === settings.promoCode ? 'Copié !' : settings.promoCode}
				</button>
			{/if}
		</div>
	</div>
{/if}

<!-- Services -->
<section id="services" class="bg-gray-50 py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">Nos services</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
				Tout pour rouler l’esprit tranquille
			</h2>
			<p class="mt-3 text-gray-600">
				Du simple réglage de freins à la location pour la journée, Djo s’occupe de tout.
			</p>
		</div>

		<div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each services as service}
				<div class="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
					<span class="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm" style="background-color: {primary}">
						<Icon name={serviceIcons[service.icon] || 'sparkles'} class="h-6 w-6" />
					</span>
					<h3 class="mt-4 text-lg font-bold text-gray-900">{service.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-gray-600">{service.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Promotions -->
{#if promotions.length}
	<section class="bg-white py-16">
		<div class="mx-auto max-w-7xl px-4">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">En ce moment</p>
					<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900">Les offres du shop</h2>
				</div>
				<a href="/reserver" class="text-sm font-semibold hover:underline" style="color: {primary}">
					Profiter d’une offre →
				</a>
			</div>
			<div class="mt-8 grid gap-5 md:grid-cols-2">
				{#each promotions as promo}
					<div class="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm md:flex">
						{#if promo.image}
							<img
								src={promo.image}
								alt={promo.title}
								class="h-40 w-full object-cover md:h-auto md:w-44"
								onerror={(event) => (event.currentTarget.style.display = 'none')}
							/>
						{/if}
						<div class="flex-1 p-5">
							<div class="flex items-start justify-between gap-3">
								<h3 class="text-lg font-bold text-gray-900">{promo.title}</h3>
								{#if promo.discountValue}
									<span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-black text-white" style="background-color: {primary}">
										{promo.discountType === 'percent'
											? `-${promo.discountValue}%`
											: `-${formatMoney(promo.discountValue)}`}
									</span>
								{/if}
							</div>
							<p class="mt-2 text-sm text-gray-600">{promo.description}</p>
							{#if promo.code}
								<button
									type="button"
									class="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-bold tracking-wide text-gray-800 hover:border-gray-400"
									onclick={() => copyCode(promo.code)}
								>
									Code : {copied === promo.code ? 'copié !' : promo.code}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Vehicles -->
<section id="vehicules" class="bg-gray-50 py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">La flotte</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Nos véhicules</h2>
			<p class="mt-3 text-gray-600">Des tarifs clairs, sans surprise. Réservez en ligne, récupérez sur place.</p>
		</div>

		{#if vehicles.length}
			<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each vehicles as vehicle}
					<article class="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
						<div class="relative h-52 overflow-hidden bg-gray-100">
							<img
								src={vehicle.image || '/images/bike-mountain.jpg'}
								alt={vehicle.name}
								class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
								onerror={(event) => (event.currentTarget.src = '/images/bike-mountain.jpg')}
							/>
							<div class="absolute left-3 top-3 flex gap-2">
								<span class="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-800 shadow-sm">
									{vehicle.type === 'trottinette' ? 'Trottinette' : 'Vélo'}
								</span>
								{#if vehicle.color}
									<span class="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
										<span class="h-2.5 w-2.5 rounded-full border border-gray-300" style="background-color: {vehicle.colorHex || '#9ca3af'}"></span>
										{vehicle.color}
									</span>
								{/if}
							</div>
							{#if Number(vehicle.available) > 0}
								<span class="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
									{vehicle.available} dispo
								</span>
							{:else}
								<span class="absolute right-3 top-3 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
									Complet
								</span>
							{/if}
						</div>

						<div class="flex flex-1 flex-col p-5">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-lg font-bold text-gray-900">{vehicle.name}</h3>
									{#if vehicle.brand || vehicle.model}
										<p class="text-xs text-gray-500">{[vehicle.brand, vehicle.model].filter(Boolean).join(' · ')}</p>
									{/if}
								</div>
							</div>
							<p class="mt-2 line-clamp-2 text-sm text-gray-600">{vehicle.description}</p>

							{#if vehicle.equipment?.length}
								<div class="mt-3 flex flex-wrap gap-1.5">
									{#each vehicle.equipment.slice(0, 4) as item}
										<span class="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">{item}</span>
									{/each}
								</div>
							{/if}

							<div class="mt-4 flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
								<div>
									<p class="text-2xl font-black" style="color: {primary}">
										{formatMoney(vehicle.pricePerHour)}
										<span class="text-xs font-medium text-gray-500">/h</span>
									</p>
									{#if vehicle.pricePerDay}
										<p class="text-xs text-gray-500">{formatMoney(vehicle.pricePerDay)} / jour</p>
									{/if}
								</div>
								{#if vehicle.deposit}
									<p class="text-right text-[11px] text-gray-400">Caution<br />{formatMoney(vehicle.deposit)}</p>
								{/if}
							</div>

							<a
								href="/reserver?vehicle={vehicle._id}"
								class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 {Number(vehicle.available) < 1 ? 'pointer-events-none opacity-50' : ''}"
								style="background-color: {primary}"
							>
								Réserver ce véhicule
								<Icon name="arrow" class="h-4 w-4" />
							</a>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="mt-10">
				<EmptyState icon="bike" title="La flotte arrive bientôt" description="Contactez Djo pour connaître les vélos disponibles." />
			</div>
		{/if}
	</div>
</section>

<!-- Accessories -->
<section class="bg-white py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">Le shop</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900">Accessoires & pièces</h2>
				<p class="mt-2 text-gray-600">Tout ce qu’il faut pour rouler en sécurité.</p>
			</div>
			<a href="/reparer" class="text-sm font-semibold hover:underline" style="color: {primary}">
				Besoin d’un conseil ? →
			</a>
		</div>

		{#if accessories.length}
			<div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each accessories as accessory}
					<div class="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center transition hover:bg-white hover:shadow-md">
						{#if accessory.image}
							<img src={accessory.image} alt={accessory.name} class="mx-auto h-20 w-20 rounded-xl object-cover" />
						{:else}
							<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-gray-500 shadow-sm">
								<Icon name={accessory.category === 'protection' ? 'shield' : accessory.category === 'securite' ? 'lock' : 'package'} class="h-6 w-6" />
							</span>
						{/if}
						<h3 class="mt-3 text-sm font-bold text-gray-900">{accessory.name}</h3>
						<p class="mt-1 text-sm font-black" style="color: {primary}">{formatMoney(accessory.price)}</p>
						<p class="mt-1 text-[11px] text-gray-400">Stock : {accessory.stock ?? '—'}</p>
					</div>
				{/each}
			</div>
		{:else}
			<div class="mt-8">
				<EmptyState icon="package" title="Accessoires bientôt en ligne" description="Passez au shop pour découvrir le stock." />
			</div>
		{/if}
	</div>
</section>

<!-- About -->
<section class="overflow-hidden bg-gray-950 py-20 text-white">
	<div class="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
		<div class="relative">
			<div class="absolute -inset-3 rounded-3xl bg-white/5 blur-xl"></div>
			<img
				src={settings.aboutImage || '/images/workshop.jpg'}
				alt={settings.aboutTitle || 'L’atelier de Djo'}
				class="relative h-80 w-full rounded-3xl object-cover shadow-2xl sm:h-[28rem]"
				onerror={(event) => (event.currentTarget.src = '/images/workshop.jpg')}
			/>
		</div>
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {accent}">Le shop</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
				{settings.aboutTitle || 'Djo, votre mécanicien de quartier'}
			</h2>
			<p class="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-300">
				{settings.aboutText}
			</p>
			<ul class="mt-6 grid gap-3 text-sm text-gray-200 sm:grid-cols-2">
				<li class="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
					<Icon name="check" class="h-4 w-4 text-emerald-400" /> Diagnostic honnête
				</li>
				<li class="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
					<Icon name="check" class="h-4 w-4 text-emerald-400" /> Pièces et accessoires
				</li>
				<li class="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
					<Icon name="check" class="h-4 w-4 text-emerald-400" /> Location au départ de la forêt
				</li>
				<li class="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
					<Icon name="check" class="h-4 w-4 text-emerald-400" /> Accueil en français & arabe
				</li>
			</ul>
			<div class="mt-7 flex flex-wrap gap-3">
				<a href="/reserver" class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-gray-950" style="background-color: {accent}">
					Réserver
					<Icon name="arrow" class="h-4 w-4" />
				</a>
				{#if wa}
					<a href={wa} target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
						<Icon name="whatsapp" class="h-4 w-4" /> Écrire à Djo
					</a>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- Gallery -->
<section class="bg-white py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">En images</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900">Le shop & la forêt</h2>
			<p class="mt-3 text-gray-600">Quelques repères avant de venir nous voir.</p>
		</div>
		<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each gallery as image, index}
				<figure class="group relative overflow-hidden rounded-2xl bg-gray-100 {index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}">
					<img
						src={image.url}
						alt={image.caption || 'MyBike Djo'}
						class="h-56 w-full object-cover transition duration-500 group-hover:scale-105 {index === 0 ? 'sm:h-full' : ''}"
						onerror={(event) => (event.currentTarget.src = '/images/workshop.jpg')}
					/>
					{#if image.caption}
						<figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/80 to-transparent p-4 text-xs font-medium text-white">
							{image.caption}
						</figcaption>
					{/if}
				</figure>
			{/each}
		</div>
	</div>
</section>

<!-- Repair CTA -->
<section class="bg-gray-50 py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 lg:flex">
			<div class="flex-1 p-7 sm:p-10">
				<span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
					<Icon name="wrench" class="h-4 w-4" /> Atelier
				</span>
				<h2 class="mt-4 text-3xl font-black tracking-tight text-gray-900">Une panne ? Un bruit suspect ?</h2>
				<p class="mt-3 max-w-xl text-gray-600">
					Décrivez le problème en ligne. Djo vous rappelle pour un diagnostic et un devis. Vous pouvez déposer
					le vélo directement au shop, à l’entrée de la forêt de Canastel.
				</p>
				<div class="mt-6 flex flex-wrap gap-3">
					<a href="/reparer" class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white" style="background-color: {primary}">
						Demander une réparation
						<Icon name="arrow" class="h-4 w-4" />
					</a>
					<a href={phoneHref(settings.phone)} class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
						<Icon name="phone" class="h-4 w-4" /> Appeler
					</a>
				</div>
			</div>
			<div class="grid flex-1 grid-cols-2 gap-3 bg-gray-50 p-6 sm:p-8">
				{#each ['Freins', 'Chaîne', 'Pneus', 'Batterie', 'Réglage', 'Diagnostic'] as item}
					<div class="rounded-xl border border-gray-100 bg-white px-3 py-4 text-center text-sm font-semibold text-gray-700 shadow-sm">{item}</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Contact -->
<section id="contact" class="bg-white py-20">
	<div class="mx-auto max-w-7xl px-4">
		<div class="grid gap-8 lg:grid-cols-2">
			<div>
				<p class="text-xs font-bold uppercase tracking-[0.2em]" style="color: {primary}">Nous trouver</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-gray-900">Venez au shop</h2>
				<p class="mt-3 text-gray-600">
					Le shop se trouve à l’entrée de la forêt de Canastel, à Oran. Un bon point de départ pour une balade
					à vélo ou en trottinette.
				</p>

				<div class="mt-6 grid gap-3">
					<a href={settings.mapUrl || mapEmbed} target="_blank" rel="noreferrer" class="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:bg-gray-100">
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gray-700 shadow-sm"><Icon name="location" class="h-5 w-5" /></span>
						<span>
							<span class="block text-sm font-bold text-gray-900">Adresse</span>
							<span class="mt-0.5 block text-sm text-gray-600">{settings.address || 'Forêt de Canastel, Oran, Algérie'}</span>
						</span>
					</a>
					<a href={phoneHref(settings.phone)} class="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:bg-gray-100">
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gray-700 shadow-sm"><Icon name="phone" class="h-5 w-5" /></span>
						<span>
							<span class="block text-sm font-bold text-gray-900">Téléphone</span>
							<span class="mt-0.5 block text-sm text-gray-600">{settings.phone || '—'}</span>
						</span>
					</a>
					<div class="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gray-700 shadow-sm"><Icon name="clock" class="h-5 w-5" /></span>
						<span>
							<span class="block text-sm font-bold text-gray-900">Horaires</span>
							<span class="mt-0.5 block text-sm text-gray-600">{settings.openingHours || 'Tous les jours'}</span>
						</span>
					</div>
				</div>

				{#if wa}
					<a href={wa} target="_blank" rel="noreferrer" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500">
						<Icon name="whatsapp" class="h-4 w-4" /> Discuter sur WhatsApp
					</a>
				{/if}
			</div>

			<div class="min-h-80 overflow-hidden rounded-3xl border border-gray-100 bg-gray-100 shadow-sm">
				<iframe
					title="Carte du shop MyBike Djo à Canastel"
					src={mapEmbed}
					class="h-full min-h-80 w-full"
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
				></iframe>
			</div>
		</div>
	</div>
</section>
