import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';
import { toMongoId } from '$lib/server/ids.js';

export async function GET({ cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ user: null });

	const db = getDb();
	const user = await db.collection('users').findOne({ _id: toMongoId(session.id) });
	if (!user) return json({ user: null });

	return json({
		user: {
			id: user._id.toString(),
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone || '',
			address: user.address || ''
		}
	});
}
