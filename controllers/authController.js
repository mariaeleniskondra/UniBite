const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

// ===== ΕΓΓΡΑΦΗ ΧΡΗΣΤΗ =====
const register = (req, res) => {
  // Παίρνουμε τα στοιχεία από το front-end
  const { first_name, last_name, email, password } = req.body;

  // Έλεγχος αν όλα τα απαραίτητα πεδία είναι συμπληρωμένα
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα πεδία' });
  }

  // 1. Έλεγχος αν το email χρησιμοποιείται ήδη
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL SELECT ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τον έλεγχο email' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Το email υπάρχει ήδη' });
    }

    // 2. Προετοιμασία δεδομένων για την αποθήκευση
    const hashedPassword = bcrypt.hashSync(password, 10);
    const username = `${first_name}_${last_name}`; // Δημιουργία ενιαίου username
    const role = 'student'; // Όλοι οι φοιτητές παίρνουν τον ενιαίο ρόλο 'student'

    // 3. Εισαγωγή του νέου χρήστη στη βάση δεδομένων (unibite)
    db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role],
        (err) => {
          if (err) {
            console.error("MYSQL INSERT ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα εγγραφής στη βάση δεδομένων' });
          }
          return res.status(201).json({ message: 'Εγγραφή επιτυχής!' });
        }
    );
  });
};

// ===== ΣΥΝΔΕΣΗ ΧΡΗΣΤΗ (LOGIN) =====
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Συμπληρώστε email και κωδικό' });
  }

  // 1. Αναζήτηση του χρήστη στη βάση με βάση το email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL LOGIN ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τη σύνδεση' });
    }

    // Αν δεν βρεθεί κανένας χρήστης με αυτό το email
    if (results.length === 0) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    const user = results[0];

    // 2. Έλεγχος και ταυτοποίηση του κωδικού πρόσβασης (bcrypt)
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    // 3. Δημιουργία του JWT Token (περιλαμβάνει user_id, role, username)
    const token = jwt.sign(
        { user_id: user.user_id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'unibite_secret_key_2026',
        { expiresIn: '24h' }
    );

    // 4. Επιστροφή των δεδομένων στο Front-End
    return res.json({
      token,
      role: user.role,
      user_id: user.user_id,
      username: user.username
    });
  });
};

module.exports = { register, login };