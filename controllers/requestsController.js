const db = require('../models/db');



// ===== 1. ΛΗΨΗ ΑΙΤΗΜΑΤΩΝ (GET) =====
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

// ===== 2. ΕΓΚΡΙΣΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
const approveRequest = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        db.query('SELECT listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const listing_id = results[0].listing_id;

            db.query('SELECT available_portions FROM listings WHERE listing_id = ?', [listing_id], (err, listingResults) => {
                if (err || listingResults.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το φαγητό δεν βρέθηκε' }));
                const { available_portions } = listingResults[0];

                if (available_portions <= 0) {
                    return db.rollback(() => res.status(400).json({ message: 'Δυστυχώς το φαγητό εξαντλήθηκε!' }));
                }

                db.query('UPDATE requests SET status = "approved" WHERE request_id = ?', [request_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία έγκρισης' }));

                    db.query('UPDATE listings SET available_portions = available_portions - 1 WHERE listing_id = ?', [listing_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Αποτυχία ενημέρωσης μερίδων' }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                            return res.json({ message: 'Το αίτημα εγκρίθηκε! Περιμένει την παραλαβή του φοιτητή.' });
                        });
                    });
                });
            });
        });
    });
};

// ===== 3. ΑΠΟΡΡΙΨΗ ΑΙΤΗΜΑΤΟΣ (PUT) =====
const rejectRequest = (req, res) => {
    const request_id = req.params.id;
    db.query('UPDATE requests SET status = "rejected" WHERE request_id = ?', [request_id], (err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά την απόρριψη' });
        return res.json({ message: 'Το αίτημα απορρίφθηκε.' });
    });
};

// ===== 4. ΕΠΙΒΕΒΑΙΩΣΗ ΠΑΡΑΛΑΒΗΣ (PUT) =====
const confirmDelivery = (req, res) => {
    const request_id = req.params.id;

    db.query('UPDATE requests SET is_delivered = "received", status = "approved" WHERE request_id = ?', [request_id], (err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα κατά την επιβεβαίωση' });
        return res.json({ message: 'Η μερίδα παραδόθηκε επιτυχώς! 📦' });
    });
};

// ===== 5. ΜΗ ΠΑΡΑΛΑΒΗ / NO SHOW (PUT) =====
const noShowRequest = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        db.query('SELECT consumer_id, listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const { consumer_id, listing_id } = results[0];

            db.query('UPDATE requests SET is_delivered = "no_show" WHERE request_id = ?', [request_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα ενημέρωσης αιτήματος' }));

                db.query('UPDATE listings SET available_portions = available_portions + 1 WHERE listing_id = ?', [listing_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα επιστροφής μερίδας' }));

                    db.query('UPDATE users SET credits = credits - 1 WHERE user_id = ?', [consumer_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα μείωσης πόντων' }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                            return res.json({ message: 'Καταγραφή No-Show. Αφαιρέθηκε 1 πόντος από τον καταναλωτή.' });
                        });
                    });
                });
            });
        });
    });
};

// ΠΡΟΣΟΧΗ: Προσθέσαμε το createRequest στα exports!
module.exports = { getCookRequests, approveRequest, rejectRequest, confirmDelivery, noShowRequest };