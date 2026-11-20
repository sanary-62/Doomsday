const mongoose = require('mongoose');

const LIMITS = Object.freeze({
  TITLE_MAX: 200,
  YEAR_MIN: 1888,
  YEAR_MAX: 2100,
  RUNTIME_MIN: 1,
  RUNTIME_MAX: 300,
  CINEMA_NAME_MAX: 120,
  BUNDLE_COUNT_MIN: 1,
  BUNDLE_COUNT_MAX: 10,
  BUNDLE_SIZE_MIN: 1,
  BUNDLE_SIZE_MAX: 500,
  GROUP_SIZE_MIN: 1,
  GROUP_SIZE_MAX: 10000,
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidObjectId = (value) =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) && mongoose.isValidObjectId(value);

const isIntegerInRange = (value, min, max) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const rejectUnknownFields = (body, allowed, errors) => {
  Object.keys(body).forEach((key) => {
    if (!allowed.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}".` });
    }
  });
};

/**
 * Validate and normalise a movie payload.
 * @param {object} body raw request body
 * @param {{ partial: boolean }} options partial=true for PATCH (all fields optional)
 * @returns {{ errors: object[], value: object }}
 */
const validateMoviePayload = (body, { partial }) => {
  const errors = [];
  const value = {};

  if (!isPlainObject(body)) {
    return { errors: [{ field: 'body', message: 'Request body must be a JSON object.' }], value };
  }

  rejectUnknownFields(body, ['title', 'releaseYear', 'runtime', 'prerequisites', 'watched'], errors);

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push({ field: 'title', message: 'Title is required.' });
    } else if (body.title.trim().length > LIMITS.TITLE_MAX) {
      errors.push({ field: 'title', message: `Title must be at most ${LIMITS.TITLE_MAX} characters.` });
    } else {
      value.title = body.title.trim();
    }
  }

  if (body.releaseYear !== undefined && body.releaseYear !== null) {
    if (!isIntegerInRange(body.releaseYear, LIMITS.YEAR_MIN, LIMITS.YEAR_MAX)) {
      errors.push({
        field: 'releaseYear',
        message: `Release year must be an integer between ${LIMITS.YEAR_MIN} and ${LIMITS.YEAR_MAX}.`,
      });
    } else {
      value.releaseYear = body.releaseYear;
    }
  } else if (body.releaseYear === null) {
    value.releaseYear = null;
  }

  if (body.runtime !== undefined || !partial) {
    if (!isIntegerInRange(body.runtime, LIMITS.RUNTIME_MIN, LIMITS.RUNTIME_MAX)) {
      errors.push({
        field: 'runtime',
        message: `Runtime must be an integer between ${LIMITS.RUNTIME_MIN} and ${LIMITS.RUNTIME_MAX} minutes.`,
      });
    } else {
      value.runtime = body.runtime;
    }
  }

  if (body.watched !== undefined) {
    if (typeof body.watched !== 'boolean') {
      errors.push({ field: 'watched', message: 'Watched must be true or false.' });
    } else {
      value.watched = body.watched;
    }
  }

  if (body.prerequisites !== undefined) {
    if (!Array.isArray(body.prerequisites)) {
      errors.push({ field: 'prerequisites', message: 'Prerequisites must be an array of movie IDs.' });
    } else if (!body.prerequisites.every(isValidObjectId)) {
      errors.push({ field: 'prerequisites', message: 'Every prerequisite must be a valid movie ID.' });
    } else if (new Set(body.prerequisites).size !== body.prerequisites.length) {
      errors.push({ field: 'prerequisites', message: 'Prerequisites must not contain duplicates.' });
    } else {
      value.prerequisites = body.prerequisites;
    }
  }

  if (partial && Object.keys(body).length === 0) {
    errors.push({ field: 'body', message: 'Provide at least one field to update.' });
  }

  return { errors, value };
};

/**
 * Validate and normalise a cinema payload.
 * Bundle sizes are stored in ascending order so results are deterministic.
 */
const validateCinemaPayload = (body) => {
  const errors = [];
  const value = {};

  if (!isPlainObject(body)) {
    return { errors: [{ field: 'body', message: 'Request body must be a JSON object.' }], value };
  }

  rejectUnknownFields(body, ['name', 'bundleSizes'], errors);

  if (typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push({ field: 'name', message: 'Cinema name is required.' });
  } else if (body.name.trim().length > LIMITS.CINEMA_NAME_MAX) {
    errors.push({ field: 'name', message: `Cinema name must be at most ${LIMITS.CINEMA_NAME_MAX} characters.` });
  } else {
    value.name = body.name.trim();
  }

  const sizes = body.bundleSizes;
  if (!Array.isArray(sizes) || sizes.length < LIMITS.BUNDLE_COUNT_MIN || sizes.length > LIMITS.BUNDLE_COUNT_MAX) {
    errors.push({
      field: 'bundleSizes',
      message: `Bundle sizes must be an array of ${LIMITS.BUNDLE_COUNT_MIN} to ${LIMITS.BUNDLE_COUNT_MAX} different sizes.`,
    });
  } else if (!sizes.every((s) => isIntegerInRange(s, LIMITS.BUNDLE_SIZE_MIN, LIMITS.BUNDLE_SIZE_MAX))) {
    errors.push({
      field: 'bundleSizes',
      message: `Each bundle size must be an integer between ${LIMITS.BUNDLE_SIZE_MIN} and ${LIMITS.BUNDLE_SIZE_MAX}.`,
    });
  } else if (new Set(sizes).size !== sizes.length) {
    errors.push({ field: 'bundleSizes', message: 'Duplicate bundle sizes are not allowed.' });
  } else {
    value.bundleSizes = [...sizes].sort((a, b) => a - b);
  }

  return { errors, value };
};

/**
 * Parse the groupSize query parameter. It must be a plain integer string.
 * @returns {{ errors: object[], value: number|undefined }}
 */
const validateGroupSize = (raw) => {
  const message = `Group size must be a whole number between ${LIMITS.GROUP_SIZE_MIN} and ${LIMITS.GROUP_SIZE_MAX}.`;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
    return { errors: [{ field: 'groupSize', message }], value: undefined };
  }
  const groupSize = Number(raw.trim());
  if (!isIntegerInRange(groupSize, LIMITS.GROUP_SIZE_MIN, LIMITS.GROUP_SIZE_MAX)) {
    return { errors: [{ field: 'groupSize', message }], value: undefined };
  }
  return { errors: [], value: groupSize };
};

module.exports = {
  LIMITS,
  isValidObjectId,
  isIntegerInRange,
  validateMoviePayload,
  validateCinemaPayload,
  validateGroupSize,
};
