const USER_KEY = 'mybike:user';
const ADMIN_KEY = 'mybike:admin';

export function cacheUser(user) {
	if (typeof localStorage === 'undefined') return;
	if (!user) {
		localStorage.removeItem(USER_KEY);
		return;
	}
	localStorage.setItem(USER_KEY, JSON.stringify(user));
	if (user.role === 'admin') {
		localStorage.setItem(ADMIN_KEY, JSON.stringify({ ...user, cachedAt: new Date().toISOString() }));
	} else {
		localStorage.removeItem(ADMIN_KEY);
	}
}

export function getCachedUser() {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
	} catch {
		return null;
	}
}

export function getCachedAdmin() {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
	} catch {
		return null;
	}
}

export function clearAuthCache() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(USER_KEY);
	localStorage.removeItem(ADMIN_KEY);
}

export function clearAdminCache() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(ADMIN_KEY);
}
