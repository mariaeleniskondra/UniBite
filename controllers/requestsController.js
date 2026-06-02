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

module.exports = { getCookRequests };