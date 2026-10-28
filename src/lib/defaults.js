// Shared defaults used by the server seed and the offline-first client.
// Keep this file free of server-only imports.

export const SHOP_LOCATION = { lat: 35.7256, lng: -0.585 };

export const defaultServices = [
	{
		title: 'Location',
		description:
			'Vélos, VTT et trottinettes électriques à l’heure, à la journée ou à la semaine. Casque et antivol inclus sur demande.',
		icon: 'bike'
	},
	{
		title: 'Réparation',
		description:
			'Entretien, freins, chaînes, pneus, batterie et diagnostic trottinette. Djo répare sur place, souvent le jour même.',
		icon: 'wrench'
	},
	{
		title: 'Accessoires',
		description:
			'Casques, gants, antivols, lumières, sacoches et pièces détachées pour rouler en sécurité.',
		icon: 'shield'
	},
	{
		title: 'Balades en forêt',
		description:
			'Départ direct pour la forêt de Canastel. Itinéraires conseillés et cartes disponibles au shop.',
		icon: 'tree'
	}
];

export const defaultGallery = [
	{
		url: '/images/workshop.jpg',
		caption: 'L’atelier de Djo, au pied de la forêt de Canastel'
	},
	{
		url: '/images/bike-city.jpg',
		caption: 'Un vélo de ville prêt pour la balade'
	},
	{
		url: '/images/bike-mountain.jpg',
		caption: 'Les sentiers de la forêt de Canastel'
	},
	{
		url: '/images/scooter.png',
		caption: 'Trottinette électrique, autonomie 25 km'
	}
];

export const defaultSettings = {
	_id: 'settings',
	shopName: 'MyBike Djo',
	tagline: 'Location & réparation de vélos et trottinettes électriques',
	heroBadge: 'Forêt de Canastel · Oran',
	heroTitle: 'Roulez librement avec MyBike Djo',
	heroSubtitle:
		'Location, réparation et accessoires de vélos & trottinettes électriques au cœur de la forêt de Canastel, à Oran.',
	heroImage: '/images/workshop.jpg',
	heroCta: 'Réserver maintenant',
	primaryColor: '#047857',
	accentColor: '#facc15',
	phone: '0555 00 00 00',
	whatsapp: '213555000000',
	email: 'djo@mybike.dz',
	address: 'Forêt de Canastel, Oran, Algérie',
	openingHours: 'Tous les jours · 09h00 – 19h00',
	mapUrl: 'https://www.google.com/maps/search/?api=1&query=For%C3%AAt+de+Canastel+Oran',
	instagram: '',
	facebook: '',
	aboutTitle: 'Djo, votre mécanicien de quartier',
	aboutText:
		'Depuis des années, Djo répare et entretient les vélos et trottinettes du quartier. Son atelier se trouve juste à l’entrée de la forêt de Canastel : un point de départ idéal pour une balade, et un endroit sûr pour confier votre machine. Location, réparation, accessoires : tout est fait sur place, avec le sourire.',
	aboutImage: '/images/workshop.jpg',
	services: defaultServices,
	gallery: defaultGallery,
	promoEnabled: true,
	promoText: 'Offre de lancement : -20 % sur votre première location avec le code CANASTEL20',
	promoCode: 'CANASTEL20',
	rentalTerms:
		'La location est consentie pour la durée indiquée. Une pièce d’identité est conservée pendant toute la location. Le locataire s’engage à rester joignable, à respecter le code de la route et à signaler immédiatement toute perte, vol ou panne. Le dépôt de garantie est restitué au retour du matériel en bon état.',
	idRequired: true,
	depositBike: 5000,
	depositScooter: 15000,
	shopLocation: SHOP_LOCATION,
	geofenceRadius: 1500,
	trackingIntervalSec: 30,
	currency: 'DA',
	updatedAt: null
};

export const defaultVehicles = [
	{
		_id: 'veh_vtt_canastel',
		name: 'VTT Canastel',
		type: 'bike',
		brand: 'Décathlon',
		model: 'Rockrider ST 100',
		color: 'Vert forêt',
		colorHex: '#047857',
		pricePerHour: 300,
		pricePerDay: 1500,
		deposit: 5000,
		stock: 6,
		available: 6,
		image: '/images/bike-mountain.jpg',
		description: 'VTT robuste, parfait pour les sentiers de la forêt et les sorties en famille.',
		equipment: ['Casque', 'Antivol', 'Kit réparation', 'Gourde'],
		active: true
	},
	{
		_id: 'veh_ville_oran',
		name: 'Vélo de ville Oran',
		type: 'bike',
		brand: 'City Bike',
		model: 'Cruiser',
		color: 'Bleu nuit',
		colorHex: '#1d4ed8',
		pricePerHour: 250,
		pricePerDay: 1200,
		deposit: 5000,
		stock: 8,
		available: 8,
		image: '/images/bike-city.jpg',
		description: 'Vélo confortable pour se déplacer en ville ou longer la corniche.',
		equipment: ['Casque', 'Antivol', 'Panier'],
		active: true
	},
	{
		_id: 'veh_trott_electrique',
		name: 'Trottinette électrique',
		type: 'trottinette',
		brand: 'Xiaomi',
		model: 'Mi Electric',
		color: 'Noir',
		colorHex: '#111827',
		pricePerHour: 800,
		pricePerDay: 3500,
		deposit: 15000,
		stock: 4,
		available: 4,
		image: '/images/scooter.png',
		description: 'Trottinette électrique puissante, autonomie 25 km. Chargeur fourni.',
		equipment: ['Casque', 'Antivol', 'Chargeur', 'Gants'],
		active: true
	}
];

export const defaultAccessories = [
	{ _id: 'acc_casque', name: 'Casque', category: 'protection', price: 1500, stock: 20, image: '', description: 'Casque réglable, toutes tailles.', active: true },
	{ _id: 'acc_gants', name: 'Gants', category: 'protection', price: 800, stock: 15, image: '', description: 'Gants renforcés pour la conduite.', active: true },
	{ _id: 'acc_antivol', name: 'Antivol', category: 'securite', price: 2000, stock: 25, image: '', description: 'Antivol en U avec clé.', active: true },
	{ _id: 'acc_lumieres', name: 'Lumières LED', category: 'accessoire', price: 1200, stock: 30, image: '', description: 'Éclairage avant et arrière rechargeable.', active: true },
	{ _id: 'acc_pompe', name: 'Pompe à vélo', category: 'outil', price: 1000, stock: 10, image: '', description: 'Pompe compacte avec manomètre.', active: true },
	{ _id: 'acc_sacoche', name: 'Sacoche de guidon', category: 'accessoire', price: 1800, stock: 12, image: '', description: 'Sacoche étanche avec poche téléphone.', active: true },
	{ _id: 'acc_huile', name: 'Huile chaîne', category: 'entretien', price: 500, stock: 20, image: '', description: 'Lubrifiant chaîne, flacon 100 ml.', active: true }
];

export const defaultPromotions = [
	{
		_id: 'promo_canastel20',
		title: 'Première location -20 %',
		description: 'Profitez de 20 % de réduction sur votre première location de vélo ou trottinette.',
		code: 'CANASTEL20',
		discountType: 'percent',
		discountValue: 20,
		startDate: null,
		endDate: null,
		active: true,
		image: '/images/bike-city.jpg',
		color: '#047857'
	}
];

export const defaultRepairStatuses = [
	{ value: 'requested', label: 'Demande reçue', tone: 'yellow' },
	{ value: 'received', label: 'Déposé au shop', tone: 'blue' },
	{ value: 'diagnosing', label: 'Diagnostic', tone: 'blue' },
	{ value: 'waiting_parts', label: 'Attente pièces', tone: 'orange' },
	{ value: 'in_progress', label: 'En réparation', tone: 'indigo' },
	{ value: 'ready', label: 'Prêt', tone: 'emerald' },
	{ value: 'delivered', label: 'Livré', tone: 'gray' },
	{ value: 'cancelled', label: 'Annulé', tone: 'red' }
];
