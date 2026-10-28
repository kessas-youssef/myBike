import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { ObjectId } from 'mongodb';

export async function GET() {
	const db = await getDb();
	const accessories = await db.collection('accessories').find().toArray();
	return json(accessories);
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const data = await request.json();
	const result = await db.collection('accessories').insertOne({ ...data, createdAt: new Date() });
	return json({ _id: result.insertedId }, { status: 201 });
}

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id, ...data } = await request.json();
	await db.collection('accessories').updateOne({ _id: new ObjectId(_id) }, { $set: data });
	return json({ success: true });
}

export async function DELETE({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id } = await request.json();
	await db.collection('accessories').deleteOne({ _id: new ObjectId(_id) });
	return json({ success: true });
}
