import { ObjectId } from 'mongodb';

/** Accept both legacy ObjectId strings and the UUID strings created offline. */
export function toMongoId(id) {
	if (id instanceof ObjectId) return id;
	if (typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) return new ObjectId(id);
	return id;
}

export function idString(id) {
	if (id === null || id === undefined) return id;
	return typeof id === 'string' ? id : id.toString();
}

/** Convert a MongoDB document (or array) into JSON-safe, string-id data. */
export function serializeDoc(doc) {
	if (!doc) return doc;
	const out = { ...doc, _id: idString(doc._id) };
	return out;
}

export function serializeList(docs) {
	return docs.map(serializeDoc);
}
