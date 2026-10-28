import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'myBike';

let client;
let db;

export async function connectDb() {
	if (db) return db;
	client = new MongoClient(uri);
	await client.connect();
	db = client.db(dbName);
	console.log('Connected to MongoDB');
	return db;
}

export function getDb() {
	if (!db) throw new Error('Database not connected');
	return db;
}

export async function closeDb() {
	if (client) await client.close();
}
