import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { ObjectId } from 'mongodb';

export async function GET({ cookies, url }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const db = await getDb();
	let filter = {};
	if (session.role === 'client') filter.clientId = session.id;

	const reservations = await db.collection('reservations').find(filter).sort({ createdAt: -1 }).toArray();
	return json(reservations);
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const db = await getDb();
	const { vehicleId, date, hours } = await request.json();

	const vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(vehicleId) });
	if (!vehicle) return json({ error: 'Véhicule introuvable' }, { status: 404 });

	const totalPrice = vehicle.pricePerHour * hours;

	const result = await db.collection('reservations').insertOne({
		vehicleId,
		vehicleName: vehicle.name,
		vehicleType: vehicle.type,
		clientId: session.id,
		clientName: session.name,
		date: new Date(date),
		hours,
		totalPrice,
		status: 'pending',
		createdAt: new Date()
	});

	return json({ _id: result.insertedId, totalPrice }, { status: 201 });
}

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const { _id, status } = await request.json();
	await db.collection('reservations').updateOne({ _id: new ObjectId(_id) }, { $set: { status } });

	if (status === 'confirmed') {
		const res = await db.collection('reservations').findOne({ _id: new ObjectId(_id) });
		const startTime = new Date(res.date);
		const endTime = new Date(startTime.getTime() + res.hours * 60 * 60 * 1000);

		await db.collection('vehicles').updateOne({ _id: new ObjectId(res.vehicleId) }, { $inc: { available: -1 } });

		await db.collection('rentals').insertOne({
			vehicleId: res.vehicleId,
			vehicleName: res.vehicleName,
			vehicleType: res.vehicleType,
			clientId: res.clientId,
			clientName: res.clientName,
			startTime,
			endTime,
			hours: res.hours,
			totalPrice: res.totalPrice,
			status: 'upcoming',
			reservationId: _id,
			createdAt: new Date()
		});
	}

	return json({ success: true });
}
