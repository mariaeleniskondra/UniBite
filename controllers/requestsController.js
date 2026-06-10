const db = require('../models/db');

// ===== ΛΗΨΗ ΑΙΤΗΜΑΤΩΝ ΜΑΓΕΙΡΑ (GET) =====
const getCookRequests = (req, res) => {
    const cook_id = req.user.user_id;

    const query = `
        SELECT r.request_id, r.status, r.is_delivered, r.created_at,
               l.title AS listing_title,
               u.username AS consumer_name
        FROM requests r
                 JOIN listings l ON r.listing_id = l.listing_id
                 JOIN users u ON r.consumer_id = u.user_id
        WHERE l.cook_id = ? AND r.status IN ('pending', 'approved') AND r.is_delivered = 'pending'
        ORDER BY r.created_at DESC
    `;

    db.query(query, [cook_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των αιτημάτων' });
        return res.json(results);
    });
};

// ===== ΔΗΜΙΟΥΡΓΙΑ ΑΙΤΗΜΑΤΟΣ (POST) =====
const createRequest = (req, res) => {
    const { listing_id } = req.body;
    const consumer_id = req.user.user_id;

    if (!listing_id) {
        return res.status(400).json({ message: 'Δεν δόθηκε το ID της αγγελίας.' });
    }

    db.query('SELECT credits FROM users WHERE user_id = ?', [consumer_id], (err, userResults) => {
        if (err || userResults.length === 0) {
            return res.status(500).json({ message: 'Σφάλμα κατά τον έλεγχο των πόντων.' });
        }

        if (userResults[0].credits <= 0) {
            return res.status(400).json({ message: 'Δεν έχεις αρκετούς πόντους για να κάνεις κράτηση! ❌' });
        }

        db.query('SELECT available_portions, cook_id FROM listings WHERE listing_id = ? AND status = "active"', [listing_id], (err, listingResults) => {
            if (err || listingResults.length === 0) {
                return res.status(404).json({ message: 'Η αγγελία δεν βρέθηκε ή δεν είναι ενεργή.' });
            }

            const { available_portions, cook_id } = listingResults[0];

            if (cook_id === consumer_id) {
                return res.status(400).json({ message: 'Δεν μπορείς να κάνεις κράτηση στο δικό σου φαγητό!' });
            }

            if (available_portions <= 0) {
                return res.status(400).json({ message: 'Οι μερίδες εξαντλήθηκαν!' });
            }

            const insertQuery = 'INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (?, ?, "pending", "pending")';
            db.query(insertQuery, [listing_id, consumer_id], (err, result) => {
                if (err) return res.status(500).json({ message: 'Αποτυχία δημιουργίας αιτήματος.' });
                return res.status(201).json({ message: 'Το αίτημα στάλθηκε στον μάγειρα! 🍳', request_id: result.insertId });
            });
        });
    });
};

// ===== ΕΓΚΡΙΣΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
// Μειώνει τις διαθέσιμες μερίδες κατά 1
const approveRequest = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        db.query('SELECT listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const listing_id = results[0].listing_id;

            db.query('SELECT available_portions FROM listings WHERE listing_id = ?', [listing_id], (err, listingResults) => {
                if (err || listingResults.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το φαγητό δεν βρέθηκε' }));

                const current_portions = listingResults[0].available_portions;

                if (current_portions <= 0) {
                    return db.rollback(() => res.status(400).json({ message: 'Το φαγητό εξαντλήθηκε!' }));
                }

                db.query('UPDATE requests SET status = "approved" WHERE request_id = ?', [request_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία έγκρισης' }));

                    // Μείωση διαθέσιμων μερίδων κατά 1
                    db.query('UPDATE listings SET available_portions = available_portions - 1 WHERE listing_id = ?', [listing_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία ενημέρωσης μερίδων' }));

                        // ===== ΕΔΩ ΜΠΑΙΝΕΙ Η ΠΡΟΣΘΗΚΗ ΓΙΑ ΤΟ INACTIVE =====
                        // Αν οι μερίδες που μένουν τώρα είναι 0 (δηλαδή πριν τη μείωση ήταν 1)
                        if (current_portions - 1 === 0) {
                            db.query('UPDATE listings SET status = "inactive" WHERE listing_id = ?', [listing_id], (err) => {
                                if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία αλλαγής κατάστασης σε ανενεργή' }));

                                // Commit αφού έγινε και η αλλαγή σε inactive
                                db.commit((err) => {
                                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                                    return res.json({ message: 'Το αίτημα εγκρίθηκε και η αγγελία έγινε Ανενεργή (0 μερίδες)!' });
                                });
                            });
                        } else {
                            // Αν υπάρχουν ακόμα μερίδες (> 0), προχωράμε στο κανονικό commit
                            db.commit((err) => {
                                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                                return res.json({ message: 'Το αίτημα εγκρίθηκε!' });
                            });
                        }
                        // ==================================================
                    });
                });
            });
        });
    });
};

// ===== ΑΠΟΡΡΙΨΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
const rejectRequest = (req, res) => {
    const request_id = req.params.id;
    db.query('UPDATE requests SET status = "rejected" WHERE request_id = ?', [request_id], (err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά την απόρριψη' });
        return res.json({ message: 'Το αίτημα απορρίφθηκε.' });
    });
};

// ===== ΕΠΙΒΕΒΑΙΩΣΗ ΠΑΡΑΛΑΒΗΣ (PUT) =====
// Σύμφωνα με εκφώνηση Β4:
// - Μάγειρας παίρνει +1 πόντο για κάθε παράδοση
// - Αν rating > 3/5 → επιπλέον +1 (γίνεται στο ratingController)
// - Καταναλωτής ΔΕΝ χάνει πόντους εδώ
const confirmDelivery = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        // Φέρνουμε και τον cook_id ΚΑΙ τον consumer_id
        const findUsersQuery = `
            SELECT l.cook_id, r.consumer_id
            FROM requests r
                     JOIN listings l ON r.listing_id = l.listing_id
            WHERE r.request_id = ?
        `;

        db.query(findUsersQuery, [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα εύρεσης χρηστών' }));

            const cook_id = results[0].cook_id;
            const consumer_id = results[0].consumer_id; // Πήραμε το ID του καταναλωτή

            // 1. Σημειώνουμε is_delivered = received
            db.query('UPDATE requests SET is_delivered = "received" WHERE request_id = ?', [request_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα επιβεβαίωσης' }));

                // 2. +1 πόντος στον μάγειρα
                db.query('UPDATE users SET credits = credits + 1 WHERE user_id = ?', [cook_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα ενημέρωσης πόντων μάγειρα' }));

                    // 3. -1 πόντος από τον καταναλωτή (Αυτό που ζήτησες)
                    db.query('UPDATE users SET credits = credits - 1 WHERE user_id = ?', [consumer_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα μείωσης πόντων καταναλωτή' }));

                        // Ολοκλήρωση της συναλλαγής
                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                            return res.json({ message: 'Η παράδοση καταγράφηκε! +1 πόντος στον μάγειρα, -1 στον καταναλωτή 📦' });
                        });
                    });
                });
            });
        });
    });
};

// ===== ΜΗ ΠΑΡΑΛΑΒΗ / NO SHOW (PUT) =====
// Σύμφωνα με εκφώνηση Β3:
// - is_delivered = no_show (ΟΧΙ status!)
// - Μερίδα επιστρέφεται πίσω
// - Καταναλωτής χάνει -1 πόντο
const noShowRequest = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        db.query('SELECT consumer_id, listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const { consumer_id, listing_id } = results[0];

            // ΚΡΙΣΙΜΟ: is_delivered = no_show, ΟΧΙ status
            db.query('UPDATE requests SET is_delivered = "no_show" WHERE request_id = ?', [request_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα ενημέρωσης αιτήματος' }));

                // Επιστρέφουμε τη μερίδα πίσω
                db.query('UPDATE listings SET available_portions = available_portions + 1 WHERE listing_id = ?', [listing_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα επιστροφής μερίδας' }));

                    // -1 πόντος από τον καταναλωτή που δεν ήρθε (Β3)
                    db.query('UPDATE users SET credits = credits - 1 WHERE user_id = ?', [consumer_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα μείωσης πόντων' }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                            return res.json({ message: 'No-Show καταγράφηκε. -1 πόντος από τον καταναλωτή.' });
                        });
                    });
                });
            });
        });
    });
};

// ===== ΛΗΨΗ ΑΙΤΗΜΑΤΩΝ ΚΑΤΑΝΑΛΩΤΗ (GET) =====
const getConsumerRequests = (req, res) => {
    const consumer_id = req.user.user_id;

    const query = `
        SELECT r.request_id, r.status, r.is_delivered, r.created_at,
               l.title AS listing_title, l.pickup_location, l.pickup_time,
               u.username AS cook_name,
               rt.rating_value, rt.comments AS rating_comments
        FROM requests r
            JOIN listings l ON r.listing_id = l.listing_id
            JOIN users u ON l.cook_id = u.user_id
            LEFT JOIN ratings rt ON r.request_id = rt.request_id
        WHERE r.consumer_id = ?
        ORDER BY r.created_at DESC
    `;

    db.query(query, [consumer_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των κρατήσεων' });
        return res.json(results);
    });
};

module.exports = {
    createRequest,
    getCookRequests,
    getConsumerRequests,
    approveRequest,
    rejectRequest,
    confirmDelivery,
    noShowRequest
};