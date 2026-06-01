const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const jwt = require('jsonwebtoken');

// ===== MIDDLEWARE: Έλεγχος εγκυρότητας του JWT Token =====
const verifyToken = (req, res, next) => {
    // Παίρνουμε το token από το Header 'Authorization' (Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Κρατάμε μόνο το καθαρό string του token

    // Αν δεν υπάρχει token, απαγορεύουμε την πρόσβαση
    if (!token) {
        return res.status(401).json({ message: 'Δεν παρέχεται token πρόσβασης. Άρνηση εισόδου.' });
    }

    try {
        // Επαληθεύουμε το token με το μυστικό μας κλειδί
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unibite_secret_key_2026');

        // Αποθηκεύουμε τα στοιχεία του χρήστη (id, email, κλπ) μέσα στο αντικείμενο 'req.user'
        // Έτσι, ο controller που έρχεται μετά θα ξέρει ποιος είναι ο χρήστης!
        req.user = decoded;

        next(); // Προχωράμε στον controller
    } catch (error) {
        return res.status(403).json({ message: 'Το token δεν είναι έγκυρο ή έχει λήξει.' });
    }
};
// Endpoint: POST /api/listings
// Πρώτα τρέχει ο έλεγχος του verifyToken και αν πετύχει, εκτελείται το createListing
router.post('/', verifyToken, listingsController.createListing);

// Endpoint: GET /api/listings (Λήψη των αγγελιών του συνδεδεμένου μάγειρα)
router.get('/', verifyToken, listingsController.getCookListings);

module.exports = router;