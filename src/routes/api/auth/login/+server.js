import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { getDb } from '$lib/server/db.js';
import { createToken, setSessionCookie } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
	const body = await request.json().catch(() => ({}));
	const email = String(body.email || '').trim().toLowerCase();
	const password = String(body.password || '');

	if (!email || !password) {
		return json({ error: 'Email et mot de passe requis' }, { status: 400 });
	}

	const db = getDb();
	const user = await db
		.collection('users')
		.findOne({ email }, { collation: { locale: 'en', strength: 2 } });
	if (!user || user._deleted) {
		return json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
	}
	if (!user.password) {
		return json(
			{ error: 'Ce compte n’a pas encore de mot de passe. Créez un compte avec cet email.' },
			{ status: 401 }
		);
	}

	const valid = await bcrypt.compare(password, user.password);
	if (!valid) {
		return json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
	}

	const token = createToken(user);
	setSessionCookie(cookies, token);

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
