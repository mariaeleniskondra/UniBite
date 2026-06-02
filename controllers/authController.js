const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

// ========================================================
// 1. ΕΓΓΡΑΦΗ ΧΡΗΣΤΗ (REGISTER)
// ========================================================
const register = (req, res) => {
  // Παίρνουμε το username (ενωμένο πλέον από το front-end), το email και το password
  const { username, email, password } = req.body;

  // ΕΛΕΓΧΟΣ: Μόνο για τα πεδία που πραγματικά στέλνει η φόρμα μας
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα πεδία' });
  }

  // ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ: Έλεγχος αν το email είναι πανεπιστημιακό (Ends with upatras.gr)
  if (!email.endsWith('@upatras.gr') && !email.endsWith('.upatras.gr')) {
    return res.status(400).json({ message: 'Επιτρέπονται μόνο πανεπιστημιακά emails (@upatras.gr).' });
  }

  // Έλεγχος αν το email υπάρχει ήδη εγγεγραμμένο στη βάση
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL SELECT ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τον έλεγχο email' });
    }
    if (results.length > 0) {
      return res.status(400).json({ message: 'Το email υπάρχει ήδη εγγεγραμμένο' });
    }

    // Κρυπτογράφηση κωδικού πρόσβασης
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Εισαγωγή στη MySQL - Το 'role' και τα 'credits' (5) μπαίνουν αυτόματα από τα DEFAULTS του πίνακα!
    const insertQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';

    db.query(insertQuery, [username, email, hashedPassword], (err) => {
          if (err) {
            console.error("MYSQL INSERT ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα εγγραφής στη βάση δεδομένων' });
          }
          return res.status(201).json({ message: 'Εγγραφή επιτυχής! Παρακαλώ συνδεθείτε.' });
        }
    );
  });
};

// ========================================================
// 2. ΣΥΝΔΕΣΗ ΧΡΗΣΤΗ (LOGIN)
// ========================================================
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Συμπληρώστε email και κωδικό' });
  }

  // Ψάχνουμε τον χρήστη στη βάση με βάση το email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL LOGIN ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τη σύνδεση' });
    }

    // Αν δεν βρεθεί το email
    if (results.length === 0) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    const user = results[0];

    // Συγκρίνουμε τον κωδικό με το hash της βάσης
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    // Δημιουργούμε το JWT token (χρησιμοποιούμε το user_id, το role και το username)
    const token = jwt.sign(
        { user_id: user.user_id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'unibite_secret_key_2026',
        { expiresIn: '24h' }
    );

    // Επιστρέφουμε το token και τα βασικά στοιχεία στο Front-end
    return res.json({
      token,
      role: user.role,
      user_id: user.user_id,
      username: user.username
    });
  });
};

module.exports = { register, login };