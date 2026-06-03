const db = require('../models/db');


// Φέρνουμε ΟΛΑ τα αιτήματα
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



const createRequest = (req, res) => {
    const { listing_id } = req.body;
    const consumer_id = req.user.user_id; // Παίρνουμε το ID του φοιτητή από το JWT Token

    if (!listing_id) {
        return res.status(400).json({ message: 'Δεν δόθηκε το ID της αγγελίας.' });
    }

    // 1. Έλεγχος αν ο φοιτητής έχει αρκετούς πόντους (credits) για να κάνει κράτηση
    db.query('SELECT credits FROM users WHERE user_id = ?', [consumer_id], (err, userResults) => {
        if (err || userResults.length === 0) {
            return res.status(500).json({ message: 'Σφάλμα κατά τον έλεγχο των πόντων του χρήστη.' });
        }

        if (userResults[0].credits <= 0) {
            return res.status(400).json({ message: 'Δεν έχεις αρκετούς πόντους (credits) για να κάνεις κράτηση! ❌' });
        }

        // 2. Έλεγχος αν υπάρχουν διαθέσιμες μερίδες στην αγγελία
        db.query('SELECT available_portions, cook_id FROM listings WHERE listing_id = ? AND status = "active"', [listing_id], (err, listingResults) => {
            if (err || listingResults.length === 0) {
                return res.status(404).json({ message: 'Η αγγελία δεν βρέθηκε ή δεν είναι πλέον ενεργή.' });
            }

            const { available_portions, cook_id } = listingResults[0];

            // Απαγόρευση: Δεν μπορείς να κάνεις κράτηση στο δικό σου φαγητό!
            if (cook_id === consumer_id) {
                return res.status(400).json({ message: 'Δεν μπορείς να κάνεις κράτηση στο δικό σου φαγητό!' });
            }

            if (available_portions <= 0) {
                return res.status(400).json({ message: 'Δυστυχώς, οι μερίδες για αυτό το φαγητό εξαντλήθηκαν!' });
            }

            // 3. Εισαγωγή του αιτήματος στον πίνακα requests με κατάσταση 'pending'
            const insertQuery = 'INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (?, ?, "pending", "pending")';
            db.query(insertQuery, [listing_id, consumer_id], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Αποτυχία δημιουργίας αιτήματος κράτησης.' });
                }
                return res.status(201).json({ message: 'Το αίτημα κράτησης στάλθηκε επιτυχώς στον μάγειρα! 🍳', request_id: result.insertId });
            });
        });
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

                // Αλλάζουμε το status σε approved και μειώνουμε τη μερίδα κατά 1 (Β3)
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
// ===== ΛΗΨΗ ΑΙΤΗΜΑΤΩΝ ΚΑΤΑΝΑΛΩΤΗ (GET) =====
const getConsumerRequests = (req, res) => {
    const consumer_id = req.user.user_id;

    // ΝΕΟ QUERY: Φέρνει ΚΑΙ τη βαθμολογία (rating_value, comments) αν υπάρχει //left join gia na fernei aksiologisi an yparxei
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
        if (err) {
            console.error("Σφάλμα MySQL:", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των κρατήσεων' });
        }
        return res.json(results);
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

// ===== 4. ΕΠΙΒΕΒΑΙΩΣΗ ΠΑΡΑΛΑΒΗΣ (PUT - Β3) =====
const confirmDelivery = (req, res) => {
    const request_id = req.params.id;

    // Χρησιμοποιούμε transaction γιατί κάνουμε πολλές αλλαγές ταυτόχρονα
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        // 1. Βρίσκουμε ποιος είναι ο μάγειρας και ποιος ο καταναλωτής
        const findUsersQuery = `
            SELECT l.cook_id, r.consumer_id
            FROM requests r
                     JOIN listings l ON r.listing_id = l.listing_id
            WHERE r.request_id = ?
        `;

        db.query(findUsersQuery, [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const { cook_id, consumer_id } = results[0];

            // 2. Σημειώνουμε ότι η παραγγελία παραλήφθηκε (Βάζουμε 'received')
            db.query('UPDATE requests SET is_delivered = "received" WHERE request_id = ?', [request_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα κατά την επιβεβαίωση' }));

                // 3. Δίνουμε +1 ΒΑΣΙΚΟ ΠΟΝΤΟ στον μάγειρα
                db.query('UPDATE users SET credits = credits + 1 WHERE user_id = ?', [cook_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα κατά την προσθήκη πόντου στον μάγειρα' }));

                    // 4. Αφαιρούμε -1 ΠΟΝΤΟ από τον καταναλωτή που έφαγε
                    db.query('UPDATE users SET credits = credits - 1 WHERE user_id = ?', [consumer_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα κατά την αφαίρεση πόντου από τον καταναλωτή' }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα commit' }));
                            return res.json({ message: 'Η μερίδα παραδόθηκε! Ο μάγειρας πήρε +1 πόντο και ο καταναλωτής έδωσε -1 🪙.' });
                        });
                    });
                });
            });
        });
    });
};

// ===== 5. ΜΗ ΠΑΡΑΛΑΒΗ / NO SHOW (PUT - Β3) =====
const noShowRequest = (req, res) => {
    const request_id = req.params.id;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Σφάλμα συναλλαγής' });

        // Βρίσκουμε ποιος είναι ο καταναλωτής (consumer_id) για να του μειώσουμε τους πόντους
        db.query('SELECT consumer_id, listing_id FROM requests WHERE request_id = ?', [request_id], (err, results) => {
            if (err || results.length === 0) return db.rollback(() => res.status(500).json({ message: 'Το αίτημα δεν βρέθηκε' }));
            const { consumer_id, listing_id } = results[0];

            // Ακυρώνουμε το αίτημα
            db.query('UPDATE requests SET status = "no_show" WHERE request_id = ?', [request_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα ενημέρωσης αιτήματος' }));

                // Επιστρέφουμε τη μερίδα πίσω, αφού δεν παραλήφθηκε
                db.query('UPDATE listings SET available_portions = available_portions + 1 WHERE listing_id = ?', [listing_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: 'Σφάλμα επιστροφής μερίδας' }));

                    // Μειώνουμε τους πόντους αυτού που δεν παρέλαβε κατά 1 (Β3: "μειώνονται οι πόντοι αυτού που δεν παρέλαβε κατά 1")
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

module.exports = { createRequest, getCookRequests, getConsumerRequests, approveRequest, rejectRequest, confirmDelivery, noShowRequest };