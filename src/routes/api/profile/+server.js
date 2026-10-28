import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { toMongoId } from '$lib/server/ids.js';

export async function PUT({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const name = String(body.name || '').trim();
	const phone = String(body.phone || '').trim();
	const address = String(body.address || '').trim();

	if (!name) return json({ error: 'Le nom est requis' }, { status: 400 });

	const db = getDb();
	const result = await db.collection('users').updateOne(
		{ _id: toMongoId(session.id) },
		{ $set: { name, phone, address, updatedAt: new Date() } }
	);

	if (!result.matchedCount) return json({ error: 'Utilisateur introuvable' }, { status: 404 });

	return json({ success: true, user: { ...session, name, phone, address } });
}
