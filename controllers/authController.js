const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

// ΕΓΓΡΑΦΗ
const register = (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;

  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα πεδία' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL SELECT ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τον έλεγχο email' });
    }
    if (results.length > 0) return res.status(400).json({ message: 'Το email υπάρχει ήδη' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const username = `${first_name}_${last_name}`;

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

// ΣΥΝΔΕΣΗ (LOGIN)
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Συμπληρώστε email και κωδικό' });
  }

  // Ψάχνουμε τον χρήστη στη ΒΔ με βάση το email
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

    // Συγκρίνουμε το password με το κρυπτογραφημένο password_hash της βάσης
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