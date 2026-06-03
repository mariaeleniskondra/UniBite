const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /api/meals epistrefei oles tis aggelies fagiton
router.get('/', (req, res) => {
    const query = `
        SELECT listing_id, cook_id, title, description, total_portions, available_portions, pickup_location,latitude, longitude, pickup_time, status 
        FROM listings
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('MySQL Error fetching meals:', err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των γευμάτων' });
        }
        return res.json(results);
    });
});

module.exports = router;