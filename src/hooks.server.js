import { json } from '@sveltejs/kit';
import { connectDb } from '$lib/server/db.js';
import { seedDb } from '$lib/server/seed.js';
import { hasWeakSecret } from '$lib/server/auth.js';

let initPromise = null;
let warned = false;

async function initialize() {
	if (!initPromise) {
		initPromise = (async () => {
			await connectDb();
			await seedDb();
			if (hasWeakSecret() && !warned) {
				warned = true;
				console.warn(
					'[auth] JWT_SECRET absent. Définissez JWT_SECRET dans .env (et sur Netlify) avant la mise en production.'
				);
			}
		})().catch((error) => {
			initPromise = null;
			throw error;
		});
	}
	return initPromise;
}

export async function handle({ event, resolve }) {
	try {
		await initialize();
	} catch (error) {
		console.error('[db] initialisation impossible :', error?.message || error);
		if (event.url.pathname.startsWith('/api/')) {
			return json(
				{
					error:
						'Base de données indisponible. Vérifiez la connexion MongoDB Atlas et la variable MONGODB_URI.'
				},
				{ status: 503 }
			);
		}
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
	return response;
}
