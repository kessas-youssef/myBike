const DATE_LOCALE = 'fr-FR';

export function asDate(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = {}) {
	const date = asDate(value);
	if (!date) return '—';
	return date.toLocaleDateString(DATE_LOCALE, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		...options
	});
}

export function formatDateTime(value, options = {}) {
	const date = asDate(value);
	if (!date) return '—';
	return date.toLocaleString(DATE_LOCALE, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		...options
	});
}

export function formatTime(value) {
	const date = asDate(value);
	if (!date) return '—';
	return date.toLocaleTimeString(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' });
}

export function formatMoney(value, currency = 'DA') {
	const number = Number(value || 0);
	return `${number.toLocaleString(DATE_LOCALE, { maximumFractionDigits: 0 })} ${currency}`;
}

export function durationText(ms) {
	const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (days > 0) return `${days}j ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

export function timeLeft(endTime, now = Date.now()) {
	const end = asDate(endTime);
	if (!end) return { text: '—', expired: true, ms: 0 };
	const ms = end.getTime() - now;
	return { text: durationText(Math.max(0, ms)), expired: ms <= 0, ms };
}

export function relativeTime(value, now = Date.now()) {
	const date = asDate(value);
	if (!date) return '—';
	const diff = now - date.getTime();
	if (diff < 0) return 'dans quelques instants';
	if (diff < 60_000) return 'à l’instant';
	if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
	if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
	return `il y a ${Math.floor(diff / 86_400_000)} j`;
}

export function toDateTimeInput(value) {
	const date = asDate(value) || new Date();
	const offset = date.getTimezoneOffset();
	return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function toDateInput(value) {
	const date = asDate(value) || new Date();
	const offset = date.getTimezoneOffset();
	return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function todayInput() {
	return toDateInput(new Date());
}

export function isToday(value) {
	const date = asDate(value);
	if (!date) return false;
	const now = new Date();
	return (
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()
	);
}

export function isOverdue(rental, now = Date.now()) {
	if (!rental || rental.status !== 'active') return false;
	const end = asDate(rental.endTime);
	return Boolean(end && end.getTime() < now);
}

export function statusLabel(status) {
	const labels = {
		upcoming: 'À venir',
		active: 'En cours',
		completed: 'Terminée',
		cancelled: 'Annulée',
		overdue: 'En retard',
		pending: 'En attente',
		confirmed: 'Confirmée',
		converted: 'Convertie',
		requested: 'Demande reçue',
		received: 'Déposé',
		diagnosing: 'Diagnostic',
		waiting_parts: 'Attente pièces',
		in_progress: 'En réparation',
		ready: 'Prêt',
		delivered: 'Livré'
	};
	return labels[status] || status || '—';
}

export function statusTone(status) {
	const tones = {
		active: 'emerald',
		upcoming: 'blue',
		completed: 'gray',
		cancelled: 'red',
		overdue: 'red',
		pending: 'yellow',
		confirmed: 'emerald',
		converted: 'gray',
		requested: 'yellow',
		received: 'blue',
		diagnosing: 'blue',
		waiting_parts: 'orange',
		in_progress: 'indigo',
		ready: 'emerald',
		delivered: 'gray'
	};
	return tones[status] || 'gray';
}

export function initials(name = '') {
	return String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() || '')
		.join('');
}

export function phoneHref(phone = '') {
	const clean = String(phone).replace(/[^\d+]/g, '');
	return clean ? `tel:${clean}` : '';
}

export function whatsappHref(phone = '', message = '') {
	const clean = String(phone).replace(/[^\d]/g, '');
	if (!clean) return '';
	const text = message ? `?text=${encodeURIComponent(message)}` : '';
	return `https://wa.me/${clean}${text}`;
}
