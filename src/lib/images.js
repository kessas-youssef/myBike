import raw from '$lib/assets/images_urls.json';

const images = Object.values(raw).map(item => ({
	url: item.url,
	desc: item.desc
}));

export default images;
