const cinemaService = require('../services/cinemaService');
const asyncHandler = require('../utils/asyncHandler');

const createCinema = asyncHandler(async (req, res) => {
  const cinema = await cinemaService.createCinema(req.body);
  res.status(201).json(cinema);
});

const listCinemas = asyncHandler(async (_req, res) => {
  res.json(await cinemaService.listCinemas());
});

const getCinema = asyncHandler(async (req, res) => {
  res.json(await cinemaService.getCinema(req.params.id));
});

const getBookingQuote = asyncHandler(async (req, res) => {
  res.json(await cinemaService.getBookingQuote(req.params.id, req.query.groupSize));
});

module.exports = { createCinema, listCinemas, getCinema, getBookingQuote };
