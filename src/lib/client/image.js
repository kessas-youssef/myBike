const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export async function compressImage(
	file,
	{ maxWidth = 1200, maxHeight = 1200, quality = 0.78, mime = 'image/jpeg' } = {}
) {
	if (!file) return '';
	if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image');
	if (file.size > MAX_INPUT_BYTES) throw new Error('Image trop lourde (20 Mo maximum)');

	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		// Fallback for formats createImageBitmap cannot decode.
		const dataUrl = await readAsDataUrl(file);
		const image = await loadImage(dataUrl);
		return drawToDataUrl(image, image.width, image.height, { maxWidth, maxHeight, quality, mime });
	}

	const dataUrl = drawToDataUrl(bitmap, bitmap.width, bitmap.height, {
		maxWidth,
		maxHeight,
		quality,
		mime
	});
	bitmap.close?.();
	return dataUrl;
}

function drawToDataUrl(source, width, height, { maxWidth, maxHeight, quality, mime }) {
	const scale = Math.min(1, maxWidth / width, maxHeight / height);
	const targetWidth = Math.max(1, Math.round(width * scale));
	const targetHeight = Math.max(1, Math.round(height * scale));
	const canvas = document.createElement('canvas');
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const context = canvas.getContext('2d');

	if (mime === 'image/jpeg') {
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, targetWidth, targetHeight);
	}
	context.drawImage(source, 0, 0, targetWidth, targetHeight);
	return canvas.toDataURL(mime, quality);
}

function readAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function loadImage(src) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Image illisible'));
		image.src = src;
	});
}

export function dataUrlSize(dataUrl = '') {
	const base64 = String(dataUrl).split(',')[1] || '';
	return Math.round((base64.length * 3) / 4);
}

export function prettyBytes(bytes = 0) {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
