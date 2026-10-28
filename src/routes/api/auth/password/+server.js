import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { toMongoId } from '$lib/server/ids.js';

export async function POST({ request, cookies }) {
	const session = getSession(cookies);
	if (!session) return json({ error: 'Non autorisé' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const currentPassword = String(body.currentPassword || '');
	const newPassword = String(body.newPassword || '');

	if (newPassword.length < 6) {
		return json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
	}

	const db = getDb();
	const user = await db.collection('users').findOne({ _id: toMongoId(session.id) });
	if (!user) return json({ error: 'Utilisateur introuvable' }, { status: 404 });
	if (!user.password) {
		return json(
			{ error: 'Aucun mot de passe défini pour ce compte. Contactez le shop.' },
			{ status: 400 }
		);
	}

	const valid = await bcrypt.compare(currentPassword, user.password);
	if (!valid) return json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });

	const hash = await bcrypt.hash(newPassword, 10);
	await db.collection('users').updateOne(
		{ _id: user._id },
		{ $set: { password: hash, updatedAt: new Date() } }
	);

	return json({ success: true });
}
