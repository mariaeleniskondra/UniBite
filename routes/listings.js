const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const jwt = require('jsonwebtoken');

// ===== MIDDLEWARE: Έλεγχος εγκυρότητας του JWT Token =====
const verifyToken = (req, res, next) => {
    // Παίρνουμε το token από το Header 'Authorization' (μορφή: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Κρατάμε μόνο το καθαρό string του token

    // Αν δεν υπάρχει token, απαγορεύουμε την πρόσβαση (401 Unauthorized)
    if (!token) {
        return res.status(401).json({ message: 'Δεν παρέχεται token πρόσβασης. Άρνηση εισόδου.' });
    }

    try {
        // Επαληθεύουμε το token με το μυστικό μας κλειδί
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unibite_secret_key_2026');

        // Αποθηκεύουμε τα αποκωδικοποιημένα στοιχεία του χρήστη μέσα στο αντικείμενο 'req.user'
        // Έτσι, οι controllers ξέρουν ανά πάσα στιγμή ποιο user_id κάνει την ενέργεια!
        req.user = decoded;

        next(); // Όλα καλά, προχωράμε στον controller!
    } catch (error) {
        // Αν το token έχει παραποιηθεί ή έχει λήξει (403 Forbidden)
        return res.status(403).json({ message: 'Το token δεν είναι έγκυρο ή έχει λήξει.' });
    }
};

// ========================================================
// ΟΛΑ ΤΑ ENDPOINTS ΓΙΑ ΤΗ ΔΙΑΧΕΙΡΙΣΗ ΑΓΓΕΛΙΩΝ (CRUD)
// ========================================================

// 1. Δημιουργία Νέας Αγγελίας (Create)
// Endpoint: POST /api/listings
router.post('/', verifyToken, listingsController.createListing);

// 2. Λήψη όλων των αγγελιών του συνδεδεμένου μάγειρα (Read)
// Endpoint: GET /api/listings
router.get('/', verifyToken, listingsController.getCookListings);

// 3. Διαγραφή αγγελίας - Soft Delete (Delete)
// Endpoint: DELETE /api/listings/:id
router.delete('/:id', verifyToken, listingsController.deleteListing);

// 4. Λήψη μίας συγκεκριμένης αγγελίας (Χρησιμοποιείται για να γεμίσει η φόρμα του Edit)
// Endpoint: GET /api/listings/single/:id
router.get('/single/:id', verifyToken, listingsController.getSingleListing);

// 5. Αποθήκευση των αλλαγών της επεξεργασίας (Update)
// Endpoint: PUT /api/listings/:id
router.put('/:id', verifyToken, listingsController.updateListing);

module.exports = router;