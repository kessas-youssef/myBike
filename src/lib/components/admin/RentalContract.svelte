<script>
	import { formatDate, formatDateTime, formatMoney } from '$lib/format.js';
	import { findDoc } from '$lib/client/store.svelte.js';
	import Icon from '../Icon.svelte';

	let { rental, settings, onClose = () => {} } = $props();

	const vehicle = $derived(rental ? findDoc('vehicles', rental.vehicleId) : null);
	const number = $derived(
		rental?._id ? `LOC-${String(rental._id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : '—'
	);
	const equipment = $derived(vehicle?.equipment || []);
</script>

<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
	<p class="text-sm text-gray-500">Aperçu du contrat de location. Imprimez-le ou enregistrez-le en PDF.</p>
	<div class="flex gap-2">
		<button type="button" class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={onClose}>
			Fermer
		</button>
		<button type="button" class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800" onclick={() => window.print()}>
			<Icon name="print" class="h-4 w-4" /> Imprimer / PDF
		</button>
	</div>
</div>

<div class="print-area rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 sm:p-8">
	<div class="flex flex-wrap items-start justify-between gap-4 border-b-2 border-gray-900 pb-4">
		<div>
			<h1 class="text-2xl font-black tracking-tight">{settings.shopName || 'MyBike Djo'}</h1>
			<p class="mt-1 text-sm text-gray-600">{settings.address || 'Forêt de Canastel, Oran, Algérie'}</p>
			<p class="text-sm text-gray-600">{settings.phone || ''} · {settings.email || ''}</p>
		</div>
		<div class="text-right">
			<p class="text-xs font-bold uppercase tracking-wide text-gray-500">Contrat de location</p>
			<p class="mt-1 text-lg font-black">{number}</p>
			<p class="text-xs text-gray-500">{formatDate(new Date())}</p>
		</div>
	</div>

	<div class="mt-6 grid gap-6 sm:grid-cols-2">
		<div>
			<h2 class="text-xs font-bold uppercase tracking-wide text-gray-500">Locataire</h2>
			<div class="mt-2 space-y-1 text-sm">
				<p class="font-bold">{rental?.clientName || '—'}</p>
				<p>Téléphone : {rental?.clientPhone || '—'}</p>
				<p>Pièce d’identité : {rental?.renterIdType || '—'} {rental?.renterIdNumber || ''}</p>
				<p>Pièce retenue au shop : <strong>{rental?.idHeld ? 'Oui' : 'Non'}</strong></p>
			</div>
		</div>
		<div>
			<h2 class="text-xs font-bold uppercase tracking-wide text-gray-500">Véhicule</h2>
			<div class="mt-2 space-y-1 text-sm">
				<p class="font-bold">{rental?.vehicleName || '—'}</p>
				<p>Couleur : {vehicle?.color || '—'}</p>
				<p>Équipements : {equipment.length ? equipment.join(', ') : '—'}</p>
				<p>Immatriculation / n° série : {vehicle?.serial || vehicle?.model || '—'}</p>
			</div>
		</div>
	</div>

	<div class="mt-6 overflow-hidden rounded-xl border border-gray-200">
		<table class="w-full text-sm">
			<tbody>
				<tr class="border-b border-gray-200">
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Début de location</td>
					<td class="px-3 py-2">{formatDateTime(rental?.startTime)}</td>
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Retour prévu</td>
					<td class="px-3 py-2">{formatDateTime(rental?.endTime)}</td>
				</tr>
				<tr class="border-b border-gray-200">
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Durée</td>
					<td class="px-3 py-2">{rental?.hours || 0} heure(s)</td>
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Tarif horaire</td>
					<td class="px-3 py-2">{formatMoney(rental?.pricePerHour)}</td>
				</tr>
				<tr class="border-b border-gray-200">
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Caution</td>
					<td class="px-3 py-2">{formatMoney(rental?.deposit)}</td>
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Total location</td>
					<td class="px-3 py-2 font-bold">{formatMoney(rental?.totalPrice)}</td>
				</tr>
				<tr>
					<td class="bg-gray-50 px-3 py-2 font-medium text-gray-600">Suivi de position</td>
					<td class="px-3 py-2" colspan="3">
						{rental?.trackingConsentAt || rental?.lastPingAt
							? 'Le locataire a accepté le partage de position pendant la location.'
							: 'Non activé.'}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="mt-6">
		<h2 class="text-xs font-bold uppercase tracking-wide text-gray-500">Conditions</h2>
		<p class="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-600">
			{settings.rentalTerms || 'La location est consentie pour la durée indiquée. Une pièce d’identité peut être conservée pendant la location. Le locataire s’engage à respecter le code de la route et à signaler immédiatement toute perte, vol ou panne.'}
		</p>
	</div>

	<div class="mt-8 grid grid-cols-2 gap-8 text-xs text-gray-500">
		<div>
			<p>Signature du locataire</p>
			<div class="mt-10 border-t border-gray-400"></div>
		</div>
		<div>
			<p>Pour {settings.shopName || 'MyBike Djo'}</p>
			<div class="mt-10 border-t border-gray-400"></div>
		</div>
	</div>

	<p class="mt-6 text-center text-[10px] text-gray-400">
		{settings.shopName || 'MyBike Djo'} · {settings.address || 'Forêt de Canastel, Oran'} · {settings.phone || ''}
	</p>
</div>
