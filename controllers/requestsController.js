const db = require('../models/db');

// ===== ΛΗΨΗ ΑΙΤΗΜΑΤΩΝ ΠΟΥ ΕΧΟΥΝ ΓΙΝΕΙ ΣΤΑ ΦΑΓΗΤΑ ΤΟΥ ΜΑΓΕΙΡΑ (GET) =====
const getCookRequests = (req, res) => {
    const cook_id = req.user.user_id; // Ο συνδεδεμένος μάγειρας

    // Query με JOINs για να πάρουμε:
    // Το ID του αιτήματος, τον τίτλο του φαγητού, και το username του καταναλωτή που το ζητάει
    const query = `
    SELECT r.request_id, r.status, r.is_delivered, r.created_at,
           l.title AS listing_title,
           u.username AS consumer_name
    FROM requests r
    JOIN listings l ON r.listing_id = l.listing_id
    JOIN users u ON r.consumer_id = u.user_id
    WHERE l.cook_id = ? AND r.status = 'pending'
    ORDER BY r.created_at DESC
  `;

    db.query(query, [cook_id], (err, results) => {
        if (err) {
            console.error("MYSQL GET REQUESTS ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των αιτημάτων' });
        }
        return res.json(results);
    });
};


// ===== ΕΓΚΡΙΣΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
const approveRequest = (req, res) => {
    const request_id = req.params.id;

    // Ξεκινάμε Transaction (συναλλαγή) γιατί πρέπει να γίνουν 3 αλλαγές μαζί στη βάση.
    // Αν μία αποτύχει, ακυρώνονται όλες για να μην καταστραφούν τα δεδομένα!
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα έναρξης συναλλαγής' });

        // 1. Βρίσκουμε ποιο listing αφορά το αίτημα
        db.query('SELECT listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) {
                return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            }

            const listing_id = results[0].listing_id;

            // 2. Έλεγχος αν υπάρχουν ακόμα διαθέσιμες μερίδες
            db.query('SELECT available_portions, cook_id FROM listings WHERE listing_id = ?', [listing_id], (err, listingResults) => {
                if (err || listingResults.length === 0) {
                    return db.rollback(() => res.status(500).json({ message: 'Το φαγητό δεν βρέθηκε' }));
                }

                const { available_portions, cook_id } = listingResults[0];

                if (available_portions <= 0) {
                    return db.rollback(() => res.status(400).json({ message: 'Δυστυχώς το φαγητό εξαντλήθηκε!' }));
                }

                // 3. Αλλαγή κατάστασης αιτήματος σε 'approved'
                db.query('UPDATE requests SET status = "approved" WHERE request_id = ?', [request_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία έγκρισης αιτήματος' }));

                    // 4. Μείωση των διαθέσιμων μερίδων κατά 1
                    db.query('UPDATE listings SET available_portions = available_portions - 1 WHERE listing_id = ?', [listing_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία ενημέρωσης μερίδων' }));

                        // 5. Σύστημα Πόντων (Β4): Προσθήκη πόντων (π.χ. +10 credits) στον Μάγειρα για την προσφορά του
                        db.query('UPDATE users SET credits = credits + 10 WHERE user_id = ?', [cook_id], (err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία απόδοσης πόντων' }));

                            // Αν όλα πήγαν τέλεια, οριστικοποιούμε τις αλλαγές στη MySQL
                            db.commit((err) => {
                                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                                return res.json({ message: 'Το αίτημα εγκρίθηκε, οι μερίδες μειώθηκαν και κερδίσατε 10 πόντους! 👍' });
                            });
                        });
                    });
                });
            });
        });
    });
};

// ===== ΑΠΟΡΡΙΨΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
const rejectRequest = (req, res) => {
    const request_id = req.params.id;

    // Στην απόρριψη αλλάζουμε απλά το status σε 'rejected' (δεν πειράζουμε μερίδες ή πόντους)
    const query = `UPDATE requests SET status = 'rejected' WHERE request_id = ?`;

    db.query(query, [request_id], (err, result) => {
        if (err) {
            console.error("MYSQL REJECT REQUEST ERROR:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά την απόρριψη του αιτήματος' });
        }
        return res.json({ message: 'Το αίτημα απορρίφθηκε επιτυχώς.' });
    });
};
module.exports = { getCookRequests, approveRequest, rejectRequest };