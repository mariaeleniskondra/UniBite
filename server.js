require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mysql = require('mysql2');

const app = express();

app.use(express.json());
app.use(express.static('Public'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Σφάλμα σύνδεσης:', err.message);
    return;
  }
  console.log('Συνδέθηκε στη MySQL!');
});

app.listen(process.env.PORT, () => {
  console.log(`Server τρέχει στο http://localhost:${process.env.PORT}`);
});

module.exports = db;