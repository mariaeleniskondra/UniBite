require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'unibite',
  dateStrings: true // Εγγυάται ότι οι ώρες και οι ημερομηνίες θα έρχονται σωστά μορφοποιημένες στο Front-end
});

db.connect((err) => {
  if (err) {
    console.error('❌ Σφάλμα σύνδεσης με τη ΒΔ:', err.message);
    return;
  }
  console.log('✅ Επιτυχής σύνδεση στη MySQL database!');
});

module.exports = db;