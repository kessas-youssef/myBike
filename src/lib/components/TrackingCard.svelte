<script>
	import { onMount } from 'svelte';
	import { distanceMeters } from '$lib/geo.js';
	import { formatMoney, relativeTime } from '$lib/format.js';
	import { sendTrackingPing, flushTracking } from '$lib/client/tracking.svelte.js';
	import { defaultSettings } from '$lib/defaults.js';
	import Icon from './Icon.svelte';

	let { rental, settings = defaultSettings } = $props();

	let active = $state(false);
	let status = $state('idle');
	let message = $state('');
	let consentOpen = $state(false);
	let consent = $state(false);
	let lastPing = $state(null);
	let accuracy = $state(null);
	let outside = $state(false);
	let lastPoint = $state(null);
	let distance = $state(null);
	let pending = $state(0);
	let now = $state(Date.now());
	let watchId = null;
	let wakeLock = null;
	let lastSentAt = 0;
	let lastSentPoint = null;
	let syncedRentalId = null;

	$effect(() => {
		const rentalId = rental?._id || null;
		if (rentalId === syncedRentalId) return;
		syncedRentalId = rentalId;

		const location = rental?.lastLocation;
		lastPing = location?.at || rental?.lastPingAt || null;
		accuracy = location?.accuracy ?? null;
		outside = Boolean(rental?.outsideGeofence);
		lastPoint =
			location?.lat != null && location?.lng != null
				? { lat: Number(location.lat), lng: Number(location.lng) }
				: null;
		distance = rental?.lastDistanceM ?? null;
	});

	const storageKey = $derived(`mybike:tracking:${rental?._id || 'unknown'}`);
	const intervalMs = $derived(Math.max(15, Number(settings.trackingIntervalSec || 30)) * 1000);
	const shop = $derived(settings.shopLocation || { lat: 35.7256, lng: -0.585 });
	const localDistance = $derived(lastPoint ? distanceMeters(lastPoint, shop) : distance);
	const isOutside = $derived(
		typeof localDistance === 'number' && localDistance > Number(settings.geofenceRadius || 0)
	);

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		flushTracking().then((result) => (pending = result.pending));

		const wasOn = localStorage.getItem(storageKey) === 'on';
		if (wasOn && rental?.status === 'active') {
			// Try to resume without a new gesture. Browsers that require one will
			// fall back to the "Activer le suivi" button.
			startTracking({ auto: true });
		}

		const onVisible = () => {
			if (!document.hidden && active) {
				requestWakeLock();
				flushTracking().then((result) => (pending = result.pending));
			}
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
			stopTracking({ silent: true });
		};
	});

	$effect(() => {
		if (rental?.status && rental.status !== 'active' && active) {
			stopTracking({ silent: true });
			message = 'La location est terminée, le suivi est arrêté.';
		}
	});

	async function requestWakeLock() {
		if (!('wakeLock' in navigator) || wakeLock) return;
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			wakeLock.addEventListener('release', () => {
				wakeLock = null;
			});
		} catch {
			wakeLock = null;
		}
	}

	async function startTracking({ auto = false } = {}) {
		if (!rental || rental.status !== 'active') return;
		if (!navigator.geolocation) {
			status = 'error';
			message = 'La géolocalisation n’est pas disponible sur ce navigateur.';
			return;
		}

		status = 'starting';
		message = auto ? 'Reprise du suivi…' : 'Demande d’autorisation…';

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				active = true;
				status = 'active';
				message = '';
				localStorage.setItem(storageKey, 'on');
				await requestWakeLock();
				startWatch();
				await handlePosition(position.coords);
			},
			(error) => {
				active = false;
				status = error.code === 1 ? 'denied' : 'error';
				message =
					error.code === 1
						? 'Autorisation refusée. Activez la localisation pour ce site dans les réglages du navigateur.'
						: 'Impossible de récupérer votre position. Vérifiez le GPS et réessayez.';
				localStorage.removeItem(storageKey);
			},
			{ enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 }
		);
	}

	function startWatch() {
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);
		watchId = navigator.geolocation.watchPosition(
			(position) => handlePosition(position.coords),
			(error) => {
				if (error.code === 1) {
					message = 'La localisation a été désactivée. Réactivez-la pour continuer le suivi.';
					status = 'denied';
				} else {
					message = 'Signal GPS faible. Le suivi reprendra dès que possible.';
				}
			},
			{ enableHighAccuracy: true, timeout: 25_000, maximumAge: 15_000 }
		);
	}

	async function handlePosition(coords) {
		if (!rental || rental.status !== 'active') return;
		const point = { lat: coords.latitude, lng: coords.longitude };
		const time = Date.now();
		const moved = lastSentPoint ? distanceMeters(point, lastSentPoint) : Infinity;

		// Avoid flooding MongoDB: one point every interval, or after a real move.
		if (time - lastSentAt < intervalMs && moved < 25) return;
		lastSentAt = time;
		lastSentPoint = point;

		const result = await sendTrackingPing({
			rentalId: rental._id,
			lat: point.lat,
			lng: point.lng,
			accuracy: coords.accuracy,
			at: new Date().toISOString(),
			consent: true
		});

		pending = result.pending ?? pending;
		lastPing = new Date().toISOString();
		lastPoint = point;
		accuracy = coords.accuracy ? Math.round(coords.accuracy) : null;

		if (result.response?.ok) {
			try {
				const payload = await result.response.json();
				outside = Boolean(payload.outside);
				distance = payload.distance ?? distance;
			} catch {
				// Keep the local calculation.
			}
		}
		if (result.dropped) {
			stopTracking({ silent: true });
			message = 'La location n’est plus active. Le suivi est arrêté.';
		}
	}

	function stopTracking({ silent = false } = {}) {
		if (watchId !== null && navigator.geolocation) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		if (wakeLock) {
			wakeLock.release().catch(() => {});
			wakeLock = null;
		}
		active = false;
		if (status !== 'error' && status !== 'denied') status = 'idle';
		localStorage.removeItem(storageKey);
		if (!silent) message = 'Suivi arrêté. Votre position n’est plus partagée.';
	}

	function confirmStart() {
		if (!consent) return;
		consentOpen = false;
		startTracking();
	}
</script>

<div class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-start gap-3">
			<span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
				<Icon name="shield" class="h-5 w-5" />
			</span>
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-base font-bold text-gray-900">Suivi de sécurité</h2>
					{#if active}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
							<span class="relative flex h-2 w-2">
								<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
							</span>
							Actif
						</span>
					{/if}
				</div>
				<p class="mt-1 text-sm text-gray-500">
					Partagez la position de votre téléphone avec Djo pendant la location. En cas de perte ou de vol,
					cela aide à retrouver la machine.
				</p>
			</div>
		</div>
	</div>

	{#if message}
		<div class="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">{message}</div>
	{/if}

	{#if active}
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Dernière position</p>
				<p class="mt-1 text-sm font-bold text-gray-900">{lastPing ? relativeTime(lastPing, now) : '—'}</p>
			</div>
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Précision</p>
				<p class="mt-1 text-sm font-bold text-gray-900">{accuracy ? `± ${accuracy} m` : '—'}</p>
			</div>
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Distance du shop</p>
				<p class="mt-1 text-sm font-bold {isOutside ? 'text-red-600' : 'text-gray-900'}">
					{typeof localDistance === 'number' ? `${localDistance} m` : '—'}
				</p>
			</div>
			<div class="rounded-xl bg-gray-50 p-3">
				<p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">En attente réseau</p>
				<p class="mt-1 text-sm font-bold text-gray-900">{pending}</p>
			</div>
		</div>

		{#if isOutside}
			<div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
				Vous êtes à plus de {settings.geofenceRadius || 1500} m du shop. Djo reçoit cette information.
			</div>
		{/if}

		<div class="mt-4 flex flex-wrap items-center gap-3">
			<button type="button" class="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" onclick={() => stopTracking()}>
				Arrêter le suivi
			</button>
			<p class="text-[11px] text-gray-400">
				Gardez cette page ouverte pendant la location. Le navigateur ne permet pas le suivi en arrière-plan.
			</p>
		</div>
	{:else}
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
				onclick={() => (consentOpen = true)}
				disabled={status === 'starting'}
			>
				<Icon name="location" class="h-4 w-4" />
				{status === 'starting' ? 'Activation…' : 'Activer le suivi'}
			</button>
			<p class="text-[11px] text-gray-400">
				Aucune position n’est partagée tant que vous n’avez pas accepté.
			</p>
		</div>
	{/if}

	{#if rental?.deposit}
		<p class="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
			Caution de la location : {formatMoney(rental.deposit)}. Le suivi s’arrête automatiquement à la fin de la location.
		</p>
	{/if}
</div>

{#if consentOpen}
	<div class="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			tabindex="-1"
			aria-label="Fermer la fenêtre de consentement"
			onclick={() => (consentOpen = false)}
		></button>
		<div
			class="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tracking-consent-title"
			tabindex="-1"
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 id="tracking-consent-title" class="text-lg font-black text-gray-900">Partager ma position</h2>
					<p class="mt-1 text-sm text-gray-500">Pendant la location uniquement.</p>
				</div>
				<button type="button" class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" onclick={() => (consentOpen = false)} aria-label="Fermer">
					<Icon name="x" class="h-5 w-5" />
				</button>
			</div>

			<ul class="mt-4 space-y-2.5 text-sm text-gray-600">
				<li class="flex gap-2"><Icon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Djo voit la position de votre téléphone pendant la location.</li>
				<li class="flex gap-2"><Icon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Le suivi s’arrête quand vous cliquez sur « Arrêter » ou à la fin de la location.</li>
				<li class="flex gap-2"><Icon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Les positions sont envoyées au shop et stockées dans la base du shop.</li>
				<li class="flex gap-2"><Icon name="alert" class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> Gardez cette page ouverte : le navigateur ne permet pas le suivi en arrière-plan.</li>
				<li class="flex gap-2"><Icon name="battery" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> Le GPS peut consommer de la batterie et des données mobiles.</li>
			</ul>

			<label class="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
				<input type="checkbox" bind:checked={consent} class="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
				<span>J’accepte le partage de ma position pendant cette location.</span>
			</label>

			<div class="mt-5 flex gap-3">
				<button type="button" class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" onclick={() => (consentOpen = false)}>Annuler</button>
				<button
					type="button"
					class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={!consent}
					onclick={confirmStart}
				>
					J’accepte et j’active
				</button>
			</div>
		</div>
	</div>
{/if}
