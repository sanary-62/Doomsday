const Movie = require('../models/Movie');
const AppError = require('../utils/AppError');
const { validateMoviePayload } = require('../utils/validators');
const { buildGraph, wouldCreateCycle, topologicalPrerequisites } = require('./graphService');

const CIRCULAR_MESSAGE = 'This prerequisite selection creates a circular dependency.';

const loadGraph = async () => buildGraph(await Movie.find({}, { prerequisites: 1 }).lean());

const assertValid = ({ errors, value }) => {
  if (errors.length > 0) throw AppError.validation(errors);
  return value;
};

const assertTitleAvailable = async (title, excludeId) => {
  const filter = { title };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Movie.findOne(filter).collation({ locale: 'en', strength: 2 }).lean();
  if (existing) {
    throw AppError.conflict('DUPLICATE_TITLE', `A movie titled "${title}" already exists.`);
  }
};

const assertPrerequisitesExist = async (prerequisiteIds) => {
  if (prerequisiteIds.length === 0) return;
  const found = await Movie.countDocuments({ _id: { $in: prerequisiteIds } });
  if (found !== prerequisiteIds.length) {
    throw AppError.badRequest('INVALID_PREREQUISITE', 'One or more prerequisite movies do not exist.', [
      { field: 'prerequisites', message: 'One or more prerequisite movies do not exist.' },
    ]);
  }
};

/** Throws a 409 CIRCULAR_DEPENDENCY error when the proposed prerequisites would create a cycle. */
const assertNoCycle = async (movieId, prerequisiteIds) => {
  const graph = await loadGraph();
  if (wouldCreateCycle(graph, String(movieId), prerequisiteIds.map(String))) {
    throw AppError.conflict('CIRCULAR_DEPENDENCY', CIRCULAR_MESSAGE);
  }
};

const listMovies = () => Movie.find({}).sort({ releaseYear: 1, title: 1 });

const getMovie = async (id) => {
  const movie = await Movie.findById(id);
  if (!movie) throw AppError.notFound('Movie not found.');
  return movie;
};

const createMovie = async (body) => {
  const data = assertValid(validateMoviePayload(body, { partial: false }));
  const prerequisites = data.prerequisites || [];

  await assertTitleAvailable(data.title);
  await assertPrerequisitesExist(prerequisites);

  const movie = new Movie({ ...data, prerequisites });
  await assertNoCycle(movie._id, prerequisites);
  return movie.save();
};

const updateMovie = async (id, body) => {
  const data = assertValid(validateMoviePayload(body, { partial: true }));
  const movie = await getMovie(id);

  if (data.title !== undefined && data.title.toLowerCase() !== movie.title.toLowerCase()) {
    await assertTitleAvailable(data.title, movie._id);
  }

  if (data.prerequisites !== undefined) {
    await assertPrerequisitesExist(data.prerequisites);
    await assertNoCycle(movie._id, data.prerequisites);
  }

  movie.set(data);
  return movie.save();
};

/**
 * Delete a movie. If other movies list it as a prerequisite the delete is refused (409)
 * unless `force` is true, in which case the reference is removed from those movies first.
 */
const deleteMovie = async (id, { force = false } = {}) => {
  const movie = await getMovie(id);
  const dependents = await Movie.find({ prerequisites: movie._id }, { title: 1 }).lean();

  if (dependents.length > 0 && !force) {
    const titles = dependents.map((d) => d.title).join(', ');
    throw AppError.conflict(
      'HAS_DEPENDENTS',
      `"${movie.title}" is a prerequisite of: ${titles}. Remove it from them first or delete with force.`
    );
  }

  if (dependents.length > 0) {
    await Movie.updateMany({ prerequisites: movie._id }, { $pull: { prerequisites: movie._id } });
  }
  await movie.deleteOne();
  return { id: String(movie._id), title: movie.title, removedFromDependents: dependents.length };
};

/**
 * Everything the target movie requires, in prerequisite-first order, plus progress statistics.
 * The target movie is excluded from the list and from every statistic.
 */
const getRewatchOrder = async (id) => {
  const movies = await Movie.find({}).lean();
  const byId = new Map(movies.map((m) => [String(m._id), m]));
  const target = byId.get(String(id));
  if (!target) throw AppError.notFound('Movie not found.');

  let orderedIds;
  try {
    orderedIds = topologicalPrerequisites(buildGraph(movies), String(id));
  } catch (error) {
    if (error.code === 'CYCLE_DETECTED') {
      throw AppError.conflict('CIRCULAR_DEPENDENCY', CIRCULAR_MESSAGE);
    }
    throw error;
  }

  const ordered = orderedIds.map((movieId) => {
    const movie = byId.get(movieId);
    return {
      id: movieId,
      title: movie.title,
      releaseYear: movie.releaseYear ?? null,
      runtime: movie.runtime,
      watched: movie.watched,
    };
  });

  return {
    targetMovie: { id: String(target._id), title: target.title },
    movies: ordered,
    watchedCount: ordered.filter((m) => m.watched).length,
    totalMovies: ordered.length,
    remainingRuntime: ordered.filter((m) => !m.watched).reduce((sum, m) => sum + m.runtime, 0),
  };
};

module.exports = {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  getRewatchOrder,
};
