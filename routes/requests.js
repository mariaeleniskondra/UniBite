const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');

// ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ: Αντικατάσταση του τοπικού middleware με το κεντρικό
const { verifyToken } = require('../middleware/authMiddleware');

// ===== ENDPOINTS ΔΙΑΧΕΙΡΙΣΗΣ ΑΙΤΗΜΑΤΩΝ =====

// Λήψη εκκρεμών αιτημάτων για τον μάγειρα
router.get('/cook', verifyToken, requestsController.getCookRequests);

// Έγκριση Αιτήματος
router.put('/:id/approve', verifyToken, requestsController.approveRequest);

// Απόρριψη Αιτήματος
router.put('/:id/reject', verifyToken, requestsController.rejectRequest);

// Επιβεβαίωση Παραλαβής
router.put('/:id/confirm-delivery', verifyToken, requestsController.confirmDelivery);

// Μη Εμφάνιση Καταναλωτή (No-Show)
router.put('/:id/no-show', verifyToken, requestsController.noShowRequest);

// ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ: Προστέθηκε το export για να μην κρασάρει ο server!
module.exports = router;