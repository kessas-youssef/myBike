import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { ObjectId } from 'mongodb';

export async function GET({ url }) {
	const db = await getDb();
	const type = url.searchParams.get('type');
	const filter = type ? { type } : {};
	const vehicles = await db.collection('vehicles').find(filter).toArray();
	return json(vehicles);
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') {
		return json({ error: 'Non autorisé' }, { status: 403 });
	}

	const db = await getDb();
	const data = await request.json();

	delete data._id; // <-- important

	const result = await db.collection('vehicles').insertOne({
		...data,
		available: data.stock,
		createdAt: new Date()
	});

	return json(
		{ _id: result.insertedId.toString() },
		{ status: 201 }
	);
}

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id, ...data } = await request.json();
	await db.collection('vehicles').updateOne({ _id: new ObjectId(_id) }, { $set: data });
	return json({ success: true });
}

export async function DELETE({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id } = await request.json();
	await db.collection('vehicles').deleteOne({ _id: new ObjectId(_id) });
	return json({ success: true });
}
