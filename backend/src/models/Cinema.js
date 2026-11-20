const mongoose = require('mongoose');
const { LIMITS } = require('../utils/validators');

const bundleSizesValid = (sizes) =>
  Array.isArray(sizes) &&
  sizes.length >= LIMITS.BUNDLE_COUNT_MIN &&
  sizes.length <= LIMITS.BUNDLE_COUNT_MAX &&
  sizes.every((s) => Number.isInteger(s) && s >= LIMITS.BUNDLE_SIZE_MIN && s <= LIMITS.BUNDLE_SIZE_MAX) &&
  new Set(sizes).size === sizes.length;

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cinema name is required.'],
      trim: true,
      maxlength: LIMITS.CINEMA_NAME_MAX,
    },
    bundleSizes: {
      type: [Number],
      required: true,
      validate: {
        validator: bundleSizesValid,
        message: `Bundle sizes must be ${LIMITS.BUNDLE_COUNT_MIN}-${LIMITS.BUNDLE_COUNT_MAX} distinct integers between ${LIMITS.BUNDLE_SIZE_MIN} and ${LIMITS.BUNDLE_SIZE_MAX}.`,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

cinemaSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Cinema', cinemaSchema);
