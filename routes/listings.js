const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const multer = require('multer');
const path = require('path');

const { verifyToken } = require('../middleware/authMiddleware');

// ===== ΡΥΘΜΙΣΗ MULTER ΓΙΑ ΑΠΟΘΗΚΕΥΣΗ ΦΩΤΟΓΡΑΦΙΩΝ =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ===== ENDPOINTS =====
router.post('/', verifyToken, upload.single('image'), listingsController.createListing);
router.get('/', verifyToken, listingsController.getCookListings);
router.delete('/:id', verifyToken, listingsController.deleteListing);
router.get('/single/:id', verifyToken, listingsController.getSingleListing);
router.put('/:id', verifyToken, upload.single('image'), listingsController.updateListing);

module.exports = router;