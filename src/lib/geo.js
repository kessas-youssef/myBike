const EARTH_RADIUS_M = 6371000;

/** Distance in metres between two {lat,lng} points. */
export function distanceMeters(a, b) {
	if (!a || !b) return null;
	const lat1 = Number(a.lat);
	const lng1 = Number(a.lng);
	const lat2 = Number(b.lat);
	const lng2 = Number(b.lng);
	if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

	const toRad = (value) => (value * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
	return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function isOutsideGeofence(point, center, radius) {
	const distance = distanceMeters(point, center);
	if (distance === null) return { outside: false, distance: null };
	return { outside: distance > Number(radius || 0), distance };
}

export function googleMapsUrl(point) {
	if (!point) return '';
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
}

export function osmEmbedUrl(point, zoom = 15) {
	if (!point) return '';
	const lat = Number(point.lat);
	const lng = Number(point.lng);
	const delta = 0.01;
	const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join('%2C');
	return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}&zoom=${zoom}`;
}
