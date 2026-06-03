const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

// ========================================================
// 1. ΕΓΓΡΑΦΗ ΧΡΗΣΤΗ (REGISTER)
// ========================================================
const register = (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα πεδία' });
  }

  if (!email.endsWith('@upatras.gr') && !email.endsWith('.upatras.gr')) {
    return res.status(400).json({ message: 'Eπιτρέπονται μόνο πανεπιστημιακά emails (@upatras.gr).' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL SELECT ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τον έλεγχο email' });
    }
    if (results.length > 0) {
      return res.status(400).json({ message: 'Το email υπάρχει ήδη εγγεγραμμένο' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const cleanUsername = email.split('@')[0];

    // Ενεργοποίηση των 5 credits απευθείας στην εγγραφή
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, role, credits) 
      VALUES (?, ?, ?, 'student', 5)
    `;

    db.query(insertQuery, [cleanUsername, email, hashedPassword], (err) => {
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

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error("MYSQL LOGIN ERROR:", err);
      return res.status(500).json({ message: 'Σφάλμα server κατά τη σύνδεση' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    const user = results[0];

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Λάθος email ή κωδικός πρόσβασης' });
    }

    const token = jwt.sign(
        { user_id: user.user_id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'unibite_secret_key_2026',
        { expiresIn: '24h' }
    );

    return res.json({
      token,
      role: user.role,
      user_id: user.user_id,
      username: user.username
    });
  });
};

// ========================================================
// 3. ΛΗΨΗ LIVE ΣΤΑΤΙΣΤΙΚΩΝ
// ========================================================
const getGlobalStats = (req, res) => {
  const qPortions = `SELECT COUNT(*) AS total_meals FROM requests WHERE status = 'completed'`;
  const qUsers = `SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'`;
  const qRatings = `SELECT AVG(rating_value) AS avg_rating FROM ratings`;

  db.query(qPortions, (err, resPortions) => {
    if (err) return res.status(500).json({ message: 'Σφάλμα στατιστικών μερίδων' });

    db.query(qUsers, (err, resUsers) => {
      if (err) return res.status(500).json({ message: 'Σφάλμα στατιστικών χρηστών' });

      db.query(qRatings, (err, resRatings) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα στατιστικών αξιολογήσεων' });

        let avgRating = parseFloat(resRatings[0].avg_rating);
        avgRating = avgRating ? avgRating.toFixed(1) : "5.0";

        return res.json({
          total_meals: resPortions[0].total_meals || 0,
          total_students: resUsers[0].total_students || 0,
          avg_rating: avgRating
        });
      });
    });
  });
};

// ========================================================
// 4. ΛΗΨΗ ΠΡΟΦΙΛ (ΓΙΑ ΤΟΥΣ ΠΟΝΤΟΥΣ)
// ========================================================
const getProfile = (req, res) => {
  const userId = req.user.user_id;
  const query = `SELECT user_id, username, email, role, credits FROM users WHERE user_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err || results.length === 0) {
      console.error("MYSQL PROFILE ERROR:", err);
      return res.status(404).json({ message: 'Ο χρήστης δεν βρέθηκε.' });
    }
    return res.json({ user: results[0] });
  });
};

module.exports = { register, login, getGlobalStats, getProfile };