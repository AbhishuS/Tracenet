const express = require('express');
const router = express.Router();
const { getTrades, getTradeById, createTrade } = require('../controllers/tradeController');

router.get('/', getTrades);
router.get('/:id', getTradeById);
router.post('/', createTrade);

module.exports = router;