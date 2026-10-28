<script>
	import { defaultSettings } from '$lib/defaults.js';
	import { phoneHref, whatsappHref } from '$lib/format.js';
	import Icon from './Icon.svelte';

	let { settings = defaultSettings } = $props();

	const shopName = $derived(settings?.shopName || 'MyBike Djo');
	const primary = $derived(settings?.primaryColor || '#047857');
	const wa = $derived(whatsappHref(settings?.whatsapp, `Bonjour ${shopName}, je voudrais des informations.`));
</script>

<footer class="bg-gray-950 text-gray-300">
	<div class="mx-auto max-w-7xl px-4 py-14">
		<div class="grid gap-10 md:grid-cols-4">
			<div class="md:col-span-2">
				<div class="flex items-center gap-2.5">
					<span class="grid h-10 w-10 place-items-center rounded-xl text-white" style="background-color: {primary}">
						<Icon name="bike" class="h-5 w-5" />
					</span>
					<span class="text-xl font-black text-white">{shopName}</span>
				</div>
				<p class="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
					{settings?.tagline || 'Location & réparation de vélos et trottinettes électriques'}.
					Au pied de la forêt de Canastel, à Oran.
				</p>
				<div class="mt-5 flex flex-wrap gap-2">
					<a
						href={phoneHref(settings?.phone)}
						class="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
					>
						<Icon name="phone" class="h-4 w-4" /> {settings?.phone || 'Téléphone'}
					</a>
					{#if wa}
						<a
							href={wa}
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
						>
							<Icon name="whatsapp" class="h-4 w-4" /> WhatsApp
						</a>
					{/if}
				</div>
			</div>

			<div>
				<h4 class="text-sm font-semibold uppercase tracking-wide text-white">Le shop</h4>
				<ul class="mt-4 space-y-2.5 text-sm text-gray-400">
					<li class="flex gap-2"><Icon name="location" class="mt-0.5 h-4 w-4 shrink-0" />{settings?.address || 'Forêt de Canastel, Oran'}</li>
					<li class="flex gap-2"><Icon name="clock" class="mt-0.5 h-4 w-4 shrink-0" />{settings?.openingHours || 'Tous les jours'}</li>
					<li class="flex gap-2"><Icon name="wrench" class="mt-0.5 h-4 w-4 shrink-0" />Réparation & entretien</li>
					<li class="flex gap-2"><Icon name="bike" class="mt-0.5 h-4 w-4 shrink-0" />Location vélo & trottinette</li>
				</ul>
			</div>

			<div>
				<h4 class="text-sm font-semibold uppercase tracking-wide text-white">Liens</h4>
				<ul class="mt-4 space-y-2.5 text-sm text-gray-400">
					<li><a href="/#vehicules" class="hover:text-white">Nos véhicules</a></li>
					<li><a href="/reserver" class="hover:text-white">Réserver</a></li>
					<li><a href="/reparer" class="hover:text-white">Demander une réparation</a></li>
					<li><a href="/login" class="hover:text-white">Espace client</a></li>
					<li><a href="/admin" class="hover:text-white">Espace Djo</a></li>
				</ul>
			</div>
		</div>

		<div class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row">
			<p>© {new Date().getFullYear()} {shopName}. Tous droits réservés.</p>
			<p>Fait avec ♥ pour Djo et son shop de Canastel.</p>
		</div>
	</div>
</footer>
