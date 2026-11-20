const Cinema = require('../models/Cinema');
const AppError = require('../utils/AppError');
const { validateCinemaPayload, validateGroupSize } = require('../utils/validators');
const { calculateMinimumBundles } = require('./bookingService');

const listCinemas = () => Cinema.find({}).sort({ name: 1 });

const getCinema = async (id) => {
  const cinema = await Cinema.findById(id);
  if (!cinema) throw AppError.notFound('Cinema not found.');
  return cinema;
};

const createCinema = async (body) => {
  const { errors, value } = validateCinemaPayload(body);
  if (errors.length > 0) throw AppError.validation(errors);

  const existing = await Cinema.findOne({ name: value.name }).collation({ locale: 'en', strength: 2 }).lean();
  if (existing) {
    throw AppError.conflict('DUPLICATE_NAME', `A cinema named "${value.name}" already exists.`);
  }
  return Cinema.create(value);
};

const getBookingQuote = async (id, rawGroupSize) => {
  const { errors, value: groupSize } = validateGroupSize(rawGroupSize);
  if (errors.length > 0) throw AppError.validation(errors);

  const cinema = await getCinema(id);
  const quote = calculateMinimumBundles(cinema.bundleSizes, groupSize);
  return { cinema: { id: String(cinema._id), name: cinema.name, bundleSizes: cinema.bundleSizes }, ...quote };
};

module.exports = { listCinemas, getCinema, createCinema, getBookingQuote };
