<script>
	import { removeDoc, saveDoc, visibleDocs } from '$lib/client/store.svelte.js';
	import { defaultRepairStatuses } from '$lib/defaults.js';
	import { formatDate, formatMoney, phoneHref, toDateInput } from '$lib/format.js';
	import Icon from '../Icon.svelte';
	import Modal from '../Modal.svelte';
	import StatusPill from '../StatusPill.svelte';
	import EmptyState from '../EmptyState.svelte';

	let filter = $state('open');
	let search = $state('');
	let error = $state('');
	let saving = $state(false);

	let formOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());

	const repairs = $derived(visibleDocs('repairs'));
	const openRepairs = $derived(
		repairs.filter((item) => !['delivered', 'cancelled'].includes(item.status))
	);
	const counts = $derived({
		open: openRepairs.length,
		requested: repairs.filter((item) => item.status === 'requested').length,
		in_progress: repairs.filter((item) =>
			['received', 'diagnosing', 'waiting_parts', 'in_progress'].includes(item.status)
		).length,
		ready: repairs.filter((item) => item.status === 'ready').length,
		delivered: repairs.filter((item) => item.status === 'delivered').length,
		all: repairs.length
	});

	const filters = [
		{ id: 'open', label: 'En cours' },
		{ id: 'requested', label: 'Demandes' },
		{ id: 'in_progress', label: 'À l’atelier' },
		{ id: 'ready', label: 'Prêtes' },
		{ id: 'delivered', label: 'Livrées' },
		{ id: 'all', label: 'Toutes' }
	];

	const filtered = $derived.by(() => {
		let rows;
		if (filter === 'open') rows = openRepairs;
		else if (filter === 'in_progress')
			rows = repairs.filter((item) =>
				['received', 'diagnosing', 'waiting_parts', 'in_progress'].includes(item.status)
			);
		else if (filter === 'all') rows = repairs;
		else rows = repairs.filter((item) => item.status === filter);

		const query = search.trim().toLowerCase();
		if (query) {
			rows = rows.filter((item) =>
				[item.clientName, item.clientPhone, item.deviceName, item.issue]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(query)
			);
		}
		return [...rows].sort(
			(a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
		);
	});

	function blankForm() {
		return {
			clientId: '',
			clientName: '',
			clientPhone: '',
			deviceType: 'bike',
			deviceName: '',
			issue: '',
			status: 'received',
			estimatedPrice: 0,
			finalPrice: 0,
			notes: '',
			preferredDate: '',
			dueDate: ''
		};
	}

	function openNew() {
		form = blankForm();
		form.preferredDate = toDateInput(new Date());
		editing = null;
		error = '';
		formOpen = true;
	}

	function openEdit(repair) {
		form = {
			clientId: repair.clientId || '',
			clientName: repair.clientName || '',
			clientPhone: repair.clientPhone || '',
			deviceType: repair.deviceType || 'bike',
			deviceName: repair.deviceName || '',
			issue: repair.issue || '',
			status: repair.status || 'received',
			estimatedPrice: Number(repair.estimatedPrice || 0),
			finalPrice: Number(repair.finalPrice || 0),
			notes: repair.notes || '',
			preferredDate: repair.preferredDate ? toDateInput(repair.preferredDate) : '',
			dueDate: repair.dueDate ? toDateInput(repair.dueDate) : ''
		};
		editing = repair;
		error = '';
		formOpen = true;
	}

	async function saveRepair(event) {
		event.preventDefault();
		error = '';
		if (!form.clientName.trim() || !form.clientPhone.trim() || !form.issue.trim()) {
			error = 'Nom, téléphone et description sont requis';
			return;
		}
		saving = true;
		try {
			const now = new Date().toISOString();
			const payload = {
				...(editing || {}),
				clientId: form.clientId || editing?.clientId || null,
				clientName: form.clientName.trim(),
				clientPhone: form.clientPhone.trim(),
				deviceType: form.deviceType,
				deviceName: form.deviceName.trim(),
				issue: form.issue.trim(),
				status: form.status,
				estimatedPrice: Number(form.estimatedPrice) || 0,
				finalPrice: Number(form.finalPrice) || 0,
				notes: form.notes.trim(),
				preferredDate: form.preferredDate ? new Date(`${form.preferredDate}T09:00:00`).toISOString() : null,
				dueDate: form.dueDate ? new Date(`${form.dueDate}T18:00:00`).toISOString() : null,
				receivedAt:
					form.status !== 'requested' ? editing?.receivedAt || now : editing?.receivedAt || null,
				deliveredAt: form.status === 'delivered' ? editing?.deliveredAt || now : null,
				source: editing?.source || 'admin'
			};
			await saveDoc('repairs', payload);
			formOpen = false;
			editing = null;
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function setStatus(repair, status) {
		error = '';
		const now = new Date().toISOString();
		try {
			await saveDoc('repairs', {
				...repair,
				status,
				receivedAt: status !== 'requested' ? repair.receivedAt || now : repair.receivedAt || null,
				deliveredAt: status === 'delivered' ? repair.deliveredAt || now : null
			});
		} catch (err) {
			error = err?.message || 'Changement de statut impossible';
		}
	}

	async function deleteRepair(repair) {
		if (!['delivered', 'cancelled'].includes(repair.status)) {
			error = 'Marquez la réparation comme livrée ou annulée avant de la supprimer.';
			return;
		}
		if (!confirm('Supprimer cette réparation de l’historique ?')) return;
		await removeDoc('repairs', repair._id);
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Atelier</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Réparations</h1>
			<p class="mt-1 text-sm text-gray-500">Demandes clients, diagnostics, devis et retours.</p>
		</div>
		<button type="button" class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800" onclick={openNew}>
			+ Réparation au shop
		</button>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}

	<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex gap-1 overflow-x-auto pb-1">
				{#each filters as item}
					<button
						type="button"
						class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition {filter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => (filter = item.id)}
					>
						{item.label}
						<span class="ml-1 opacity-60">{counts[item.id] || 0}</span>
					</button>
				{/each}
			</div>
			<label class="relative block w-full sm:w-60">
				<Icon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input type="search" bind:value={search} placeholder="Client, machine, panne…" class="w-full rounded-xl border-gray-300 py-2 pl-9 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
			</label>
		</div>
	</div>

	{#if filtered.length}
		<div class="grid gap-3 md:grid-cols-2">
			{#each filtered as repair}
				<article class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div class="flex min-w-0 items-start gap-3">
							<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-600">
								<Icon name={repair.deviceType === 'trottinette' ? 'scooter' : 'bike'} class="h-5 w-5" />
							</span>
							<div class="min-w-0">
								<p class="truncate font-bold text-gray-900">{repair.deviceName || (repair.deviceType === 'trottinette' ? 'Trottinette' : 'Vélo')}</p>
								<p class="mt-0.5 text-xs text-gray-500">{repair.clientName} · {repair.clientPhone}</p>
							</div>
						</div>
						<StatusPill status={repair.status} size="xs" />
					</div>

					<p class="mt-3 line-clamp-3 text-sm text-gray-600">{repair.issue}</p>

					<div class="mt-3 flex flex-wrap gap-2 text-xs">
						{#if repair.estimatedPrice}
							<span class="rounded-lg bg-gray-50 px-2.5 py-1.5">Devis {formatMoney(repair.estimatedPrice)}</span>
						{/if}
						{#if repair.finalPrice}
							<span class="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800">Facturé {formatMoney(repair.finalPrice)}</span>
						{/if}
						{#if repair.preferredDate}
							<span class="rounded-lg bg-gray-50 px-2.5 py-1.5">Souhaité {formatDate(repair.preferredDate)}</span>
						{/if}
						{#if repair.dueDate}
							<span class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">Prêt {formatDate(repair.dueDate)}</span>
						{/if}
					</div>

					<div class="mt-3 flex flex-wrap items-center gap-2">
						<select
							value={repair.status}
							class="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs focus:border-emerald-500 focus:ring-emerald-500"
							onchange={(event) => setStatus(repair, event.currentTarget.value)}
							aria-label="Changer le statut"
						>
							{#each defaultRepairStatuses as item}
								<option value={item.value}>{item.label}</option>
							{/each}
						</select>
						<a href={phoneHref(repair.clientPhone)} class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Appeler</a>
						<button type="button" class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => openEdit(repair)}>Modifier</button>
						{#if ['delivered', 'cancelled'].includes(repair.status)}
							<button type="button" class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onclick={() => deleteRepair(repair)}>Suppr.</button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon="wrench" title="Aucune réparation ici" description="Les demandes du site et les dépôts au shop apparaissent ici.">
			<button type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white" onclick={openNew}>+ Réparation</button>
		</EmptyState>
	{/if}
</div>

<Modal bind:open={formOpen} title={editing ? 'Modifier la réparation' : 'Nouvelle réparation'} subtitle="Fonctionne hors ligne" size="lg">
	<form onsubmit={saveRepair} class="space-y-4">
		{#if error}
			<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="repairName" class="mb-1 block text-sm font-medium text-gray-700">Client</label>
				<input id="repairName" type="text" bind:value={form.clientName} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="repairPhone" class="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
				<input id="repairPhone" type="tel" bind:value={form.clientPhone} required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="repairType" class="mb-1 block text-sm font-medium text-gray-700">Machine</label>
				<select id="repairType" bind:value={form.deviceType} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					<option value="bike">Vélo</option>
					<option value="trottinette">Trottinette</option>
				</select>
			</div>
			<div>
				<label for="repairDevice" class="mb-1 block text-sm font-medium text-gray-700">Marque / modèle</label>
				<input id="repairDevice" type="text" bind:value={form.deviceName} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="repairIssue" class="mb-1 block text-sm font-medium text-gray-700">Problème / travaux</label>
				<textarea id="repairIssue" bind:value={form.issue} rows="3" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
			</div>
			<div>
				<label for="repairStatus" class="mb-1 block text-sm font-medium text-gray-700">Statut</label>
				<select id="repairStatus" bind:value={form.status} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
					{#each defaultRepairStatuses as item}
						<option value={item.value}>{item.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="repairDue" class="mb-1 block text-sm font-medium text-gray-700">Date prévue</label>
				<input id="repairDue" type="date" bind:value={form.dueDate} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="repairEstimate" class="mb-1 block text-sm font-medium text-gray-700">Devis (DA)</label>
				<input id="repairEstimate" type="number" min="0" bind:value={form.estimatedPrice} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div>
				<label for="repairFinal" class="mb-1 block text-sm font-medium text-gray-700">Montant facturé (DA)</label>
				<input id="repairFinal" type="number" min="0" bind:value={form.finalPrice} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
			</div>
			<div class="sm:col-span-2">
				<label for="repairNotes" class="mb-1 block text-sm font-medium text-gray-700">Notes internes</label>
				<textarea id="repairNotes" bind:value={form.notes} rows="2" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
			</div>
		</div>

		<div class="flex gap-3 pt-1">
			<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700" onclick={() => (formOpen = false)}>Annuler</button>
			<button type="submit" disabled={saving} class="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
		</div>
	</form>
</Modal>
