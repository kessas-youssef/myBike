import { connectDb, getDb } from './db.js';
import bcrypt from 'bcryptjs';

export async function seedDb() {
	const db = await connectDb();

	const adminExists = await db.collection('users').findOne({ role: 'admin' });
	if (!adminExists) {
		const hash = await bcrypt.hash('admin123', 10);
		await db.collection('users').insertOne({
			name: 'Djo',
			email: 'djo@mybike.dz',
			password: hash,
			role: 'admin',
			createdAt: new Date()
		});
		console.log('Admin user created (djo@mybike.dz / admin123)');
	}

	const vehicleCount = await db.collection('vehicles').countDocuments();
	if (vehicleCount === 0) {
		await db.collection('vehicles').insertMany([
			{ type: 'bike', name: 'VTT Mountain Bike', pricePerHour: 300, stock: 10, available: 10, image: 'https://probike.by/upload/iblock/dc0/2szz093df9kjt5isy1xmfptrriz6r8l5.jpg', description: 'VTT robuste parfait pour la ville et la montagne' },
			{ type: 'bike', name: 'Vélo de Ville', pricePerHour: 300, stock: 8, available: 8, image: 'https://www.joykiebikes.com/uploads/31490/small/2025-new-classic-city-bike-cruiser-bike-for697ce.png', description: 'Vélo de ville élégant pour vos déplacements quotidiens' },
			{ type: 'trottinette', name: 'Trottinette Électrique', pricePerHour: 800, stock: 6, available: 6, image: 'https://i.pinimg.com/originals/31/a4/c8/31a4c808f52a60c55760e4ec0aacf6ad.png', description: 'Trottinette électrique puissante, autonomie 25km' }
		]);
		console.log('Seed vehicles created');
	}

	const accessoryCount = await db.collection('accessories').countDocuments();
	if (accessoryCount === 0) {
		await db.collection('accessories').insertMany([
			{ name: 'Casque', price: 1500, stock: 20, category: 'protection' },
			{ name: 'Gants', price: 800, stock: 15, category: 'protection' },
			{ name: 'Antivol', price: 2000, stock: 25, category: 'securite' },
			{ name: 'Lumières LED', price: 1200, stock: 30, category: 'accessoire' },
			{ name: 'Pompe à vélo', price: 1000, stock: 10, category: 'outil' },
			{ name: 'Sacoche de guidon', price: 1800, stock: 12, category: 'accessoire' },
			{ name: 'Huile chaîne', price: 500, stock: 20, category: 'entretien' }
		]);
		console.log('Seed accessories created');
	}
}
