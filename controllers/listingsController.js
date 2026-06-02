const db = require('../models/db');

// ===== 1. ΔΗΜΙΟΥΡΓΙΑ ΝΕΑΣ ΑΓΓΕΛΙΑΣ (POST) =====
const createListing = (req, res) => {
    const { title, description, total_portions, pickup_location, pickup_time, allergens } = req.body;
    const cook_id = req.user.user_id;

    if (!title || !total_portions || !pickup_location || !pickup_time) {
        return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία (*)' });
    }

    const queryListing = `
        INSERT INTO listings (cook_id, title, description, total_portions, available_portions, pickup_location, pickup_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    db.query(
        queryListing,
        [cook_id, title, description, total_portions, total_portions, pickup_location, pickup_time],
        (err, result) => {
            if (err) {
                console.error("MYSQL INSERT LISTING ERROR:", err);
                return res.status(500).json({ message: 'Σφάλμα κατά την αποθήκευση της αγγελίας' });
            }

            const newListingId = result.insertId;

            if (allergens && allergens.length > 0) {
                const allergenValues = allergens.map(allergenId => [newListingId, allergenId]);
                const queryAllergens = `INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?`;

                db.query(queryAllergens, [allergenValues], (err) => {
                    if (err) {
                        console.error("MYSQL INSERT ALLERGENS ERROR:", err);
                        return res.status(500).json({ message: 'Η αγγελία δημιουργήθηκε, αλλά απέτυχε η αποθήκευση των αλλεργιογόνων' });
                    }
                    return res.status(201).json({ message: 'Η αγγελία και τα αλλεργιογόνα αποθηκεύτηκαν με επιτυχία!' });
                });
            } else {
                return res.status(201).json({ message: 'Η αγγελία αποθηκεύτηκαν με επιτυχία (χωρίς αλλεργιογόνα)!' });
            }
        }
    );
};

// ===== 2. ΛΗΨΗ ΑΓΓΕΛΙΩΝ ΜΟΝΟ ΤΟΥ ΣΥΓΚΕΚΡΙΜΕΝΟΥ ΜΑΓΕΙΡΑ (GET) =====
const getCookListings = (req, res) => {
    const cook_id = req.user.user_id;

    const query = `
        SELECT *,
               (created_at >= NOW() - INTERVAL 48 HOUR) as is_valid
        FROM listings
        WHERE cook_id = ? AND status != 'deleted'
        ORDER BY created_at DESC
    `;

    db.query(query, [cook_id], (err, results) => {
        if (err) {
            console.error("MYSQL GET COOK LISTINGS ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των αγγελιών σας' });
        }
        return res.json(results);
    });
};

// ===== 3. ΛΗΨΗ ΜΙΑΣ ΣΥΓΚΕΚΡΙΜΕΝΗΣ ΑΓΓΕΛΙΑΣ ΓΙΑ ΤΟ EDIT (GET) =====
const getSingleListing = (req, res) => {
    const listing_id = req.params.id;

    db.query('SELECT * FROM listings WHERE listing_id = ?', [listing_id], (err, results) => {
        if (err) {
            console.error("MYSQL GET SINGLE LISTING ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα βάσης δεδομένων κατά τη λήψη της αγγελίας' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Η αγγελία δεν βρέθηκε' });
        }

        const listing = results[0];

        db.query('SELECT allergen_id FROM listing_allergens WHERE listing_id = ?', [listing_id], (err, allergenResults) => {
            if (err) {
                console.error("MYSQL GET LISTING ALLERGENS ERROR:", err);
                return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των αλλεργιογόνων' });
            }
            listing.allergens = allergenResults.map(row => row.allergen_id);
            return res.json(listing);
        });
    });
};

// ===== 4. ΑΠΟΘΗΚΕΥΣΗ ΤΩΝ ΝΕΩΝ ΑΛΛΑΓΩΝ ΤΟΥ EDIT ΣΤΗ ΜΥSQL (PUT) =====
const updateListing = (req, res) => {
    const listing_id = req.params.id;
    const { title, description, total_portions, pickup_location, pickup_time, allergens } = req.body;

    const queryUpdate = `
        UPDATE listings
        SET title = ?, description = ?, total_portions = ?, available_portions = ?, pickup_location = ?, pickup_time = ?
        WHERE listing_id = ?
    `;

    db.query(queryUpdate, [title, description, total_portions, total_portions, pickup_location, pickup_time, listing_id], (err) => {
        if (err) {
            console.error("MYSQL UPDATE LISTING ERROR:", err);
            return res.status(500).json({ message: 'Αποτυχία ενημέρωσης της αγγελίας στη βάση' });
        }

        db.query('DELETE FROM listing_allergens WHERE listing_id = ?', [listing_id], (err) => {
            if (err) {
                console.error("MYSQL DELETE OLD ALLERGENS ERROR:", err);
                return res.status(500).json({ message: 'Σφάλμα κατά την ανανέωση των αλλεργιογόνων' });
            }

            if (allergens && allergens.length > 0) {
                const allergenValues = allergens.map(allergenId => [listing_id, allergenId]);
                db.query('INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?', [allergenValues], (err) => {
                    if (err) {
                        console.error("MYSQL INSERT NEW ALLERGENS ERROR:", err);
                        return res.status(500).json({ message: 'Σφάλμα κατά την εισαγωγή των νέων αλλεργιογόνων' });
                    }
                    return res.json({ message: 'Η αγγελία και τα αλλεργιογόνα ενημερώθηκαν επιτυχώς!' });
                });
            } else {
                return res.json({ message: 'Η αγγελία ενημερώθηκε επιτυχώς (χωρίς αλλεργιογόνα)!' });
            }
        });
    });
};

// ===== 5. ΔΙΑΓΡΑΦΗ ΑΓΓΕΛΙΑΣ - SOFT DELETE (DELETE) =====
// Αυτή η συνάρτηση έλειπε και τη βάλαμε στη σωστή της θέση!
const deleteListing = (req, res) => {
    const listing_id = req.params.id;

    // Κάνουμε soft delete αλλάζοντας το status σε 'deleted' βάσει επιχειρηματικής λογικής
    const query = `UPDATE listings SET status = 'deleted' WHERE listing_id = ?`;

    db.query(query, [listing_id], (err, result) => {
        if (err) {
            console.error("MYSQL DELETE LISTING ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη διαγραφή της αγγελίας' });
        }
        return res.json({ message: 'Η αγγελία διαγράφηκε με επιτυχία!' });
    });
};

// Όλα τα ονόματα εδώ κάτω συμφωνούν πλέον 100% με τις παραπάνω δηλώσεις!
module.exports = { createListing, getCookListings, deleteListing, getSingleListing, updateListing };