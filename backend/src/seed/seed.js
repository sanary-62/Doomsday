require('dotenv').config({ quiet: true });
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const movieService = require('../services/movieService');
const cinemaService = require('../services/cinemaService');
const { connectDatabase, disconnectDatabase } = require('../config/db');
const seedData = require('./seedData');

/**
 * Insert the assessment's example movies and some demo cinemas.
 * Idempotent: existing records (matched by title / name) are updated or skipped, never duplicated,
 * and records that are not part of the seed data are left untouched.
 * Goes through the same services as the API, so every seeded graph is validated for cycles.
 */
const seedDatabase = async () => {
  const idByTitle = new Map();
  let created = 0;
  let updated = 0;

  for (const entry of seedData.movies) {
    const prerequisites = entry.prerequisites.map((title) => idByTitle.get(title));
    const existing = await Movie.findOne({ title: entry.title }).collation({ locale: 'en', strength: 2 });

    if (existing) {
      await movieService.updateMovie(existing.id, {
        releaseYear: entry.releaseYear,
        runtime: entry.runtime,
        prerequisites,
      });
      idByTitle.set(entry.title, existing.id);
      updated += 1;
    } else {
      const movie = await movieService.createMovie({
        title: entry.title,
        releaseYear: entry.releaseYear,
        runtime: entry.runtime,
        prerequisites,
      });
      idByTitle.set(entry.title, movie.id);
      created += 1;
    }
  }

  let cinemasCreated = 0;
  for (const entry of seedData.cinemas) {
    const existing = await Cinema.findOne({ name: entry.name }).collation({ locale: 'en', strength: 2 }).lean();
    if (!existing) {
      await cinemaService.createCinema(entry);
      cinemasCreated += 1;
    }
  }

  return { moviesCreated: created, moviesUpdated: updated, cinemasCreated };
};

if (require.main === module) {
  connectDatabase()
    .then(seedDatabase)
    .then((summary) => {
      console.log('Seed complete:', summary);
      return disconnectDatabase();
    })
    .catch(async (error) => {
      console.error('Seed failed:', error.message);
      await disconnectDatabase();
      process.exit(1);
    });
}

module.exports = { seedDatabase };
