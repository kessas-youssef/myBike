import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';

const uri = env.MONGODB_URI || env.DB_STRING || 'mongodb://127.0.0.1:27017';

function databaseFromUri(value) {
	const match = String(value).match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
	return match ? decodeURIComponent(match[1]) : '';
}

// MONGODB_DB wins, then the database named in the connection string, then myBike.
const dbName = env.MONGODB_DB || databaseFromUri(uri) || 'myBike';

// Reuse the connection across SvelteKit dev HMR reloads and warm serverless
// invocations. Netlify may keep a function instance alive between requests.
const globalKey = '__myBikeMongoState';
const state = (globalThis[globalKey] ??= {
	client: null,
	db: null,
	promise: null
});

export async function connectDb() {
	if (state.db) return state.db;
	if (state.promise) return state.promise;

	state.promise = (async () => {
		const client = new MongoClient(uri, {
			maxPoolSize: 10,
			minPoolSize: 0,
			serverSelectionTimeoutMS: 8000,
			connectTimeoutMS: 8000,
			socketTimeoutMS: 20000,
			retryWrites: true
		});

		await client.connect();
		const db = client.db(dbName);
		state.client = client;
		state.db = db;
		console.log(`[db] connecté à MongoDB (${dbName})`);
		return db;
	})().catch((error) => {
		state.promise = null;
		state.client = null;
		state.db = null;
		throw error;
	});

	return state.promise;
}

export function getDb() {
	if (!state.db) throw new Error('La base de données n’est pas connectée');
	return state.db;
}

export async function pingDb() {
	const db = await connectDb();
	await db.command({ ping: 1 });
	return true;
}

export async function closeDb() {
	if (state.client) {
		await state.client.close();
		state.client = null;
		state.db = null;
		state.promise = null;
	}
}
