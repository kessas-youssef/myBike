import { connectDb } from '$lib/server/db.js';
import { seedDb } from '$lib/server/seed.js';

await connectDb();
await seedDb();
