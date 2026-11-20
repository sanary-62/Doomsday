const movieService = require('../services/movieService');

const asyncHandler = require('../utils/asyncHandler');

const createMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.createMovie(req.body);
  res.status(201).json(movie);
});

const listMovies = asyncHandler(async (_req, res) => {
  res.json(await movieService.listMovies());
});

const getMovie = asyncHandler(async (req, res) => {
  res.json(await movieService.getMovie(req.params.id));
});

const updateMovie = asyncHandler(async (req, res) => {
  res.json(await movieService.updateMovie(req.params.id, req.body));
});

const deleteMovie = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  res.json(await movieService.deleteMovie(req.params.id, { force }));
});

const getRewatchOrder = asyncHandler(async (req, res) => {
  res.json(await movieService.getRewatchOrder(req.params.id));
});

module.exports = { createMovie, listMovies, getMovie, updateMovie, deleteMovie, getRewatchOrder };
