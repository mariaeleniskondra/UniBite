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

// Ο ΕΛΕΓΚΤΗΣ ΑΣΦΑΛΕΙΑΣ ΓΙΑ ΤΟΝ ADMIN (2η Εικόνα)
const isAdmin = (req, res, next) => {
    // Ο verifyToken έχει ήδη τρέξει πριν, άρα έχουμε τα στοιχεία στο req.user
    if (req.user && req.user.role === 'admin') {
        next(); // Είσαι ο Admin! Πέρνα ελεύθερα στα στατιστικά
    } else {
        // Δεν είσαι ο Admin? Επιστρέφεται 403 Forbidden!
        return res.status(403).json({ message: 'Πρόσβαση απαγορευμένη: Απαιτούνται δικαιώματα Διαχειριστή. (403 Forbidden)' });
    }
};

module.exports = { verifyToken, isAdmin };