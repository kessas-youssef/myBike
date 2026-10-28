<script>
	import { removeDoc, saveDoc, store, visibleDocs } from '$lib/client/store.svelte.js';
	import { formatMoney } from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import ImagePicker from '../ImagePicker.svelte';
	import EmptyState from '../EmptyState.svelte';

	const categories = [
		{ value: 'protection', label: 'Protection' },
		{ value: 'securite', label: 'Sécurité' },
		{ value: 'accessoire', label: 'Accessoire' },
		{ value: 'outil', label: 'Outil' },
		{ value: 'entretien', label: 'Entretien' }
	];

	let search = $state('');
	let categoryFilter = $state('all');
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	const settings = $derived(store.settings);
	const currency = $derived(settings.currency || 'DA');
	const accessories = $derived(visibleDocs('accessories'));

	const filtered = $derived.by(() => {
		let rows = accessories;
		if (categoryFilter !== 'all') rows = rows.filter((item) => item.category === categoryFilter);
		const query = search.trim().toLowerCase();
		if (query) {
			rows = rows.filter((item) =>
				[item.name, item.description, item.category].filter(Boolean).join(' ').toLowerCase().includes(query)
			);
		}
		return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
	});

	const stats = $derived({
		count: accessories.length,
		units: accessories.reduce((sum, item) => sum + Number(item.stock || 0), 0),
		value: accessories.reduce(
			(sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0),
			0
		),
		low: accessories.filter((item) => Number(item.stock || 0) <= 2).length
	});

	function blankForm() {
		return {
			name: '',
			category: 'accessoire',
			price: 0,
			stock: 1,
			image: '',
			description: '',
			active: true
		};
	}

	function openNew() {
		error = '';
		notice = '';
		editing = null;
		form = blankForm();
		formOpen = true;
	}

	function openEdit(accessory) {
		error = '';
		notice = '';
		editing = accessory;
		form = {
			name: accessory.name || '',
			category: accessory.category || 'accessoire',
			price: Number(accessory.price || 0),
			stock: Number(accessory.stock || 0),
			image: accessory.image || '',
			description: accessory.description || '',
			active: accessory.active !== false
		};
		formOpen = true;
	}

	async function saveAccessory(event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (!form.name.trim()) {
			error = 'Le nom de l’accessoire est requis.';
			return;
		}
		saving = true;
		try {
			await saveDoc('accessories', {
				...(editing || {}),
				name: form.name.trim(),
				category: form.category,
				price: Math.max(0, Number(form.price) || 0),
				stock: Math.max(0, Math.round(Number(form.stock) || 0)),
				image: form.image,
				description: form.description.trim(),
				active: Boolean(form.active)
			});
			formOpen = false;
			editing = null;
			notice = 'Accessoire enregistré. Il sera publié au prochain passage en ligne.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function adjustStock(accessory, delta) {
		error = '';
		const stock = Math.max(0, Number(accessory.stock || 0) + delta);
		if (stock === Number(accessory.stock || 0)) return;
		try {
			await saveDoc('accessories', { ...accessory, stock });
		} catch (err) {
			error = err?.message || 'Mise à jour impossible';
		}
	}

	async function toggleActive(accessory) {
		error = '';
		try {
			await saveDoc('accessories', { ...accessory, active: accessory.active === false });
		} catch (err) {
			error = err?.message || 'Mise à jour impossible';
		}
	}

	async function deleteAccessory(accessory) {
		error = '';
		notice = '';
		if (!confirm(`Supprimer « ${accessory.name} » du catalogue ?`)) return;
		await removeDoc('accessories', accessory._id);
		notice = 'Accessoire supprimé. La suppression sera synchronisée.';
	}

	function categoryLabel(value) {
		return categories.find((item) => item.value === value)?.label || 'Accessoire';
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Boutique</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Accessoires & pièces</h1>
			<p class="mt-1 text-sm text-gray-500">Catalogue, prix et stock du shop.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Ajouter un accessoire
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
			<p class="text-xs font-medium text-gray-500">Références</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.count}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Unités en stock</p>
			<p class="mt-1 text-2xl font-black text-gray-900">{stats.units}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Valeur du stock</p>
			<p class="mt-1 text-lg font-black text-emerald-700">{formatMoney(stats.value, currency)}</p>
		</div>
		<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500">Stock bas</p>
			<p class="mt-1 text-2xl font-black text-amber-600">{stats.low}</p>
		</div>
	</div>

	<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex gap-1 overflow-x-auto pb-1">
				<button type="button" class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition {categoryFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}" onclick={() => (categoryFilter = 'all')}>Tous</button>
				{#each categories as item}
					<button type="button" class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition {categoryFilter === item.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}" onclick={() => (categoryFilter = item.value)}>{item.label}</button>
				{/each}
			</div>
			<label class="relative block w-full sm:w-60">
				<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input type="search" bind:value={search} placeholder="Nom, description…" class="w-full rounded-xl border-gray-300 py-2 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
			</label>
		</div>
	</div>

	{#if filtered.length}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each filtered as accessory}
				<article class="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						{#if accessory.image}
							<img src={accessory.image} alt={accessory.name} class="h-16 w-16 shrink-0 rounded-xl object-cover" />
						{:else}
							<span class="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500">
								<Icon name={accessory.category === 'protection' ? 'shield' : accessory.category === 'securite' ? 'lock' : accessory.category === 'outil' ? 'wrench' : 'package'} class="h-7 w-7" />
							</span>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<h2 class="truncate font-bold text-gray-900">{accessory.name}</h2>
								{#if accessory.active === false}
									<span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Masqué</span>
								{/if}
							</div>
							<p class="mt-0.5 text-xs text-gray-500">{categoryLabel(accessory.category)}</p>
							<p class="mt-1 text-lg font-black text-emerald-700">{formatMoney(accessory.price, currency)}</p>
						</div>
					</div>

					{#if accessory.description}
						<p class="mt-2 line-clamp-2 text-xs text-gray-500">{accessory.description}</p>
					{/if}

					<div class="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs">
						<span class="text-gray-500">Stock</span>
						<div class="flex items-center gap-1">
							<button type="button" class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100" aria-label="Retirer une unité" onclick={() => adjustStock(accessory, -1)}>−</button>
							<span class="min-w-10 text-center font-bold {Number(accessory.stock) <= 2 ? 'text-amber-600' : 'text-gray-900'}">{accessory.stock}</span>
							<button type="button" class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100" aria-label="Ajouter une unité" onclick={() => adjustStock(accessory, 1)}>+</button>
						</div>
					</div>

					<div class="mt-auto flex flex-wrap gap-2 pt-3">
						<button type="button" class="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800" onclick={() => openEdit(accessory)}>Modifier</button>
						<button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => toggleActive(accessory)}>
							{accessory.active === false ? 'Publier' : 'Masquer'}
						</button>
						<button type="button" class="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer" aria-label="Supprimer" onclick={() => deleteAccessory(accessory)}>
							<Icon name="trash" class="h-4 w-4" />
						</button>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="package" title="Aucun accessoire" description="Ajoutez casques, antivols, pièces et produits du shop.">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white" onclick={openNew}>+ Ajouter un accessoire</button>
		</EmptyState>
	{/if}
</div>

<Modal bind:open={formOpen} title={editing ? 'Modifier l’accessoire' : 'Nouvel accessoire'} subtitle="Enregistré sur cet appareil puis synchronisé." size="md">
	<form onsubmit={saveAccessory} class="space-y-4">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<ImagePicker bind:value={form.image} label="Photo du produit" aspect="square" help="Optionnel. Une photo carrée rend le catalogue plus lisible." />

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="accessoryName" class="mb-1 block text-sm font-medium text-gray-700">Nom</label>
				<input id="accessoryName" type="text" bind:value={form.name} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Casque" />
			</div>
			<div>
				<label for="accessoryCategory" class="mb-1 block text-sm font-medium text-gray-700">Catégorie</label>
				<select id="accessoryCategory" bind:value={form.category} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					{#each categories as item}
						<option value={item.value}>{item.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="accessoryActive" class="mb-1 block text-sm font-medium text-gray-700">Visibilité</label>
				<select id="accessoryActive" bind:value={form.active} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value={true}>Visible sur le site</option>
					<option value={false}>Masqué</option>
				</select>
			</div>
			<div>
				<label for="accessoryPrice" class="mb-1 block text-sm font-medium text-gray-700">Prix ({currency})</label>
				<input id="accessoryPrice" type="number" min="0" step="50" bind:value={form.price} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="accessoryStock" class="mb-1 block text-sm font-medium text-gray-700">Stock</label>
				<input id="accessoryStock" type="number" min="0" bind:value={form.stock} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="accessoryDescription" class="mb-1 block text-sm font-medium text-gray-700">Description</label>
				<textarea id="accessoryDescription" bind:value={form.description} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Casque réglable, toutes tailles."></textarea>
			</div>
		</div>

		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
		</div>
	</form>
</Modal>
