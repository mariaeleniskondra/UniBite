const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminController');

// Εισαγωγή των ελεγκτών ασφαλείας
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Διαδρομή για τα στατιστικά του Admin Dashboard
// URL: GET /api/admin/stats
// Πλέον προστατεύεται πλήρως! Πρώτα ελέγχεται το Token και μετά αν ο ρόλος είναι admin
router.get('/stats', verifyToken, isAdmin, getDashboardStats);

module.exports = router;