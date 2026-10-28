import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getSession } from '$lib/server/auth.js';
import { toMongoId } from '$lib/server/ids.js';

export async function POST({ request, cookies }) {
	const body = await request.json().catch(() => ({}));

	// Simple honeypot for bots. Real users never see this field.
	if (String(body.website || '').trim()) {
		return json({ success: true, _id: 'ignored' }, { status: 201 });
	}

	const session = getSession(cookies);
	const db = getDb();
	const user = session ? await db.collection('users').findOne({ _id: toMongoId(session.id) }) : null;

	const clientName = String(body.clientName || user?.name || '').trim();
	const clientPhone = String(body.clientPhone || user?.phone || '').trim();
	const deviceType = body.deviceType === 'trottinette' ? 'trottinette' : 'bike';
	const deviceName = String(body.deviceName || '').trim();
	const issue = String(body.issue || '').trim();
	const preferredDate = body.preferredDate ? new Date(body.preferredDate) : null;
	const notes = String(body.notes || '').trim();

	if (!clientName || !clientPhone || !issue) {
		return json({ error: 'Nom, téléphone et description du problème sont requis' }, { status: 400 });
	}

	const now = new Date();
	const result = await db.collection('repairs').insertOne({
		clientId: user ? user._id.toString() : null,
		clientName,
		clientPhone,
		deviceType,
		deviceName,
		issue,
		status: 'requested',
		estimatedPrice: 0,
		finalPrice: 0,
		notes,
		preferredDate:
			preferredDate && !Number.isNaN(preferredDate.getTime()) ? preferredDate : null,
		receivedAt: null,
		dueDate: null,
		deliveredAt: null,
		source: user ? 'portal' : 'guest',
		createdAt: now,
		updatedAt: now
	});

	return json({ success: true, _id: result.insertedId.toString() }, { status: 201 });
}
