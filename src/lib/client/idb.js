const DB_NAME = 'mybike-local';
const DB_VERSION = 1;

export const LOCAL_COLLECTIONS = [
	'vehicles',
	'accessories',
	'rentals',
	'reservations',
	'repairs',
	'clients',
	'promotions',
	'settings'
];

let dbPromise = null;

function openDb() {
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new Error('IndexedDB n’est pas disponible sur cet appareil'));
	}
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			for (const name of LOCAL_COLLECTIONS) {
				if (!db.objectStoreNames.contains(name)) {
					db.createObjectStore(name, { keyPath: '_id' });
				}
			}
			if (!db.objectStoreNames.contains('outbox')) {
				const outbox = db.createObjectStore('outbox', { keyPath: 'opId' });
				outbox.createIndex('at', 'at');
			}
			if (!db.objectStoreNames.contains('meta')) {
				db.createObjectStore('meta', { keyPath: 'key' });
			}
			if (!db.objectStoreNames.contains('tracking')) {
				const tracking = db.createObjectStore('tracking', { keyPath: 'id' });
				tracking.createIndex('rentalId', 'rentalId');
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	return dbPromise;
}

function run(storeName, mode, action) {
	return openDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, mode);
				const store = tx.objectStore(storeName);
				const request = action(store);
				if (request) {
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				}
				tx.oncomplete = () => resolve(request?.result);
				tx.onerror = () => reject(tx.error);
			})
	);
}

export function getAll(storeName) {
	return run(storeName, 'readonly', (store) => store.getAll());
}

export function getDoc(storeName, key) {
	return run(storeName, 'readonly', (store) => store.get(key));
}

export function putDoc(storeName, value) {
	return run(storeName, 'readwrite', (store) => store.put(value));
}

export function putMany(storeName, values) {
	if (!values?.length) return Promise.resolve();
	return openDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readwrite');
				const store = tx.objectStore(storeName);
				for (const value of values) store.put(value);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			})
	);
}

export function clearStore(storeName) {
	return run(storeName, 'readwrite', (store) => store.clear());
}

export function deleteDoc(storeName, key) {
	return run(storeName, 'readwrite', (store) => store.delete(key));
}

export function countStore(storeName) {
	return run(storeName, 'readonly', (store) => store.count());
}

export function putOutbox(op) {
	return putDoc('outbox', op);
}

function byTime(a, b) {
	return String(a.at || a.createdAt || '').localeCompare(String(b.at || b.createdAt || ''));
}

export function getOutbox() {
	// IndexedDB key order is not chronological: sort so upserts and deletes are
	// replayed in the order the user made them.
	return getAll('outbox').then((rows) => rows.sort(byTime));
}

export function countOutbox() {
	return countStore('outbox');
}

export function deleteOutbox(opIds) {
	if (!opIds?.length) return Promise.resolve();
	return openDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction('outbox', 'readwrite');
				const store = tx.objectStore('outbox');
				for (const id of opIds) store.delete(id);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			})
	);
}

export function getMeta(key) {
	return getDoc('meta', key).then((row) => row?.value ?? null);
}

export function setMeta(key, value) {
	return putDoc('meta', { key, value });
}

export function putTrackingPing(ping) {
	return putDoc('tracking', ping);
}

export function getTrackingPings() {
	return getAll('tracking').then((rows) => rows.sort(byTime));
}

export function countTrackingPings() {
	return countStore('tracking');
}

export function deleteTrackingPings(ids) {
	if (!ids?.length) return Promise.resolve();
	return openDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction('tracking', 'readwrite');
				const store = tx.objectStore('tracking');
				for (const id of ids) store.delete(id);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			})
	);
}
