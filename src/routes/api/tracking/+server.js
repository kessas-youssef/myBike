import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { serializeDoc, serializeList, toMongoId } from '$lib/server/ids.js';
import { isOutsideGeofence } from '$lib/geo.js';

function ownsRental(rental, session) {
	return (
		session.role === 'admin' ||
		rental.clientId === session.id ||
		rental.clientId?.toString() === session.id
	);
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const rentalId = String(body.rentalId || '');
	const lat = Number(body.lat);
	const lng = Number(body.lng);
	const accuracy = Number(body.accuracy);

	if (!rentalId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
		return json({ error: 'Position invalide' }, { status: 400 });
	}
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		return json({ error: 'Coordonnées hors limites' }, { status: 400 });
	}

	const db = getDb();
	const rental = await db.collection('rentals').findOne({ _id: toMongoId(rentalId) });
	if (!rental) return json({ error: 'Location introuvable', code: 'RENTAL_NOT_FOUND' }, { status: 404 });
	if (!ownsRental(rental, session)) return json({ error: 'Non autorisé' }, { status: 403 });
	if (rental.status !== 'active') {
		return json({ error: 'Cette location n’est plus active', code: 'RENTAL_ENDED' }, { status: 409 });
	}

	const now = new Date();
	const at = body.at ? new Date(body.at) : now;
	const safeAt =
		Number.isNaN(at.getTime()) || at.getTime() > now.getTime() + 5 * 60 * 1000
			? now
			: new Date(Math.max(at.getTime(), now.getTime() - 24 * 60 * 60 * 1000));
	const pingId = String(body.id || '').slice(0, 120);
	const roundedAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : null;

	const settings = await db.collection('settings').findOne({ _id: 'settings' });
	const center = settings?.shopLocation;
	const radius = Number(settings?.geofenceRadius || 0);
	const { outside, distance } = isOutsideGeofence({ lat, lng }, center, radius);

	// Throttle against the ping timestamp, not the server clock. Otherwise the
	// first queued offline ping would mark the rental as "just pinged" and all
	// the other points collected offline would be discarded.
	const lastPingMs = rental.lastPingAt ? new Date(rental.lastPingAt).getTime() : 0;
	const shouldStore = !lastPingMs || safeAt.getTime() - lastPingMs >= 5000;

	let stored = false;
	if (shouldStore) {
		const ping = {
			rentalId,
			clientId: session.id,
			lat,
			lng,
			accuracy: roundedAccuracy,
			at: safeAt,
			outsideGeofence: outside,
			distanceM: distance,
			createdAt: now
		};
		if (pingId) ping.pingId = pingId;

		try {
			if (pingId) {
				// Idempotent: a retried offline ping must not create duplicates.
				const result = await db
					.collection('tracking')
					.updateOne({ rentalId, pingId }, { $setOnInsert: ping }, { upsert: true });
				stored = result.upsertedCount > 0;
			} else {
				await db.collection('tracking').insertOne(ping);
				stored = true;
			}
		} catch (error) {
			if (error?.code !== 11000) throw error;
		}
	}

	// Never let an older queued ping overwrite a newer last known location.
	const lastLocationMs = rental.lastLocation?.at ? new Date(rental.lastLocation.at).getTime() : 0;
	const isNewest = safeAt.getTime() >= lastLocationMs;
	const update = {
		$set: {
			trackingEnabled: true,
			updatedAt: now,
			trackingConsentAt: rental.trackingConsentAt || now
		},
		$max: { lastPingAt: safeAt }
	};
	if (isNewest) {
		Object.assign(update.$set, {
			lastLocation: {
				lat,
				lng,
				accuracy: roundedAccuracy,
				at: safeAt.toISOString()
			},
			lastDistanceM: distance,
			outsideGeofence: outside
		});
	}

	const writeResult = await db.collection('rentals').updateOne(
		isNewest
			? {
					_id: rental._id,
					$or: [
						{ lastLocation: { $exists: false } },
						{ 'lastLocation.at': { $lte: safeAt.toISOString() } }
					]
				}
			: { _id: rental._id },
		update
	);

	if (!writeResult.matchedCount && isNewest) {
		// A newer ping won the race: keep its location, only advance the clock.
		await db.collection('rentals').updateOne(
			{ _id: rental._id },
			{
				$set: { trackingEnabled: true, updatedAt: now },
				$max: { lastPingAt: safeAt }
			}
		);
	}

	return json({
		ok: true,
		stored,
		outside,
		distance,
		geofenceRadius: radius,
		at: safeAt.toISOString()
	});
}

export async function GET({ cookies, url }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const rentalId = String(url.searchParams.get('rentalId') || '');
	if (!rentalId) return json({ error: 'rentalId requis' }, { status: 400 });

	const db = getDb();
	const rental = await db.collection('rentals').findOne({ _id: toMongoId(rentalId) });
	if (!rental) return json({ error: 'Location introuvable' }, { status: 404 });
	if (!ownsRental(rental, session)) return json({ error: 'Non autorisé' }, { status: 403 });

	const limitParam = Number(url.searchParams.get('limit') || 100);
	const limit = Number.isFinite(limitParam)
		? Math.min(Math.max(Math.trunc(limitParam), 1), 300)
		: 100;
	const pings = await db
		.collection('tracking')
		.find({ rentalId })
		.sort({ at: -1 })
		.limit(limit)
		.toArray();

	return json({
		rental: serializeDoc(rental),
		pings: serializeList(pings)
	});
}
