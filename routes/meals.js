const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /api/meals - Επιστρέφει αγγελίες που δεν έχουν παρέλθει 48 ώρες
router.get('/', (req, res) => {

    // Βήμα 1: Αυτόματο update — αγγελίες > 48 ωρών γίνονται 'deleted'
    const autoDeleteQuery = `
        UPDATE listings
        SET status = 'deleted'
        WHERE status != 'deleted'
        AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= 48
    `;

    db.query(autoDeleteQuery, (err) => {
        if (err) {
            console.error('Auto-delete error:', err);
            // Δεν σταματάμε — συνεχίζουμε να επιστρέψουμε τα αποτελέσματα
        }

        // Βήμα 2: Επιστρέφουμε μόνο active και inactive (όχι deleted)
        const query = `
            SELECT listing_id, cook_id, title, description, 
                   total_portions, available_portions, 
                   pickup_location, latitude, longitude, 
                   pickup_time, status, created_at
            FROM listings
            WHERE status != 'deleted'
            ORDER BY created_at DESC
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('MySQL Error fetching meals:', err);
                return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των γευμάτων' });
            }
            return res.json(results);
        });
    });
});

module.exports = router;