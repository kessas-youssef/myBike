import {
	countTrackingPings,
	deleteTrackingPings,
	getTrackingPings,
	putTrackingPing
} from './idb.js';

function makeId() {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `ping_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function postPing(ping) {
	const response = await fetch('/api/tracking', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(ping)
	});
	return response;
}

/**
 * Send a location ping now when possible, otherwise keep it in IndexedDB.
 * Returns { sent, pending, response }.
 */
export async function sendTrackingPing(ping) {
	const enriched = {
		...ping,
		id: ping.id || makeId(),
		createdAt: ping.createdAt || new Date().toISOString()
	};

	if (typeof navigator !== 'undefined' && navigator.onLine) {
		try {
			const response = await postPing(enriched);
			if (response.ok) {
				return { sent: true, pending: await countTrackingPings(), response };
			}
			// The ping is invalid, the rental ended, or it no longer belongs to
			// this account: drop it instead of retrying forever.
			if ([400, 403, 404, 409].includes(response.status)) {
				return { sent: true, dropped: true, pending: await countTrackingPings(), response };
			}
		} catch {
			// Fall through to the offline queue.
		}
	}

	await putTrackingPing(enriched);
	return { sent: false, pending: await countTrackingPings() };
}

/** Flush queued pings. Called on reconnect, on focus and periodically. */
export async function flushTracking() {
	if (typeof navigator === 'undefined' || !navigator.onLine) {
		return { sent: 0, pending: await countTrackingPings() };
	}

	const pings = await getTrackingPings();
	if (!pings.length) return { sent: 0, pending: 0 };

	const done = [];
	for (const ping of pings.slice(0, 50)) {
		try {
			const response = await postPing(ping);
			if (response.ok || [400, 403, 404, 409].includes(response.status)) {
				done.push(ping.id);
			} else if (response.status === 401) {
				break;
			}
		} catch {
			break;
		}
	}

	if (done.length) await deleteTrackingPings(done);
	return { sent: done.length, pending: await countTrackingPings() };
}
