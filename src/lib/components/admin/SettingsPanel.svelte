<script>
	import { onMount } from 'svelte';
	import {
		clearLocalData,
		exportLocalBackup,
		importLocalBackup,
		refreshCounts,
		saveSettings,
		store,
		syncNow
	} from '$lib/client/store.svelte.js';
	import { formatDateTime } from '$lib/format.js';
	import Icon from '../Icon.svelte';

	function clone(value) {
		return JSON.parse(JSON.stringify(value ?? {}));
	}

	let form = $state(clone(store.settings));
	let error = $state('');
	let notice = $state('');
	let saving = $state(false);
	let busy = $state('');
	let importInput;
	let installPrompt = $state(null);

	let password = $state({ current: '', next: '', confirm: '' });
	let passwordError = $state('');
	let passwordNotice = $state('');
	let passwordSaving = $state(false);

	const currency = $derived(form.currency || 'DA');
	const pending = $derived(store.pending + store.trackingPending);

	onMount(() => {
		const handler = (event) => {
			event.preventDefault();
			installPrompt = event;
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	if (!form.shopLocation) form.shopLocation = { lat: 35.7256, lng: -0.585 };

	function useCurrentPosition() {
		error = '';
		notice = '';
		if (!navigator.geolocation) {
			error = 'La géolocalisation n’est pas disponible sur cet appareil.';
			return;
		}
		busy = 'position';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				form.shopLocation = {
					lat: Number(position.coords.latitude.toFixed(6)),
					lng: Number(position.coords.longitude.toFixed(6))
				};
				busy = '';
				notice = 'Position du shop mise à jour dans le formulaire. Enregistrez pour appliquer.';
			},
			(err) => {
				busy = '';
				error =
					err?.code === 1
						? 'Autorisation de localisation refusée. Saisissez les coordonnées manuellement.'
						: 'Impossible de lire la position actuelle.';
			},
			{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
		);
	}

	async function saveConfig(event) {
		event.preventDefault();
		error = '';
		notice = '';

		const lat = Number(form.shopLocation?.lat);
		const lng = Number(form.shopLocation?.lng);
		const radius = Number(form.geofenceRadius);
		if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
			error = 'Latitude invalide (entre -90 et 90).';
			return;
		}
		if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
			error = 'Longitude invalide (entre -180 et 180).';
			return;
		}
		if (!Number.isFinite(radius) || radius < 50) {
			error = 'Le rayon de la zone doit être d’au moins 50 mètres.';
			return;
		}

		saving = true;
		try {
			await saveSettings({
				...form,
				shopLocation: { lat, lng },
				geofenceRadius: Math.round(radius),
				trackingIntervalSec: Math.max(10, Math.round(Number(form.trackingIntervalSec) || 30)),
				depositBike: Math.max(0, Number(form.depositBike) || 0),
				depositScooter: Math.max(0, Number(form.depositScooter) || 0),
				idRequired: Boolean(form.idRequired)
			});
			notice = 'Réglages enregistrés. Ils seront synchronisés automatiquement.';
		} catch (err) {
			error = err?.message || 'Enregistrement impossible';
		} finally {
			saving = false;
		}
	}

	async function changePassword(event) {
		event.preventDefault();
		passwordError = '';
		passwordNotice = '';
		if (password.next.length < 6) {
			passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
			return;
		}
		if (password.next !== password.confirm) {
			passwordError = 'Les deux nouveaux mots de passe ne correspondent pas.';
			return;
		}
		if (!navigator.onLine) {
			passwordError = 'Le changement de mot de passe nécessite internet.';
			return;
		}
		passwordSaving = true;
		try {
			const response = await fetch('/api/auth/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: password.current,
					newPassword: password.next
				})
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				passwordError = data.error || 'Changement impossible';
				return;
			}
			password = { current: '', next: '', confirm: '' };
			passwordNotice = 'Mot de passe mis à jour.';
		} catch {
			passwordError = 'Pas de connexion. Réessayez plus tard.';
		} finally {
			passwordSaving = false;
		}
	}

	async function doSync() {
		error = '';
		notice = '';
		busy = 'sync';
		await syncNow();
		await refreshCounts();
		busy = '';
		if (store.error) error = store.error;
		else if (!store.online) error = 'Hors ligne : la synchronisation reprendra au retour du réseau.';
		else notice = 'Synchronisation terminée.';
	}

	async function downloadBackup() {
		error = '';
		notice = '';
		busy = 'export';
		try {
			const backup = await exportLocalBackup();
			const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `mybike-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			notice = 'Sauvegarde téléchargée. Conservez ce fichier en lieu sûr.';
		} catch (err) {
			error = err?.message || 'Export impossible';
		} finally {
			busy = '';
		}
	}

	async function onImportFile(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		error = '';
		notice = '';
		busy = 'import';
		try {
			const text = await file.text();
			const backup = JSON.parse(text);
			if (!backup?.data) throw new Error('Fichier de sauvegarde invalide.');
			if (!confirm('Remplacer les données locales par cette sauvegarde ? Les modifications non synchronisées seront conservées dans la file d’envoi.')) {
				return;
			}
			await importLocalBackup(backup);
			if (navigator.onLine) {
				await syncNow();
				await refreshCounts();
			}
			notice = navigator.onLine
				? 'Sauvegarde restaurée et envoyée vers MongoDB Atlas.'
				: 'Sauvegarde restaurée localement. Elle sera envoyée au retour du réseau.';
		} catch (err) {
			error = err?.message || 'Import impossible';
		} finally {
			busy = '';
			if (importInput) importInput.value = '';
		}
	}

	async function wipeLocal() {
		error = '';
		notice = '';
		if (!confirm('Effacer toutes les données locales de cet appareil ?')) return;
		if (
			!confirm(
				'Attention : les modifications non synchronisées seront perdues. Les données déjà envoyées restent sur MongoDB Atlas. Continuer ?'
			)
		) {
			return;
		}
		busy = 'wipe';
		try {
			await clearLocalData();
			if (navigator.onLine) {
				await syncNow();
				await refreshCounts();
				notice = 'Données locales effacées, puis rechargées depuis MongoDB Atlas.';
			} else {
				notice = 'Données locales effacées. Reconnectez-vous à internet pour recharger depuis MongoDB Atlas.';
			}
		} catch (err) {
			error = err?.message || 'Suppression impossible';
		} finally {
			busy = '';
		}
	}

	async function installApp() {
		if (!installPrompt) return;
		installPrompt.prompt();
		await installPrompt.userChoice.catch(() => null);
		installPrompt = null;
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Configuration</p>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-gray-900">Réglages</h1>
			<p class="mt-1 text-sm text-gray-500">Localisation, cautions, sécurité et synchronisation.</p>
		</div>
		<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" onclick={doSync} disabled={busy === 'sync'}>
			<Icon name="sync" class="h-4 w-4 {busy === 'sync' || store.syncing ? 'animate-spin' : ''}" />
			Synchroniser
		</button>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
	{/if}
	{#if notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">{notice}</div>
	{/if}

	<form onsubmit={saveConfig} class="space-y-5">
		<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-2">
				<Icon name="location" class="h-5 w-5 text-emerald-600" />
				<h2 class="text-base font-bold text-gray-900">Shop & zone de suivi</h2>
			</div>
			<p class="mt-1 text-xs leading-relaxed text-gray-500">
				La zone sert à signaler un locataire qui s’éloigne trop du shop. Les positions sont partagées par le
				portail client uniquement lorsque celui-ci est ouvert sur le téléphone du locataire.
			</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-3">
				<div>
					<label for="shopLat" class="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
					<input id="shopLat" type="number" step="0.000001" bind:value={form.shopLocation.lat} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="shopLng" class="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
					<input id="shopLng" type="number" step="0.000001" bind:value={form.shopLocation.lng} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="geofenceRadius" class="mb-1 block text-sm font-medium text-gray-700">Rayon de la zone (m)</label>
					<input id="geofenceRadius" type="number" min="50" step="50" bind:value={form.geofenceRadius} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-3">
				<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" onclick={useCurrentPosition} disabled={busy === 'position'}>
					<Icon name="location" class="h-4 w-4" />
					{busy === 'position' ? 'Lecture…' : 'Utiliser ma position actuelle'}
				</button>
				<div class="flex items-center gap-2">
					<label for="trackingInterval" class="text-xs font-medium text-gray-600">Intervalle GPS (secondes)</label>
					<input id="trackingInterval" type="number" min="10" max="300" step="5" bind:value={form.trackingIntervalSec} class="w-24 rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
		</section>

		<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-2">
				<Icon name="lock" class="h-5 w-5 text-emerald-600" />
				<h2 class="text-base font-bold text-gray-900">Location, cautions & contrat</h2>
			</div>
			<div class="mt-4 grid gap-4 sm:grid-cols-3">
				<div>
					<label for="currency" class="mb-1 block text-sm font-medium text-gray-700">Devise</label>
					<input id="currency" type="text" bind:value={form.currency} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="DA" />
				</div>
				<div>
					<label for="depositBike" class="mb-1 block text-sm font-medium text-gray-700">Caution vélo ({currency})</label>
					<input id="depositBike" type="number" min="0" step="500" bind:value={form.depositBike} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="depositScooter" class="mb-1 block text-sm font-medium text-gray-700">Caution trottinette ({currency})</label>
					<input id="depositScooter" type="number" min="0" step="500" bind:value={form.depositScooter} class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
			<label class="mt-4 flex items-center gap-2 text-sm text-gray-700">
				<input type="checkbox" bind:checked={form.idRequired} class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
				Exiger une pièce d’identité pour chaque location
			</label>
			<div class="mt-4">
				<label for="rentalTerms" class="mb-1 block text-sm font-medium text-gray-700">Conditions imprimées sur le contrat</label>
				<textarea id="rentalTerms" bind:value={form.rentalTerms} rows="5" class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"></textarea>
			</div>
		</section>

		<div class="flex justify-end">
			<button type="submit" disabled={saving} class="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
				{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
			</button>
		</div>
	</form>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="wifi" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Synchronisation & données locales</h2>
		</div>
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] uppercase tracking-wide text-gray-400">État</p>
				<p class="mt-1 text-sm font-bold {store.online ? 'text-emerald-700' : 'text-amber-700'}">
					{store.online ? 'En ligne' : 'Hors ligne'}
				</p>
			</div>
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] uppercase tracking-wide text-gray-400">Dernière synchro</p>
				<p class="mt-1 text-sm font-bold text-gray-900">{store.lastSync ? formatDateTime(store.lastSync) : 'Jamais'}</p>
			</div>
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] uppercase tracking-wide text-gray-400">En attente</p>
				<p class="mt-1 text-sm font-bold {pending ? 'text-amber-700' : 'text-gray-900'}">{pending} opération(s)</p>
			</div>
		</div>
		<p class="mt-3 text-xs leading-relaxed text-gray-500">
			Le tableau de bord stocke véhicules, clients, locations, réparations et réglages dans IndexedDB. Chaque
			modification est mise en file d’attente et envoyée à MongoDB Atlas dès que le réseau revient.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<button type="button" class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50" onclick={doSync} disabled={busy === 'sync'}>
				<Icon name="sync" class="h-4 w-4" /> Synchroniser maintenant
			</button>
			<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" onclick={downloadBackup} disabled={busy === 'export'}>
				<Icon name="download" class="h-4 w-4" /> Exporter une sauvegarde
			</button>
			<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" onclick={() => importInput?.click()} disabled={busy === 'import'}>
				<Icon name="upload" class="h-4 w-4" /> Importer une sauvegarde
			</button>
			<input bind:this={importInput} type="file" accept="application/json" class="hidden" onchange={onImportFile} />
		</div>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="shield" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Compte administrateur</h2>
		</div>
		<p class="mt-1 text-sm text-gray-500">Connecté en tant que <strong>{store.settings.email || 'Djo'}</strong>.</p>
		<form onsubmit={changePassword} class="mt-4 space-y-3">
			{#if passwordError}
				<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>
			{/if}
			{#if passwordNotice}
				<div class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{passwordNotice}</div>
			{/if}
			<div class="grid gap-3 sm:grid-cols-3">
				<div>
					<label for="currentPassword" class="mb-1 block text-sm font-medium text-gray-700">Mot de passe actuel</label>
					<input id="currentPassword" type="password" bind:value={password.current} autocomplete="current-password" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="newPassword" class="mb-1 block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
					<input id="newPassword" type="password" bind:value={password.next} autocomplete="new-password" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
				<div>
					<label for="confirmPassword" class="mb-1 block text-sm font-medium text-gray-700">Confirmer</label>
					<input id="confirmPassword" type="password" bind:value={password.confirm} autocomplete="new-password" required class="w-full rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" />
				</div>
			</div>
			<button type="submit" disabled={passwordSaving} class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
				{passwordSaving ? 'Mise à jour…' : 'Changer le mot de passe'}
			</button>
		</form>
	</section>

	<section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-center gap-2">
			<Icon name="download" class="h-5 w-5 text-emerald-600" />
			<h2 class="text-base font-bold text-gray-900">Installer l’application</h2>
		</div>
		<p class="mt-1 text-sm leading-relaxed text-gray-500">
			Sur Android, utilisez « Ajouter à l’écran d’accueil » depuis le menu du navigateur. Sur iPhone, ouvrez
			Safari puis « Partager → Sur l’écran d’accueil ». L’application se lance alors en plein écran et garde le
			tableau de bord disponible hors ligne.
		</p>
		{#if installPrompt}
			<button type="button" class="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500" onclick={installApp}>
				<Icon name="download" class="h-4 w-4" /> Installer MyBike
			</button>
		{/if}
	</section>

	<section class="rounded-2xl border border-red-200 bg-red-50 p-5">
		<div class="flex items-center gap-2">
			<Icon name="alert" class="h-5 w-5 text-red-600" />
			<h2 class="text-base font-bold text-red-900">Zone sensible</h2>
		</div>
		<p class="mt-1 text-xs leading-relaxed text-red-800">
			Efface uniquement les données de cet appareil. Les données déjà synchronisées restent sur MongoDB Atlas.
			Les modifications en attente seront perdues.
		</p>
		<button type="button" class="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50" onclick={wipeLocal} disabled={busy === 'wipe'}>
			{busy === 'wipe' ? 'Suppression…' : 'Effacer les données locales'}
		</button>
	</section>
</div>
