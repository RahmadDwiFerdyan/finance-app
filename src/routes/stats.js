// src/routes/stats.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/summary', statsController.getSummary);
router.get('/by-category', statsController.getByCategory);

module.exports = router;
    