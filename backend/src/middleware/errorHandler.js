const AppError = require('../utils/AppError');

const notFoundHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist.`));
};

const isDuplicateKeyError = (error) => error && error.code === 11000;

/**
 * Centralised error handler. Operational errors keep their status and message;
 * anything unexpected is logged server-side and returned as a generic 500
 * so internals and environment values are never exposed.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    const body = { error: error.code, message: error.message };
    if (error.details) body.details = error.details;
    return res.status(error.statusCode).json(body);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
  }

  if (error.name === 'ValidationError' && error.errors) {
    const details = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
    return res
      .status(400)
      .json({ error: 'VALIDATION_ERROR', message: details.map((d) => d.message).join(' '), details });
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern || {})[0];
    const code = field === 'title' ? 'DUPLICATE_TITLE' : 'DUPLICATE_NAME';
    return res.status(409).json({ error: code, message: 'A record with this value already exists.' });
  }

  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' });
};

module.exports = { notFoundHandler, errorHandler };
