const express = require('express');
const controller = require('../controllers/movieController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/', controller.createMovie);
router.get('/', controller.listMovies);
router.get('/:id', validateObjectId, controller.getMovie);
router.patch('/:id', validateObjectId, controller.updateMovie);
router.delete('/:id', validateObjectId, controller.deleteMovie);
router.get('/:id/rewatch-order', validateObjectId, controller.getRewatchOrder);

module.exports = router;
