const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');
const jwt = require('jsonwebtoken');

// Middleware ελέγχου Token (Το ίδιο ακριβώς που βάλαμε και στις αγγελίες)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Άρνηση πρόσβασης. Λείπει το token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unibite_secret_key_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Μη έγκυρο token.' });
    }
};

// Endpoint: GET /api/requests (Λήψη εκκρεμών αιτημάτων για τον μάγειρα)
router.get('/cook', verifyToken, requestsController.getCookRequests);

module.exports = router;