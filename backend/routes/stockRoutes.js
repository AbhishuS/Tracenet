const express = require('express');
const router = express.Router();
const { getStocks } = require('../controllers/stockController');

router.get('/', getStocks);

module.exports = router;