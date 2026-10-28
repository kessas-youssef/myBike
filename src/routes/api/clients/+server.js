import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';

export async function GET({ cookies }) {
	const session = getSession(cookies);
	if (!session || session.role !== 'admin') return json({ error: 'Non autorisé' }, { status: 403 });

	const db = await getDb();
	const clients = await db.collection('users').find({ role: 'client' }).project({ password: 0 }).toArray();
	return json(clients);
}
