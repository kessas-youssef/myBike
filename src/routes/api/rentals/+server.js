import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { ObjectId } from 'mongodb';

export async function GET({ cookies, url }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const db = await getDb();
	let filter = {};

	if (session.role === 'client') {
		filter.clientId = session.id;
	} else if (url.searchParams.get('clientId')) {
		filter.clientId = url.searchParams.get('clientId');
	}

	const rentals = await db.collection('rentals').find(filter).sort({ startTime: -1 }).toArray();
	return json(rentals);
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const db = await getDb();
	const { vehicleId, hours, clientId } = await request.json();
	const cid = session.role === 'admin' && clientId ? clientId : session.id;

	const vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(vehicleId) });
	if (!vehicle) return json({ error: 'Véhicule introuvable' }, { status: 404 });
	if (vehicle.available < 1) return json({ error: 'Plus disponible' }, { status: 400 });

	const totalPrice = vehicle.pricePerHour * hours;
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

	await db.collection('vehicles').updateOne({ _id: new ObjectId(vehicleId) }, { $inc: { available: -1 } });

	const result = await db.collection('rentals').insertOne({
		vehicleId,
		vehicleName: vehicle.name,
		vehicleType: vehicle.type,
		clientId: cid,
		clientName: session.name,
		startTime,
		endTime,
		hours,
		totalPrice,
		status: 'active',
		createdAt: new Date()
	});

	return json({ _id: result.insertedId, startTime, endTime, totalPrice }, { status: 201 });
}

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id, status } = await request.json();
	const rental = await db.collection('rentals').findOne({ _id: new ObjectId(_id) });
	if (!rental) return json({ error: 'Location introuvable' }, { status: 404 });

	if (status === 'completed' && rental.status === 'active') {
		await db.collection('vehicles').updateOne({ _id: new ObjectId(rental.vehicleId) }, { $inc: { available: 1 } });
	}

	await db.collection('rentals').updateOne({ _id: new ObjectId(_id) }, { $set: { status, updatedAt: new Date() } });
	return json({ success: true });
}
