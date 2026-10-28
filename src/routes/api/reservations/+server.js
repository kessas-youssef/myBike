import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { toMongoId } from '$lib/server/ids.js';

function parseDate(value) {
	const text = String(value || '');
	const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T09:00:00`) : new Date(text);
	return Number.isNaN(date.getTime()) ? null : date;
}

function applyPromotion(promo, total) {
	if (!promo) return { discount: 0, promo: null };
	const value = Number(promo.discountValue || 0);
	let discount = 0;
	if (promo.discountType === 'percent') discount = Math.round((total * value) / 100);
	else discount = Math.round(value);
	discount = Math.max(0, Math.min(total, discount));
	return { discount, promo };
}

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Connectez-vous pour réserver' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const vehicleId = String(body.vehicleId || '');
	const date = parseDate(body.date);
	const hours = Math.round(Number(body.hours));
	const promoCode = String(body.promoCode || '').trim().toUpperCase();

	if (!vehicleId || !date || !Number.isFinite(hours) || hours < 1 || hours > 72) {
		return json({ error: 'Véhicule, date ou durée invalide' }, { status: 400 });
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	if (date < today) return json({ error: 'La date choisie est déjà passée' }, { status: 400 });

	const db = getDb();
	const [vehicle, user] = await Promise.all([
		db.collection('vehicles').findOne({ _id: toMongoId(vehicleId) }),
		db.collection('users').findOne({ _id: toMongoId(session.id) })
	]);

	if (!vehicle || vehicle._deleted || vehicle.active === false) {
		return json({ error: 'Véhicule introuvable' }, { status: 404 });
	}
	if (Number(vehicle.available) < 1) {
		return json({ error: 'Ce véhicule n’est plus disponible à cette date' }, { status: 400 });
	}

	const basePrice = Number(vehicle.pricePerHour) * hours;
	let promo = null;
	if (promoCode) {
		const now = new Date();
		const candidates = await db
			.collection('promotions')
			.find({ code: promoCode, active: { $ne: false }, _deleted: { $ne: true } })
			.toArray();
		promo = candidates.find((item) => {
			const start = item.startDate ? new Date(item.startDate) : null;
			const end = item.endDate ? new Date(item.endDate) : null;
			return (!start || start <= now) && (!end || end >= now);
		});
		if (!promo) return json({ error: 'Code promotionnel invalide ou expiré' }, { status: 400 });
	}

	const { discount } = applyPromotion(promo, basePrice);
	const totalPrice = basePrice - discount;
	const now = new Date();

	const result = await db.collection('reservations').insertOne({
		vehicleId,
		vehicleName: vehicle.name,
		vehicleType: vehicle.type,
		clientId: session.id,
		clientName: user?.name || session.name,
		clientPhone: String(body.phone || user?.phone || '').trim(),
		date,
		hours,
		basePrice,
		discount,
		promoCode: promo?.code || '',
		promoTitle: promo?.title || '',
		totalPrice,
		status: 'pending',
		notes: String(body.notes || '').trim(),
		createdAt: now,
		updatedAt: now
	});

	return json(
		{
			_id: result.insertedId.toString(),
			basePrice,
			discount,
			totalPrice,
			date,
			hours
		},
		{ status: 201 }
	);
}

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const id = String(body._id || '');
	const status = String(body.status || '');

	if (!id || status !== 'cancelled') {
		return json({ error: 'Annulation invalide' }, { status: 400 });
	}

	const db = getDb();
	const reservation = await db.collection('reservations').findOne({ _id: toMongoId(id) });
	if (!reservation) return json({ error: 'Réservation introuvable' }, { status: 404 });

	const owns =
		session.role === 'admin' ||
		reservation.clientId === session.id ||
		reservation.clientId?.toString() === session.id;
	if (!owns) return json({ error: 'Non autorisé' }, { status: 403 });
	if (reservation.status !== 'pending') {
		return json({ error: 'Seules les réservations en attente peuvent être annulées' }, { status: 400 });
	}

	await db
		.collection('reservations')
		.updateOne(
			{ _id: reservation._id },
			{ $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } }
		);

	return json({ success: true });
}
