/**
 * Example data from the assessment. Order matters: prerequisites are listed before
 * the movies that need them so each one can be created in a single pass.
 *
 * Avengers: Doomsday has no official runtime yet; 150 minutes is an estimate used for demo data.
 */
const movies = [
  { title: 'Iron Man', releaseYear: 2008, runtime: 126, prerequisites: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtime: 124, prerequisites: [] },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    runtime: 143,
    prerequisites: ['Iron Man', 'Captain America: The First Avenger'],
  },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtime: 147, prerequisites: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtime: 130, prerequisites: [] },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtime: 149,
    prerequisites: ['Captain America: Civil War', 'Thor: Ragnarok'],
  },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtime: 181, prerequisites: ['Avengers: Infinity War'] },
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtime: 150, prerequisites: ['Avengers: Endgame'] },
];

const cinemas = [
  { name: 'Grand Screen Cineplex', bundleSizes: [1, 3, 4] },
  { name: 'Metro Cinema Hall', bundleSizes: [2, 5] },
  { name: 'IMAX Palace', bundleSizes: [6, 9, 20] },
  { name: 'Boutique Cinema', bundleSizes: [4, 6] },
];

module.exports = { movies, cinemas };
