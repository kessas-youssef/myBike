import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { serializeDoc, serializeList, toMongoId } from '$lib/server/ids.js';

export async function GET({ cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const db = getDb();
	const userId = toMongoId(session.id);
	const userFilter = { $in: [session.id, userId] };

	const [user, rentals, reservations, repairs, settings] = await Promise.all([
		db.collection('users').findOne({ _id: userId }),
		db.collection('rentals').find({ clientId: userFilter }).sort({ startTime: -1 }).limit(100).toArray(),
		db
			.collection('reservations')
			.find({ clientId: userFilter })
			.sort({ createdAt: -1 })
			.limit(100)
			.toArray(),
		db.collection('repairs').find({ clientId: userFilter }).sort({ createdAt: -1 }).limit(100).toArray(),
		db.collection('settings').findOne({ _id: 'settings' })
	]);

	if (!user) return json({ error: 'Utilisateur introuvable' }, { status: 404 });

	return json({
		user: {
			id: user._id.toString(),
			name: user.name,
			email: user.email,
			phone: user.phone || '',
			address: user.address || '',
			role: user.role,
			createdAt: user.createdAt
		},
		rentals: serializeList(rentals),
		reservations: serializeList(reservations),
		repairs: serializeList(repairs),
		settings: serializeDoc(settings),
		serverTime: new Date().toISOString()
	});
}
