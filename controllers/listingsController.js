const db = require('../models/db');

// ===== 1. ΔΗΜΙΟΥΡΓΙΑ ΝΕΑΣ ΑΓΓΕΛΙΑΣ ΜΕ ΕΙΚΟΝΑ (POST) =====
const createListing = (req, res) => {
    try {
        const { title, description, total_portions, pickup_location,latitude, longitude, pickup_time, allergens } = req.body || {};
        const cook_id = req.user ? req.user.user_id : null;

        if (!cook_id) return res.status(401).json({ message: 'Μη εξουσιοδοτημένος χρήστης.' });
        if (!title || !total_portions || !pickup_location || !pickup_time) {
            return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία (*)' });
        }

        const cleanPortions = parseInt(total_portions, 10);
        if (isNaN(cleanPortions)) return res.status(400).json({ message: 'Οι μερίδες πρέπει να είναι αριθμός.' });

        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        let parsedAllergens = [];
        if (allergens) {
            try {
                parsedAllergens = typeof allergens === 'string' ? JSON.parse(allergens) : allergens;
            } catch (e) {
                parsedAllergens = [];
            }
        }

        const queryListing = `
            INSERT INTO listings (cook_id, title, description, image_url, total_portions, available_portions, pickup_location, latitude, longitude, pickup_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?, 'active')
        `;

        db.query(
            queryListing,
            [cook_id, title, description, image_url, cleanPortions, cleanPortions, pickup_location, latitude, longitude, pickup_time],
            (err, result) => {
                if (err) {
                    console.error("MYSQL INSERT LISTING ERROR:", err);
                    return res.status(500).json({ message: 'Σφάλμα κατά την αποθήκευση της αγγελίας.' });
                }

                const newListingId = result.insertId;

                if (parsedAllergens && parsedAllergens.length > 0) {
                    const allergenValues = parsedAllergens.map(allergenId => [newListingId, allergenId]);
                    db.query(`INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?`, [allergenValues], (err) => {
                        if (err) return res.status(500).json({ message: 'Αποτυχία αποθήκευσης αλλεργιογόνων.' });
                        return res.status(201).json({ message: 'Η αγγελία δημιουργήθηκε με επιτυχία!' });
                    });
                } else {
                    return res.status(201).json({ message: 'Η αγγελία δημιουργήθηκε με επιτυχία!' });
                }
            }
        );
    } catch (globalError) {
        return res.status(500).json({ message: 'Εσωτερικό σφάλμα διακομιστή.' });
    }
};

// ===== 2. ΛΗΨΗ ΑΓΓΕΛΙΩΝ ΜΑΓΕΙΡΑ ΜΕ ΑΛΛΕΡΓΙΟΓΟΝΑ (GET) =====
const getCookListings = (req, res) => {
    const cook_id = req.user.user_id;

    // ΔΙΟΡΘΩΣΗ: Προσθήκη GROUP_CONCAT για να εμφανίζονται live τα αλλεργιογόνα στο dashboard
    const query = `
        SELECT l.*, GROUP_CONCAT(a.name SEPARATOR ', ') AS allergens_list
        FROM listings l
                 LEFT JOIN listing_allergens la ON l.listing_id = la.listing_id
                 LEFT JOIN allergens a ON la.allergen_id = a.allergen_id
        WHERE l.cook_id = ? AND l.status != 'deleted'
        GROUP BY l.listing_id
        ORDER BY l.created_at DESC
    `;

    db.query(query, [cook_id], (err, results) => {
        if (err) {
            console.error("MYSQL GET COOK LISTINGS ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των αγγελιών' });
        }
        return res.json(results);
    });
};

// ===== 3. ΛΗΨΗ ΜΙΑΣ ΑΓΓΕΛΙΑΣ ΓΙΑ ΤΟ EDIT (GET) =====
const getSingleListing = (req, res) => {
    const listing_id = req.params.id;

    db.query('SELECT * FROM listings WHERE listing_id = ?', [listing_id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Η αγγελία δεν βρέθηκε' });
        const listing = results[0];

        db.query('SELECT allergen_id FROM listing_allergens WHERE listing_id = ?', [listing_id], (err, allergenResults) => {
            if (err) return res.status(500).json({ message: 'Σφάλμα αλλεργιογόνων' });
            listing.allergens = allergenResults.map(row => row.allergen_id);
            return res.json(listing);
        });
    });
};

// ===== 4. ΕΝΗΜΕΡΩΣΗ ΑΓΓΕΛΙΑΣ (PUT) =====
const updateListing = (req, res) => {
    const listing_id = req.params.id;
    const { title, description, total_portions, pickup_location, pickup_time, allergens } = req.body;

    let queryUpdate = '';
    let queryParams = [];
    let parsedAllergens = [];

    if (allergens) {
        try { parsedAllergens = typeof allergens === 'string' ? JSON.parse(allergens) : allergens; } catch(e) { parsedAllergens = []; }
    }

    if (req.file) {
        const image_url = `/uploads/${req.file.filename}`;
        queryUpdate = `UPDATE listings SET title=?, description=?, image_url=?, total_portions=?, available_portions=?, pickup_location=?, pickup_time=? WHERE listing_id=?`;
        queryParams = [title, description, image_url, total_portions, total_portions, pickup_location, pickup_time, listing_id];
    } else {
        queryUpdate = `UPDATE listings SET title=?, description=?, total_portions=?, available_portions=?, pickup_location=?, pickup_time=? WHERE listing_id=?`;
        queryParams = [title, description, total_portions, total_portions, pickup_location, pickup_time, listing_id];
    }

    db.query(queryUpdate, queryParams, (err) => {
        if (err) return res.status(500).json({ message: 'Αποτυχία ενημέρωσης αγγελίας.' });

        db.query('DELETE FROM listing_allergens WHERE listing_id = ?', [listing_id], (err) => {
            if (parsedAllergens && parsedAllergens.length > 0) {
                const allergenValues = parsedAllergens.map(allergenId => [listing_id, allergenId]);
                db.query('INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?', [allergenValues], () => {
                    return res.json({ message: 'Η αγγελία ενημερώθηκε επιτυχώς!' });
                });
            } else {
                return res.json({ message: 'Η αγγελία ενημερώθηκε επιτυχώς!' });
            }
        });
    });
};

// ===== 5. ΔΙΑΓΡΑΦΗ ΑΓΓΕΛΙΑΣ - SOFT DELETE =====
const deleteListing = (req, res) => {
    const listing_id = req.params.id;
    db.query(`UPDATE listings SET status = 'deleted' WHERE listing_id = ?`, [listing_id], (err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά τη διαγραφή' });
        return res.json({ message: 'Η αγγελία διαγράφηκε με επιτυχία!' });
    });
};

module.exports = { createListing, getCookListings, deleteListing, getSingleListing, updateListing };