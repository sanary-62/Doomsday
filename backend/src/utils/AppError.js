/**
 * Operational error that the centralized error handler turns into a JSON response.
 */
class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new AppError(400, code, message, details);
  }

  static validation(details) {
    const message = details.map((d) => d.message).join(' ');
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static notFound(message) {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code, message) {
    return new AppError(409, code, message);
  }
}

module.exports = AppError;
