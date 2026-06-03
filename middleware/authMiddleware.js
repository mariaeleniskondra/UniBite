const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Δεν παρέχεται token πρόσβασης. Άρνηση εισόδου.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unibite_secret_key_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Το token δεν είναι έγκυρο ή έχει λήξει.' });
    }
};

module.exports = { verifyToken };