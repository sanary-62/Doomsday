const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/doomsday_ready';

/**
 * Connect to MongoDB and make sure the unique indexes exist before serving traffic.
 * @param {string} [uri] defaults to MONGODB_URI or a local database
 */
const connectDatabase = async (uri = process.env.MONGODB_URI || DEFAULT_URI) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return mongoose.connection;
};

const disconnectDatabase = () => mongoose.disconnect();

module.exports = { connectDatabase, disconnectDatabase };
