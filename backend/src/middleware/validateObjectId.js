const AppError = require('../utils/AppError');
const { isValidObjectId } = require('../utils/validators');

/** Rejects requests whose :id route parameter is not a valid MongoDB ObjectId. */
const validateObjectId = (req, _res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return next(AppError.badRequest('INVALID_ID', 'The supplied ID is not a valid identifier.'));
  }
  return next();
};

module.exports = validateObjectId;
