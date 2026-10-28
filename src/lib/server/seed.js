import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';
import { connectDb } from './db.js';
import {
	defaultAccessories,
	defaultPromotions,
	defaultSettings,
	defaultVehicles
} from '$lib/defaults.js';

const globalKey = '__myBikeSeedPromise';
const globalState = (globalThis[globalKey] ??= { promise: null });

function withoutId(doc) {
	const { _id, ...rest } = doc;
	return rest;
}

async function seedAdmin(db) {
	const admin = await db.collection('users').findOne({ role: 'admin' });
	if (admin) return;

	const email = (env.ADMIN_EMAIL || 'djo@mybike.dz').trim().toLowerCase();
	const password = env.ADMIN_PASSWORD || 'admin123';
	const existing = await db
		.collection('users')
		.findOne({ email }, { collation: { locale: 'en', strength: 2 } });

	if (existing) {
		await db
			.collection('users')
			.updateOne({ _id: existing._id }, { $set: { role: 'admin', email } });
		console.log(`[seed] compte existant promu administrateur : ${email}`);
		return;
	}

	const hash = await bcrypt.hash(password, 10);
	await db.collection('users').insertOne({
		name: 'Djo',
		email,
		password: hash,
		role: 'admin',
		phone: '',
		address: '',
		createdAt: new Date(),
		updatedAt: new Date()
	});

	console.log(`[seed] administrateur créé : ${email}`);
	if (!env.ADMIN_PASSWORD) {
		console.warn('[seed] mot de passe admin par défaut actif : changez-le dans Réglages.');
	}
}

async function seedCollection(db, name, docs) {
	if (!docs.length) return;
	const now = new Date();
	await db.collection(name).bulkWrite(
		docs.map((doc) => {
			const { _id, ...data } = doc;
			return {
				updateOne: {
					filter: { _id },
					update: {
						$setOnInsert: {
							...data,
							createdAt: now,
							updatedAt: now
						}
					},
					upsert: true
				}
			};
		}),
		{ ordered: false }
	);
}

async function createIndexes(db) {
	const jobs = [
		db.collection('users').createIndex({ email: 1 }, { unique: true }),
		db.collection('users').createIndex({ role: 1 }),
		db.collection('rentals').createIndex({ clientId: 1 }),
		db.collection('rentals').createIndex({ status: 1, endTime: 1 }),
		db.collection('reservations').createIndex({ clientId: 1, status: 1 }),
		db.collection('repairs').createIndex({ clientId: 1, status: 1 }),
		db.collection('tracking').createIndex({ rentalId: 1, at: -1 }),
		db
			.collection('tracking')
			.createIndex({ rentalId: 1, pingId: 1 }, { unique: true, sparse: true }),
		db.collection('promotions').createIndex({ active: 1 }),
		db.collection('sync_ops').createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })
	];

	const results = await Promise.allSettled(jobs);
	for (const result of results) {
		if (result.status === 'rejected') {
			console.warn('[seed] index non créé :', result.reason?.message || result.reason);
		}
	}
}

export async function seedDb() {
	if (globalState.promise) return globalState.promise;

	globalState.promise = (async () => {
		const db = await connectDb();
		await seedAdmin(db);
		await seedCollection(db, 'vehicles', defaultVehicles);
		await seedCollection(db, 'accessories', defaultAccessories);
		await seedCollection(db, 'promotions', defaultPromotions);
		await db.collection('settings').updateOne(
			{ _id: 'settings' },
			{ $setOnInsert: { ...withoutId(defaultSettings), createdAt: new Date(), updatedAt: new Date() } },
			{ upsert: true }
		);
		await createIndexes(db);
		return db;
	})().catch((error) => {
		globalState.promise = null;
		throw error;
	});

	return globalState.promise;
}
