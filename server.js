require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const requestRoutes = require('./routes/requests');

require('./models/db');

app.use(cors());
app.use(express.json());

// 1. ΠΡΩΤΑ ΔΗΛΩΝΟΥΜΕ ΤΑ API ROUTES
app.use('/api/auth', require('./routes/auth'));
// Εισαγωγή του αρχείου routes για τις αγγελίες
const listingRoutes = require('./routes/listings');

// Σύνδεση του route με το πρόθεμα /api/listings
app.use('/api/listings', listingRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/meals', require('./routes/meals'));
// 2. ΜΕΤΑ ΣΕΡΒΙΡΟΥΜΕ ΤΑ ΣΤΑΤΙΚΑ ΑΡΧΕΙΑ (Θωρακισμένο path)
app.use(express.static(path.join(__dirname, 'Public')));

app.use('/api/requests', requestRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server τρέχει στο http://localhost:${PORT}`);
});