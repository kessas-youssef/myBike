import { json } from '@sveltejs/kit';
import { pingDb } from '$lib/server/db.js';

export async function GET() {
	try {
		await pingDb();
		return json({ ok: true, database: 'connected', time: new Date().toISOString() });
	} catch (error) {
		return json(
			{ ok: false, database: 'unavailable', error: error?.message || 'Erreur inconnue' },
			{ status: 503 }
		);
	}
}
