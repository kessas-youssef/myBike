import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ user: null });

	const db = await getDb();
	const user = await db.collection('users').findOne({ _id: new ObjectId(session.id) });
	if (!user) return json({ user: null });

	return json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
}
