import { defaultSettings } from '$lib/defaults.js';
import {
	clearStore,
	countOutbox,
	countTrackingPings,
	deleteOutbox,
	getAll,
	getDoc,
	getMeta,
	getOutbox,
	LOCAL_COLLECTIONS,
	putDoc,
	putMany,
	putOutbox,
	setMeta
} from './idb.js';
import { flushTracking } from './tracking.svelte.js';

export const store = $state({
	ready: false,
	online: typeof navigator !== 'undefined' ? navigator.onLine : true,
	syncing: false,
	lastSync: null,
	pending: 0,
	trackingPending: 0,
	error: '',
	authError: false,
	vehicles: [],
	accessories: [],
	rentals: [],
	reservations: [],
	repairs: [],
	clients: [],
	promotions: [],
	settings: { ...defaultSettings }
});

const ID_PREFIX = {
	vehicles: 'veh',
	accessories: 'acc',
	rentals: 'ren',
	reservations: 'res',
	repairs: 'rep',
	clients: 'cli',
	promotions: 'prom',
	settings: 'settings'
};

let initialized = false;
let syncTimer = null;
let scheduleTimer = null;
let syncInFlight = false;
let lastTimestamp = 0;

// Keep each request below Netlify's function payload limit (6 MB). Images are
// stored as data URLs, so a single settings update can be large.
const MAX_SYNC_BATCH_BYTES = 3_500_000;
const MAX_SYNC_BATCH_OPS = 100;

function makeId(collection) {
	const prefix = ID_PREFIX[collection] || 'doc';
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
	return new Date().toISOString();
}

/**
 * Strictly increasing timestamp so two edits made in the same millisecond keep
 * their order when the outbox is replayed. The previous value is restored from
 * IndexedDB on reload, so ordering also survives a refresh.
 */
function nextTimestamp() {
	lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
	return new Date(lastTimestamp).toISOString();
}

export function visibleDocs(collection) {
	const rows = store[collection];
	if (!Array.isArray(rows)) return [];
	return rows.filter((doc) => !doc._deleted);
}

export function findDoc(collection, id) {
	return (store[collection] || []).find((doc) => doc._id === id) || null;
}

export async function initStore() {
	if (initialized || typeof window === 'undefined') return;
	initialized = true;

	await loadLocal();
	store.online = navigator.onLine;
	store.ready = true;

	window.addEventListener('online', () => {
		store.online = true;
		syncNow();
		refreshCounts();
	});
	window.addEventListener('offline', () => {
		store.online = false;
	});
	window.addEventListener('focus', () => {
		if (navigator.onLine) {
			syncNow({ silent: true });
			flushTracking().then(refreshCounts);
		}
	});
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && navigator.onLine) {
			syncNow({ silent: true });
			flushTracking().then(refreshCounts);
		}
	});

	syncTimer = window.setInterval(() => {
		if (navigator.onLine) {
			syncNow({ silent: true });
			flushTracking().then(refreshCounts);
		}
	}, 30_000);

	if (navigator.onLine) {
		await syncNow({ silent: true });
	}
}

export async function refreshCounts() {
	store.pending = await countOutbox();
	store.trackingPending = await countTrackingPings();
}

async function loadLocal() {
	const [vehicles, accessories, rentals, reservations, repairs, clients, promotions, settingsDoc] =
		await Promise.all([
			getAll('vehicles'),
			getAll('accessories'),
			getAll('rentals'),
			getAll('reservations'),
			getAll('repairs'),
			getAll('clients'),
			getAll('promotions'),
			getDoc('settings', 'settings')
		]);

	store.vehicles = vehicles;
	store.accessories = accessories;
	store.rentals = rentals;
	store.reservations = reservations;
	store.repairs = repairs;
	store.clients = clients;
	store.promotions = promotions;
	store.settings = settingsDoc ? { ...defaultSettings, ...settingsDoc } : { ...defaultSettings };
	store.lastSync = await getMeta('lastSync');

	const pendingOps = await getOutbox();
	for (const op of pendingOps) {
		const at = Date.parse(op.at || '');
		if (Number.isFinite(at) && at > lastTimestamp) lastTimestamp = at;
	}

	await refreshCounts();
}

async function refreshCollection(collection) {
	if (collection === 'settings') {
		const doc = await getDoc('settings', 'settings');
		store.settings = doc ? { ...defaultSettings, ...doc } : { ...defaultSettings };
		return;
	}
	const rows = await getAll(collection);
	store[collection] = rows;
}

async function refreshAll() {
	await Promise.all(
		LOCAL_COLLECTIONS.map(async (collection) => {
			if (collection === 'settings') {
				const doc = await getDoc('settings', 'settings');
				store.settings = doc ? { ...defaultSettings, ...doc } : { ...defaultSettings };
			} else {
				store[collection] = await getAll(collection);
			}
		})
	);
}

async function applySnapshot(data) {
	if (!data) return;

	for (const collection of LOCAL_COLLECTIONS) {
		if (collection === 'settings') continue;
		const rows = Array.isArray(data[collection]) ? data[collection] : [];
		await clearStore(collection);
		await putMany(collection, rows);
	}

	const settings = data.settings
		? { ...defaultSettings, ...data.settings, _id: 'settings' }
		: store.settings;
	await putDoc('settings', settings);

	// Re-apply operations that were queued while the snapshot was in flight.
	const pending = await getOutbox();
	for (const op of pending) {
		if (op.action === 'delete') {
			await putDoc(op.collection, {
				_id: op.id,
				_deleted: true,
				updatedAt: op.clientUpdatedAt,
				deletedAt: op.clientUpdatedAt
			});
		} else if (op.data) {
			await putDoc(op.collection, op.data);
		}
	}

	await refreshAll();
	await refreshCounts();
}

export async function syncNow({ silent = false } = {}) {
	if (typeof window === 'undefined' || !navigator.onLine) {
		store.online = false;
		return;
	}
	if (syncInFlight) return;

	syncInFlight = true;
	store.syncing = true;
	if (!silent) {
		store.error = '';
		store.authError = false;
	}

	try {
		const ops = await getOutbox();
		let payload;

		if (ops.length) {
			let index = 0;
			while (index < ops.length) {
				const batch = [];
				let size = 0;

				while (index < ops.length && batch.length < MAX_SYNC_BATCH_OPS) {
					const op = ops[index];
					const opSize = JSON.stringify(op).length;
					if (batch.length && size + opSize > MAX_SYNC_BATCH_BYTES) break;
					batch.push(op);
					size += opSize;
					index += 1;
				}

				const response = await fetch('/api/sync', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ops: batch, snapshot: index >= ops.length })
				});

				if (response.status === 401 || response.status === 403) {
					store.authError = true;
					throw new Error('Session administrateur expirée. Reconnectez-vous pour synchroniser.');
				}
				if (!response.ok) {
					throw new Error(`Synchronisation impossible (${response.status})`);
				}

				payload = await response.json();
				const results = Array.isArray(payload.results) ? payload.results : [];
				const okIds = results.filter((result) => result.ok).map((result) => result.opId);
				if (okIds.length) await deleteOutbox(okIds);

				const failed = results.filter((result) => !result.ok);
				if (failed.length) {
					store.error = failed[0].error || 'Certaines modifications n’ont pas pu être synchronisées.';
					break;
				}
			}

			if (!payload?.data) {
				const response = await fetch('/api/sync');
				if (response.status === 401 || response.status === 403) {
					store.authError = true;
					throw new Error('Session administrateur expirée. Reconnectez-vous.');
				}
				if (!response.ok) throw new Error(`Synchronisation impossible (${response.status})`);
				payload = await response.json();
			}
		} else {
			const response = await fetch('/api/sync');
			if (response.status === 401 || response.status === 403) {
				store.authError = true;
				throw new Error('Session administrateur expirée. Reconnectez-vous.');
			}
			if (!response.ok) throw new Error(`Synchronisation impossible (${response.status})`);
			payload = await response.json();
		}

		await applySnapshot(payload.data);
		store.lastSync = payload.serverTime || nowIso();
		await setMeta('lastSync', store.lastSync);
		store.online = true;
		if (!store.error) store.authError = false;
	} catch (error) {
		store.error = error?.message || 'Synchronisation impossible';
		if (typeof navigator !== 'undefined' && !navigator.onLine) store.online = false;
	} finally {
		syncInFlight = false;
		store.syncing = false;
		await refreshCounts();
	}
}

function scheduleSync() {
	if (typeof window === 'undefined') return;
	if (scheduleTimer) window.clearTimeout(scheduleTimer);
	scheduleTimer = window.setTimeout(() => {
		if (navigator.onLine) syncNow({ silent: true });
	}, 800);
}

export async function saveDoc(collection, doc) {
	if (!LOCAL_COLLECTIONS.includes(collection)) {
		throw new Error(`Collection inconnue : ${collection}`);
	}

	const timestamp = nextTimestamp();
	const id = collection === 'settings' ? 'settings' : doc._id || makeId(collection);
	const data = {
		...doc,
		_id: id,
		_deleted: false,
		createdAt: doc.createdAt || timestamp,
		updatedAt: timestamp
	};

	await putDoc(collection, data);
	await putOutbox({
		opId: makeId('op'),
		collection,
		action: 'upsert',
		id,
		data,
		clientUpdatedAt: timestamp,
		at: timestamp
	});
	await refreshCollection(collection);
	await refreshCounts();
	scheduleSync();
	return data;
}

export async function removeDoc(collection, id) {
	const existing = await getDoc(collection, id);
	if (!existing) return;
	const timestamp = nextTimestamp();
	const data = {
		...existing,
		_deleted: true,
		deletedAt: timestamp,
		updatedAt: timestamp
	};

	await putDoc(collection, data);
	await putOutbox({
		opId: makeId('op'),
		collection,
		action: 'delete',
		id,
		data: { _id: id, _deleted: true, updatedAt: timestamp },
		clientUpdatedAt: timestamp,
		at: timestamp
	});
	await refreshCollection(collection);
	await refreshCounts();
	scheduleSync();
}

export async function saveSettings(settings) {
	return saveDoc('settings', { ...settings, _id: 'settings' });
}

export async function clearLocalData() {
	for (const collection of LOCAL_COLLECTIONS) {
		await clearStore(collection);
	}
	await clearStore('outbox');
	await clearStore('tracking');
	store.vehicles = [];
	store.accessories = [];
	store.rentals = [];
	store.reservations = [];
	store.repairs = [];
	store.clients = [];
	store.promotions = [];
	store.settings = { ...defaultSettings };
	store.lastSync = null;
	await setMeta('lastSync', null);
	await refreshCounts();
}

export async function exportLocalBackup() {
	const data = {};
	for (const collection of LOCAL_COLLECTIONS) {
		data[collection] =
			collection === 'settings'
				? await getDoc('settings', 'settings')
				: await getAll(collection);
	}
	return {
		version: 1,
		exportedAt: nowIso(),
		data
	};
}

export async function importLocalBackup(backup) {
	if (!backup?.data) throw new Error('Sauvegarde invalide');
	const timestamp = nowIso();

	for (const collection of LOCAL_COLLECTIONS) {
		const rows = backup.data[collection];
		if (!rows) continue;

		if (collection === 'settings') {
			const doc = {
				...rows,
				_id: 'settings',
				_deleted: false,
				updatedAt: rows.updatedAt || timestamp
			};
			await putDoc('settings', doc);
			await putOutbox({
				opId: makeId('op'),
				collection,
				action: 'upsert',
				id: 'settings',
				data: doc,
				clientUpdatedAt: doc.updatedAt,
				at: timestamp
			});
			continue;
		}

		if (!Array.isArray(rows)) continue;
		const docs = rows
			.filter((row) => row && row._id)
			.map((row) => ({
				...row,
				_deleted: row._deleted === true,
				createdAt: row.createdAt || timestamp,
				updatedAt: row.updatedAt || timestamp
			}));

		await clearStore(collection);
		await putMany(collection, docs);
		for (const doc of docs) {
			await putOutbox({
				opId: makeId('op'),
				collection,
				action: doc._deleted ? 'delete' : 'upsert',
				id: doc._id,
				data: doc,
				clientUpdatedAt: doc.updatedAt,
				at: timestamp
			});
		}
	}

	await refreshAll();
	await refreshCounts();
}
