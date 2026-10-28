import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import bcrypt from 'bcryptjs';
import { createToken } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
	const { email, password } = await request.json();
	if (!email || !password) {
		return json({ error: 'Email et mot de passe requis' }, { status: 400 });
	}

	const db = await getDb();
	const user = await db.collection('users').findOne({ email });
	if (!user) {
		return json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
	}

	const valid = await bcrypt.compare(password, user.password);
	if (!valid) {
		return json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
	}

	const token = createToken(user);
	cookies.set('session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

	return json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}
