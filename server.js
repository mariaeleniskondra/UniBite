require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Εισαγωγή των Routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const requestRoutes = require('./routes/requests');

// Σύνδεση με τη Βάση Δεδομένων (Αρκεί μια φορά στην εκκίνηση)
require('./models/db');

// Middlewares
app.use(cors());
app.use(express.json());

// ===== 1. ΣΕΡΒΙΡΙΣΜΑ ΣΤΑΤΙΚΩΝ ΦΑΚΕΛΩΝ =====
// Σερβίρισμα του κεντρικού Front-end (Public)
app.use(express.static(path.join(__dirname, 'Public')));

// ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ: Σερβίρισμα του φακέλου των uploads ώστε να φαίνονται οι φωτογραφίες των φαγητών live!
app.use('/uploads', express.static(path.join(__dirname, 'Public/uploads')));
//NIKOUUUUUUU
app.use('/api/admin', require('./routes/admin'));

// ===== 2. ΔΗΛΩΣΗ ΟΛΩΝ ΤΩΝ API ROUTES (Μαζεμένα) =====
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/requests', requestRoutes);

// Εκκίνηση Διακομιστή
const PORT = process.env.PORT || 3000; // Το γυρίσαμε στο 8080 που χρησιμοποιείς ήδη
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});