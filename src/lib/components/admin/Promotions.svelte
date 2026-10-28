<script>
	import { removeDoc, saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import { formatDate, formatMoney, toDateInput } from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import ImagePicker from '../ImagePicker.svelte';
	import EmptyState from '../EmptyState.svelte';

	let filter = $state('all');
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	const settings = $derived(store.settings);
	const currency = $derived(settings.currency || 'DA');
	const promotions = $derived(visibleDocs('promotions'));

	const filtered = $derived(
		filter === 'all' ? promotions : promotions.filter((promo) => (filter === 'active' ? promo.active !== false : promo.active === false))
	);

	const stats = $derived({
		total: promotions.length,
		active: promotions.filter((promo) => promo.active !== false).length,
		withCode: promotions.filter((promo) => promo.code).length,
		best: promotions.reduce((max, promo) => {
			if (promo.discountType === 'percent') return Math.max(max, Number(promo.discountValue || 0));
			return max;
		}, 0)
	});

	function dateInput(value) {
		return value ? toDateInput(value) : '';
	}

	function blankForm() {
		return {
			title: '',
			description: '',
			code: '',
			discountType: 'percent',
			discountValue: 10,
			startDate: '',
			endDate: '',
			active: true,
			image: '',
			color: '#047857'
		};
	}

	function openNew() {
		error = '';
		notice = '';
		editing = null;
		form = blankForm();
		formOpen = true;
	}

	function openEdit(promo) {
		error = '';
		notice = '';
		editing = promo;
		form = {
			title: promo.title || '',
			description: promo.description || '',
			code: promo.code || '',
			discountType: promo.discountType === 'fixed' ? 'fixed' : 'percent',
			discountValue: Number(promo.discountValue || 0),
			startDate: dateInput(promo.startDate),
			endDate: dateInput(promo.endDate),
			active: promo.active !== false,
			image: promo.image || '',
			color: promo.color || '#047857'
		};
		formOpen = true;
	}

	function discountLabel(promo) {
		if (!promo.discountValue) return '—';
		return promo.discountType === 'percent'
			? `−${promo.discountValue} %`
			: `−${formatMoney(promo.discountValue, currency)}`;
	}

	function validity(promo) {
		const now = new Date();
		const start = promo.startDate ? new Date(promo.startDate) : null;
		const end = promo.endDate ? new Date(promo.endDate) : null;
		if (start && start > now) return { label: `Débute le ${formatDate(start)}`, tone: 'blue' };
		if (end && end < now) return { label: `Expirée le ${formatDate(end)}`, tone: 'gray' };
		if (end) return { label: `Jusqu’au ${formatDate(end)}`, tone: 'emerald' };
		return { label: 'Sans date de fin', tone: 'emerald' };
	}

	async function savePromotion(event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (!form.title.trim()) {
			error = 'Le titre de l’offre est requis.';
			return;
		}
		if (Number(form.discountValue) <= 0) {
			error = 'La remise doit être supérieure à zéro.';
			return;
		}
		if (form.discountType === 'percent' && Number(form.discountValue) > 100) {
			error = 'Une remise en pourcentage ne peut pas dépasser 100 %.';
			return;
		}

		const start = form.startDate ? new Date(`${form.startDate}T00:00:00`) : null;
		const end = form.endDate ? new Date(`${form.endDate}T23:59:59`) : null;
		if (start && end && end < start) {
			error = 'La date de fin doit être après la date de début.';
			return;
		}

		saving = true;
		try {
			await saveDoc('promotions', {
				...(editing || {}),
				title: form.title.trim(),
				description: form.description.trim(),
				code: form.code.trim().toUpperCase(),
				discountType: form.discountType,
				discountValue: Number(form.discountValue) || 0,
				startDate: start ? start.toISOString() : null,
				endDate: end ? end.toISOString() : null,
				active: Boolean(form.active),
				image: form.image,
				color: form.color || '#047857'
			});
			formOpen = false;
			editing = null;
			notice = 'Offre enregistrée. Elle sera publiée au prochain passage en ligne.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function toggleActive(promo) {
		error = '';
		try {
			await saveDoc('promotions', { ...promo, active: promo.active === false });
		} catch (err) {
			error = err?.message || 'Mise à jour impossible';
		}
	}

	async function deletePromotion(promo) {
		error = '';
		notice = '';
		if (!confirm(`Supprimer l’offre « ${promo.title} » ?`)) return;
		await removeDoc('promotions', promo._id);
		notice = 'Offre supprimée. La suppression sera synchronisée.';
	}

	const tones = {
		emerald: 'bg-emerald-50 text-emerald-700',
		blue: 'bg-blue-50 text-blue-700',
		gray: 'bg-gray-100 text-gray-600'
	};
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Marketing</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Promotions</h1>
			<p class="mt-1 text-sm text-gray-500">Codes de réduction appliqués aux réservations et réparations.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Nouvelle offre
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
			<p class="text-xs font-medium text-gray-500">Offres</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.total}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Actives</p>
			<p class="mt-1 text-2xl font-black text-emerald-700">{stats.active}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Avec code</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.withCode}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Meilleure remise %</p>
			<p class="mt-1 text-2xl font-black text-amber-600">{stats.best ? `${stats.best} %` : '—'}</p>
		</div>
	</div>

	<div class="flex gap-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
		{#each [{ id: 'all', label: 'Toutes' }, { id: 'active', label: 'Actives' }, { id: 'inactive', label: 'Inactives' }] as item}
			<button type="button" class="rounded-lg px-3 py-2 text-xs font-semibold transition {filter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}" onclick={() => (filter = item.id)}>{item.label}</button>
		{/each}
	</div>

	{#if filtered.length}
		<div class="grid gap-4 md:grid-cols-2">
			{#each filtered as promo}
				{@const validityInfo = validity(promo)}
				<article class="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
					{#if promo.image}
						<img src={promo.image} alt={promo.title} class="h-36 w-full object-cover" onerror={(event) => (event.currentTarget.style.display = 'none')} />
					{:else}
						<div class="flex h-24 items-center justify-center bg-gradient-to-r from-emerald-700 to-emerald-500 text-white">
							<Icon name="sparkles" class="h-8 w-8 opacity-80" />
						</div>
					{/if}
					<div class="flex flex-1 flex-col p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="font-bold text-gray-900">{promo.title}</h2>
								<p class="mt-1 text-xs text-gray-500">{promo.description || 'Sans description'}</p>
							</div>
							<span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-black text-white" style="background-color: {promo.color || settings.primaryColor}">
								{discountLabel(promo)}
							</span>
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-2">
							{#if promo.code}
								<span class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-gray-800">{promo.code}</span>
							{:else}
								<span class="text-xs text-gray-400">Sans code</span>
							{/if}
							<span class="rounded-full px-2 py-1 text-[11px] font-semibold {tones[validityInfo.tone]}">{validityInfo.label}</span>
							{#if promo.active === false}
								<span class="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">Inactive</span>
							{/if}
						</div>

						<div class="mt-auto flex flex-wrap gap-2 pt-4">
							<button type="button" class="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800" onclick={() => openEdit(promo)}>Modifier</button>
							<button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => toggleActive(promo)}>
								{promo.active === false ? 'Activer' : 'Désactiver'}
							</button>
							<button type="button" class="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer" aria-label="Supprimer" onclick={() => deletePromotion(promo)}>
								<Icon name="trash" class="h-4 w-4" />
							</button>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="sparkles" title="Aucune promotion" description="Créez un code de réduction pour attirer les clients.">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white" onclick={openNew}>+ Nouvelle offre</button>
		</EmptyState>
	{/if}

	<p class="rounded-2xl border border-blue-100 bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-900">
		Le bandeau d’annonce affiché en haut du site se règle dans l’onglet <strong>Site</strong>. Les codes saisis ici
		sont vérifiés lors des réservations en ligne.
	</p>
</div>

<Modal bind:open={formOpen} title={editing ? 'Modifier l’offre' : 'Nouvelle offre'} subtitle="Enregistrée sur cet appareil puis synchronisée." size="md">
	<form onsubmit={savePromotion} class="space-y-4">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<ImagePicker bind:value={form.image} label="Visuel de l’offre" help="Optionnel. Affiché sur la page d’accueil." />

		<div>
			<label for="promoTitle" class="mb-1 block text-sm font-medium text-gray-700">Titre</label>
			<input id="promoTitle" type="text" bind:value={form.title} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Première location -20 %" />
		</div>
		<div>
			<label for="promoDescription" class="mb-1 block text-sm font-medium text-gray-700">Description</label>
			<textarea id="promoDescription" bind:value={form.description} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Profitez de 20 % de réduction…"></textarea>
		</div>

		<div class="grid gap-4 sm:grid-cols-3">
			<div>
				<label for="promoType" class="mb-1 block text-sm font-medium text-gray-700">Type de remise</label>
				<select id="promoType" bind:value={form.discountType} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value="percent">Pourcentage</option>
					<option value="fixed">Montant fixe</option>
				</select>
			</div>
			<div>
				<label for="promoValue" class="mb-1 block text-sm font-medium text-gray-700">
					{form.discountType === 'percent' ? 'Remise (%)' : `Remise (${currency})`}
				</label>
				<input id="promoValue" type="number" min="0" bind:value={form.discountValue} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="promoCode" class="mb-1 block text-sm font-medium text-gray-700">Code</label>
				<input id="promoCode" type="text" bind:value={form.code} class="w-full rounded-xl border-gray-300 font-mono uppercase focus:border-emerald-500 focus:ring-emerald-500" placeholder="CANASTEL20" />
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="promoStart" class="mb-1 block text-sm font-medium text-gray-700">Début <span class="text-gray-400">(optionnel)</span></label>
				<input id="promoStart" type="date" bind:value={form.startDate} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="promoEnd" class="mb-1 block text-sm font-medium text-gray-700">Fin <span class="text-gray-400">(optionnel)</span></label>
				<input id="promoEnd" type="date" bind:value={form.endDate} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="promoColor" class="mb-1 block text-sm font-medium text-gray-700">Couleur</label>
				<input id="promoColor" type="color" bind:value={form.color} class="h-11 w-full rounded-lg border border-gray-300 p-1" />
			</div>
			<div>
				<label for="promoActive" class="mb-1 block text-sm font-medium text-gray-700">Statut</label>
				<select id="promoActive" bind:value={form.active} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value={true}>Active</option>
					<option value={false}>Inactive</option>
				</select>
			</div>
		</div>

		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
		</div>
	</form>
</Modal>
