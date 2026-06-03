const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { register, login, getGlobalStats, getProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/stats', getGlobalStats);
router.get('/profile', verifyToken, getProfile);

module.exports = router;