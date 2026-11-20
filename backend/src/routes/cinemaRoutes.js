const express = require('express');
const controller = require('../controllers/cinemaController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/', controller.createCinema);
router.get('/', controller.listCinemas);
router.get('/:id', validateObjectId, controller.getCinema);
router.get('/:id/booking', validateObjectId, controller.getBookingQuote);

module.exports = router;
