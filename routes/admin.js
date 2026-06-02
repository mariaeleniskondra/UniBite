const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminController');

// Διαδρομή για τα στατιστικά του Admin Dashboard
// URL: GET /api/admin/stats
router.get('/stats', getDashboardStats);

module.exports = router;