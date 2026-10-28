import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'mybike-super-secret-key-2024';

export function createToken(user) {
	return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, SECRET);
	} catch {
		return null;
	}
}

export function getSession(cookies) {
	const token = cookies.get('session');
	if (!token) return null;
	return verifyToken(token);
}
