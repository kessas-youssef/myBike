import {
	defaultAccessories,
	defaultPromotions,
	defaultSettings,
	defaultVehicles
} from '$lib/defaults.js';

const CACHE_KEY = 'mybike:public-cache';

export const publicStore = $state({
	settings: { ...defaultSettings },
	vehicles: [...defaultVehicles],
	accessories: [...defaultAccessories],
	promotions: [...defaultPromotions],
	loaded: false,
	error: ''
});

let loading = null;

function apply(data, fromCache) {
	publicStore.settings = { ...defaultSettings, ...(data.settings || {}) };
	publicStore.vehicles = Array.isArray(data.vehicles) ? data.vehicles : [...defaultVehicles];
	publicStore.accessories = Array.isArray(data.accessories)
		? data.accessories
		: [...defaultAccessories];
	publicStore.promotions = Array.isArray(data.promotions) ? data.promotions : [...defaultPromotions];
	publicStore.loaded = true;
	if (!fromCache) publicStore.error = '';
}

function readCache() {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
	} catch {
		return null;
	}
}

export async function loadPublic({ force = false } = {}) {
	if (loading) return loading;

	loading = (async () => {
		const cached = readCache();
		if (cached) apply(cached, true);

		try {
			const response = await fetch('/api/public');
			if (!response.ok) throw new Error(`Données indisponibles (${response.status})`);
			const data = await response.json();
			apply(data, false);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(CACHE_KEY, JSON.stringify(data));
			}
		} catch (error) {
			publicStore.error = error?.message || 'Données indisponibles hors ligne';
			if (!cached) apply({}, true);
		}
	})().finally(() => {
		loading = null;
	});

	return loading;
}

export function applyPublicSettings(settings) {
	publicStore.settings = { ...publicStore.settings, ...settings };
}
