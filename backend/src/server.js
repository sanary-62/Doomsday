require('dotenv').config({ quiet: true });
const createApp = require('./app');
const { connectDatabase } = require('./config/db');
const { seedDatabase } = require('./seed/seed');

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  await connectDatabase();
  console.log('MongoDB connected');

  if (process.env.SEED_ON_START === 'true') {
    console.log('Seeded demo data:', await seedDatabase());
  }

  createApp().listen(PORT, () => console.log(`Doomsday Ready API listening on port ${PORT}`));
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
