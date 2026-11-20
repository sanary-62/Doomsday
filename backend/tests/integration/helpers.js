const mongoose = require('mongoose');
const createApp = require('../../src/app');
const { connectDatabase, disconnectDatabase } = require('../../src/config/db');
const Movie = require('../../src/models/Movie');
const Cinema = require('../../src/models/Cinema');
const { seedDatabase } = require('../../src/seed/seed');

const TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/doomsday_ready_test';

const setupDatabase = async () => {
  if (!/test/i.test(new URL(TEST_URI).pathname)) {
    throw new Error('Refusing to run tests against a database whose name does not contain "test".');
  }
  await connectDatabase(TEST_URI);
  return createApp();
};

const resetDatabase = async () => {
  await Promise.all([Movie.deleteMany({}), Cinema.deleteMany({})]);
};

const seedExample = async () => {
  await resetDatabase();
  await seedDatabase();
  const movies = await Movie.find({}).lean();
  const idOf = Object.fromEntries(movies.map((m) => [m.title, String(m._id)]));
  return idOf;
};

const teardownDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
};

module.exports = { setupDatabase, resetDatabase, seedExample, teardownDatabase };
