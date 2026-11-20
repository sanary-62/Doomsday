const express = require('express');
const cors = require('cors');
const movieRoutes = require('./routes/movieRoutes');
const cinemaRoutes = require('./routes/cinemaRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const createApp = () => {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/movies', movieRoutes);
  app.use('/api/cinemas', cinemaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

module.exports = createApp;
