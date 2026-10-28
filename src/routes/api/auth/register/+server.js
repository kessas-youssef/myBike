import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { getDb } from '$lib/server/db.js';
import { createToken, setSessionCookie } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
	const body = await request.json().catch(() => ({}));
	const name = String(body.name || '').trim();
	const email = String(body.email || '').trim().toLowerCase();
	const phone = String(body.phone || '').trim();
	const address = String(body.address || '').trim();
	const password = String(body.password || '');

	if (!name || !email || !password) {
		return json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
	}
	if (password.length < 6) {
		return json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
	}

	const db = getDb();
	const existing = await db
		.collection('users')
		.findOne({ email }, { collation: { locale: 'en', strength: 2 } });

	if (existing) {
		// Djo can create a client from the dashboard before that person signs up.
		// The first registration with the same email claims that placeholder.
		if (existing.role === 'client' && !existing.password) {
			const now = new Date();
			const profile = {
				name: name || existing.name || '',
				phone: phone || existing.phone || '',
				address: address || existing.address || '',
				password: await bcrypt.hash(password, 10),
				updatedAt: now
			};
			await db.collection('users').updateOne({ _id: existing._id }, { $set: profile });

			const user = {
				_id: existing._id,
				name: profile.name,
				email,
				role: 'client',
				phone: profile.phone,
				address: profile.address
			};
			const token = createToken(user);
			setSessionCookie(cookies, token);

			return json({
				user: {
					id: existing._id.toString(),
					name: profile.name,
					email,
					role: 'client',
					phone: profile.phone,
					address: profile.address
				}
			});
		}

		return json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
	}

	const hash = await bcrypt.hash(password, 10);
	const now = new Date();
	const result = await db.collection('users').insertOne({
		name,
		email,
		phone,
		address,
		password: hash,
		role: 'client',
		createdAt: now,
		updatedAt: now
	});

	const user = { _id: result.insertedId, name, email, role: 'client', phone, address };
	const token = createToken(user);
	setSessionCookie(cookies, token);

	return json(
		{
			user: {
				id: result.insertedId.toString(),
				name,
				email,
				role: 'client',
				phone,
				address
			}
		},
		{ status: 201 }
	);
}
