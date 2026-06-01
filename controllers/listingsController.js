const db = require('../models/db');

// ===== ΔΗΜΙΟΥΡΓΙΑ ΝΕΑΣ ΑΓΓΕΛΙΑΣ (POST) =====
const createListing = (req, res) => {
    // 1. Παίρνουμε τα δεδομένα του φαγητού από το req.body (που έστειλε η JS)
    const { title, description, total_portions, pickup_location, pickup_time, allergens } = req.body;

    // 2. Παίρνουμε το user_id του μάγειρα από το req.user
    // (Το req.user θα δημιουργηθεί αυτόματα από το Middleware ελέγχου του JWT Token)
    const cook_id = req.user.user_id;

    // Έλεγχος αν τα υποχρεωτικά πεδία είναι συμπληρωμένα (Βάσει εκφώνησης Β2)
    if (!title || !total_portions || !pickup_location || !pickup_time) {
        return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία (*)' });
    }

    // 3. Εισαγωγή της αγγελίας στον πίνακα listings
    // Οι διαθέσιμες μερίδες (available_portions) στην αρχή ισούνται με τις συνολικές (total_portions)
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

            // Παίρνουμε το ID της αγγελίας που μόλις δημιουργήθηκε στη βάση
            const newListingId = result.insertId;

            // 4. Αποθήκευση αλλεργιογόνων (Αν ο μάγειρας επέλεξε κάποια)
            // Επειδή είναι σχέση Πολλά-προς-Πολλά, πρέπει να γίνουν inserts στον πίνακα 'listing_allergens'
            if (allergens && allergens.length > 0) {

                // Προετοιμάζουμε έναν πίνακα από bulk values, π.χ. [[listing_id, allergen_id_1], [listing_id, allergen_id_2]]
                const allergenValues = allergens.map(allergenId => [newListingId, allergenId]);

                const queryAllergens = `INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?`;

                db.query(queryAllergens, [allergenValues], (err) => {
                    if (err) {
                        console.error("MYSQL INSERT ALLERGENS ERROR:", err);
                        return res.status(500).json({ message: 'Η αγγελία δημιουργήθηκε, αλλά απέτυχε η αποθήκευση των αλλεργιογόνων' });
                    }
                    // Αν όλα πάνε καλά και με τα αλλεργιογόνα
                    return res.status(201).json({ message: 'Η αγγελία και τα αλλεργιογόνα αποθηκεύτηκαν με επιτυχία!' });
                });

            } else {
                // Αν δεν είχε αλλεργιογόνα, επιστρέφουμε κατευθείαν επιτυχία
                return res.status(201).json({ message: 'Η αγγελία αποθηκεύτηκαν με επιτυχία (χωρίς αλλεργιογόνα)!' });
            }
        }
    );
};

// ===== ΛΗΨΗ ΑΓΓΕΛΙΩΝ ΜΟΝΟ ΤΟΥ ΣΥΓΚΕΚΡΙΜΕΝΟΥ ΜΑΓΕΙΡΑ (GET) =====
const getCookListings = (req, res) => {
    // Παίρνουμε το ID του μάγειρα από το token (req.user)
    const cook_id = req.user.user_id;

    // Query που φέρνει τις αγγελίες του μάγειρα
    // Φίλτρο: created_at >= NOW() - INTERVAL 48 HOUR (Βάσει εκφώνησης για το 48ωρο)
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

        // Επιστρέφουμε τις αγγελίες στον μάγειρα
        return res.json(results);
    });
};

module.exports = { createListing ,getCookListings};