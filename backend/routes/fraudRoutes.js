const express = require('express');
const router = express.Router();
const { getFraudCycles, getRiskLogs } = require('../controllers/fraudController');

router.get('/cycles', getFraudCycles);
router.get('/logs', getRiskLogs);

module.exports = router;