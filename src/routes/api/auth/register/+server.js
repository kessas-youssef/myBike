import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import bcrypt from 'bcryptjs';
import { createToken } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
	const { name, email, phone, password } = await request.json();
	if (!name || !email || !password) {
		return json({ error: 'Champs requis manquants' }, { status: 400 });
	}

	const db = await getDb();
	const existing = await db.collection('users').findOne({ email });
	if (existing) {
		return json({ error: 'Email déjà utilisé' }, { status: 400 });
	}

	const hash = await bcrypt.hash(password, 10);
	const result = await db.collection('users').insertOne({
		name, email, phone, password: hash,
		role: 'client',
		createdAt: new Date()
	});

	const user = { _id: result.insertedId, name, email, role: 'client' };
	const token = createToken(user);
	cookies.set('session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

	return json({ user }, { status: 201 });
}
