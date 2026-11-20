const mongoose = require('mongoose');
const { LIMITS } = require('../utils/validators');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: LIMITS.TITLE_MAX,
    },
    releaseYear: {
      type: Number,
      min: LIMITS.YEAR_MIN,
      max: LIMITS.YEAR_MAX,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: 'Release year must be an integer.',
      },
      default: null,
    },
    runtime: {
      type: Number,
      required: [true, 'Runtime is required.'],
      min: [LIMITS.RUNTIME_MIN, `Runtime must be at least ${LIMITS.RUNTIME_MIN} minute.`],
      max: [LIMITS.RUNTIME_MAX, `Runtime must be at most ${LIMITS.RUNTIME_MAX} minutes.`],
      validate: { validator: Number.isInteger, message: 'Runtime must be an integer.' },
    },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    watched: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        ret.prerequisites = (ret.prerequisites || []).map(String);
        return ret;
      },
    },
  }
);

// Titles are unique regardless of letter case ("iron man" == "Iron Man").
movieSchema.index({ title: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// Speeds up "which movies depend on this one?" lookups used when deleting.
movieSchema.index({ prerequisites: 1 });

module.exports = mongoose.model('Movie', movieSchema);
