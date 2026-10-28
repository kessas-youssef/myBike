import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { serializeDoc, serializeList } from '$lib/server/ids.js';

function activePromotion(promo, now) {
	if (promo.active === false || promo._deleted) return false;
	const start = promo.startDate ? new Date(promo.startDate) : null;
	const end = promo.endDate ? new Date(promo.endDate) : null;
	if (start && !Number.isNaN(start.getTime()) && start > now) return false;
	if (end && !Number.isNaN(end.getTime()) && end < now) return false;
	return true;
}

export async function GET() {
	const db = getDb();
	const now = new Date();

	const [settings, vehicles, accessories, promotions] = await Promise.all([
		db.collection('settings').findOne({ _id: 'settings' }),
		db
			.collection('vehicles')
			.find({ active: { $ne: false }, _deleted: { $ne: true } })
			.sort({ type: 1, name: 1 })
			.toArray(),
		db
			.collection('accessories')
			.find({ active: { $ne: false }, _deleted: { $ne: true } })
			.sort({ category: 1, name: 1 })
			.toArray(),
		db.collection('promotions').find({ active: { $ne: false }, _deleted: { $ne: true } }).toArray()
	]);

	return json({
		settings: serializeDoc(settings),
		vehicles: serializeList(vehicles),
		accessories: serializeList(accessories),
		promotions: serializeList(promotions).filter((promo) => activePromotion(promo, now)),
		serverTime: now.toISOString()
	});
}
