const express = require('express');
const router = express.Router();
const { getTraders, getTraderById } = require('../controllers/traderController');

router.get('/', getTraders);
router.get('/:id', getTraderById);

module.exports = router;