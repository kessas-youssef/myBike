import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

const SECRET = env.JWT_SECRET || 'mybike-dev-secret-change-me-in-production';
const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7;

export function createToken(user) {
	return jwt.sign(
		{
			id: user._id.toString(),
			email: user.email,
			role: user.role,
			name: user.name
		},
		SECRET,
		{ expiresIn: '7d' }
	);
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, SECRET);
	} catch {
		return null;
	}
}

export function getSession(cookies) {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;
	return verifyToken(token);
}

export function setSessionCookie(cookies, token) {
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isProduction,
		maxAge: MAX_AGE
	});
}

export function clearSessionCookie(cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export function isAdmin(session) {
	return session?.role === 'admin';
}

export function hasWeakSecret() {
	return !env.JWT_SECRET;
}
