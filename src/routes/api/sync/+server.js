import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession, isAdmin } from '$lib/server/auth.js';
import { serializeDoc, serializeList, toMongoId } from '$lib/server/ids.js';

const COLLECTIONS = new Set([
	'vehicles',
	'accessories',
	'rentals',
	'reservations',
	'repairs',
	'clients',
	'promotions',
	'settings'
]);

const DATE_FIELDS = {
	vehicles: ['createdAt', 'updatedAt'],
	accessories: ['createdAt', 'updatedAt'],
	rentals: [
		'startTime',
		'endTime',
		'createdAt',
		'updatedAt',
		'returnedAt',
		'cancelledAt',
		'startedAt',
		'lastPingAt',
		'trackingConsentAt'
	],
	reservations: ['date', 'createdAt', 'updatedAt', 'cancelledAt'],
	repairs: ['preferredDate', 'receivedAt', 'dueDate', 'deliveredAt', 'createdAt', 'updatedAt'],
	clients: ['createdAt', 'updatedAt'],
	promotions: ['startDate', 'endDate', 'createdAt', 'updatedAt'],
	settings: ['createdAt', 'updatedAt']
};

const CLIENT_FIELDS = ['name', 'email', 'phone', 'address', 'notes', 'createdAt', 'updatedAt', '_deleted', 'deletedAt'];

function asDate(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function cleanData(collection, data) {
	const source = data && typeof data === 'object' ? data : {};
	const out = {};
	for (const [key, value] of Object.entries(source)) {
		if (['_id', 'password', '__proto__', 'constructor', 'prototype'].includes(key)) continue;
		if (collection === 'clients' && !CLIENT_FIELDS.includes(key)) continue;
		out[key] = value;
	}

	for (const field of DATE_FIELDS[collection] || []) {
		if (field in out) {
			const date = asDate(out[field]);
			out[field] = date;
		}
	}

	return out;
}

async function snapshot(db) {
	const [vehicles, accessories, rentals, reservations, repairs, clients, promotions, settings] =
		await Promise.all([
			db.collection('vehicles').find().sort({ createdAt: 1 }).limit(3000).toArray(),
			db.collection('accessories').find().sort({ createdAt: 1 }).limit(3000).toArray(),
			db.collection('rentals').find().sort({ createdAt: -1 }).limit(3000).toArray(),
			db.collection('reservations').find().sort({ createdAt: -1 }).limit(3000).toArray(),
			db.collection('repairs').find().sort({ createdAt: -1 }).limit(3000).toArray(),
			db
				.collection('users')
				.find({ role: 'client' })
				.project({ password: 0 })
				.sort({ createdAt: 1 })
				.limit(3000)
				.toArray(),
			db.collection('promotions').find().sort({ createdAt: 1 }).limit(3000).toArray(),
			db.collection('settings').findOne({ _id: 'settings' })
		]);

	return {
		vehicles: serializeList(vehicles),
		accessories: serializeList(accessories),
		rentals: serializeList(rentals),
		reservations: serializeList(reservations),
		repairs: serializeList(repairs),
		clients: serializeList(clients),
		promotions: serializeList(promotions),
		settings: serializeDoc(settings)
	};
}

export async function GET({ cookies }) {
	const session = getSession(cookies);
	if (!isAdmin(session)) return json({ error: 'Non autorisé' }, { status: 403 });

	const db = getDb();
	const data = await snapshot(db);
	return json({ data, serverTime: new Date().toISOString() });
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!isAdmin(session)) return json({ error: 'Non autorisé' }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const ops = Array.isArray(body.ops) ? body.ops.slice(0, 500) : [];
	const includeSnapshot = body.snapshot !== false;
	const db = getDb();
	const results = [];

	for (const op of ops) {
		const opId = String(op?.opId || '');
		const collection = String(op?.collection || '');
		const action = String(op?.action || 'upsert');
		const id = String(op?.id || '');

		if (!opId || !COLLECTIONS.has(collection) || !id) {
			results.push({ opId, ok: false, error: 'Opération invalide' });
			continue;
		}

		try {
			const already = await db.collection('sync_ops').findOne({ _id: opId });
			if (already) {
				results.push({ opId, ok: true, duplicate: true });
				continue;
			}

			const clientUpdatedAt = asDate(op.clientUpdatedAt) || new Date();
			const filter = { _id: collection === 'settings' ? 'settings' : toMongoId(id) };
			// Local "clients" are server users with role "client".
			const target = collection === 'clients' ? 'users' : collection;

			if (collection === 'clients') {
				const existing = await db.collection('users').findOne(filter);
				if (existing && existing.role === 'admin') {
					results.push({ opId, ok: false, error: 'Impossible de modifier un administrateur' });
					continue;
				}
			}

			if (action === 'delete') {
				if (collection === 'settings') {
					results.push({ opId, ok: true, ignored: true });
					continue;
				}
				await db.collection(target).updateOne(filter, {
					$set: {
						_deleted: true,
						deletedAt: new Date(),
						updatedAt: clientUpdatedAt
					}
				});
			} else {
				const data = cleanData(collection, op.data);
				const { createdAt, ...rest } = data;
				const update = {
					$set: {
						...rest,
						updatedAt: clientUpdatedAt
					}
				};
				if (createdAt) update.$setOnInsert = { createdAt };
				if (collection === 'clients') {
					update.$set.role = 'client';
				}

				const serializedSize = JSON.stringify(data).length;
				if (serializedSize > 8_000_000) {
					results.push({ opId, ok: false, error: 'Document trop volumineux (image > 8 Mo)' });
					continue;
				}

				await db.collection(target).updateOne(filter, update, { upsert: true });
			}

			await db.collection('sync_ops').insertOne({
				_id: opId,
				collection,
				action,
				docId: id,
				at: new Date(),
				createdAt: new Date()
			});

			results.push({ opId, ok: true });
		} catch (error) {
			if (error?.code === 11000) {
				results.push({ opId, ok: true, duplicate: true });
			} else {
				console.error(`[sync] échec ${collection}/${id} :`, error?.message || error);
				results.push({ opId, ok: false, error: error?.message || 'Erreur de synchronisation' });
			}
		}
	}

	const data = includeSnapshot ? await snapshot(db) : undefined;
	return json({
		results,
		data,
		serverTime: new Date().toISOString()
	});
}
