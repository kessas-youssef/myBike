/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const ASSETS = `mybike-assets-${version}`;
const PAGES = `mybike-pages-${version}`;
const API_CACHE = 'mybike-api';
const IMAGE_CACHE = 'mybike-images';
const OFFLINE_URL = '/offline';

const PRECACHE = [...build, ...files];

async function precache() {
	const assets = await caches.open(ASSETS);
	await Promise.allSettled(
		PRECACHE.map(async (url) => {
			try {
				await assets.add(url);
			} catch {
				// A single missing asset must not break the whole install.
			}
		})
	);

	const pages = await caches.open(PAGES);
	await Promise.allSettled(
		[OFFLINE_URL, '/'].map(async (url) => {
			try {
				await pages.add(url);
			} catch {
				// The page can still be cached on first visit.
			}
		})
	);
}

self.addEventListener('install', (event) => {
	event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => key.startsWith('mybike-') && ![ASSETS, PAGES, API_CACHE, IMAGE_CACHE].includes(key))
					.map((key) => caches.delete(key))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cacheFirst(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) cache.put(request, response.clone());
	return response;
}

async function staleWhileRevalidate(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((response) => {
			if (response.ok) cache.put(request, response.clone());
			return response;
		})
		.catch(() => null);
	return cached || (await network) || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
}

async function handleNavigation(request) {
	const cache = await caches.open(PAGES);

	try {
		const response = await fetch(request);
		if (response.ok && response.type === 'basic') {
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const exact = await cache.match(request, { ignoreSearch: true });
		if (exact) return exact;

		const url = new URL(request.url);
		const section = url.pathname.split('/').filter(Boolean)[0];
		if (section) {
			const sectionFallback = await cache.match(`/${section}`, { ignoreSearch: true });
			if (sectionFallback) return sectionFallback;
		}

		const offline = await caches.match(OFFLINE_URL);
		if (offline) return offline;

		const root = await caches.match('/');
		if (root) return root;

		return new Response(
			'<!doctype html><html lang="fr"><meta charset="utf-8"><title>Hors ligne</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Vous êtes hors ligne</h1><p>Ouvrez l’application une première fois avec internet pour l’utiliser hors ligne.</p></body></html>',
			{ status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
		);
	}
}

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (url.pathname.startsWith('/api/')) {
		if (url.pathname === '/api/public' || url.pathname === '/api/health') {
			event.respondWith(staleWhileRevalidate(request, API_CACHE));
		}
		// Authenticated APIs are deliberately never cached.
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(handleNavigation(request));
		return;
	}

	if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) {
		event.respondWith(cacheFirst(request, IMAGE_CACHE));
		return;
	}

	event.respondWith(cacheFirst(request, ASSETS));
});
