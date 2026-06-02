const db = require('../models/db');

const createRating = (req, res) => {
    const { request_id, rating_value, comments } = req.body;

    // Validation
    if (!request_id || !rating_value) {
        return res.status(400).json({ message: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία (Request ID και Βαθμολογία)' });
    }

    // rating between 1-5
    if (rating_value < 1 || rating_value > 5) {
        return res.status(400).json({ message: 'Η βαθμολογία πρέπει να είναι από 1 έως 5 αστέρια' });
    }

    // insert to db
    const insertRatingQuery = `
        INSERT INTO ratings (request_id, rating_value, comments) 
        VALUES (?, ?, ?)
    `;

    db.query(insertRatingQuery, [request_id, rating_value, comments], (err, result) => {
        if (err) {
            console.error("MySQL Error on inserting rating:", err);

            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Έχετε ήδη υποβάλει αξιολόγηση για αυτό το αίτημα' });
            }
            return res.status(500).json({ message: 'Σφάλμα κατά την αποθήκευση της αξιολόγησης' });
        }

        // cook bonus
        if (rating_value > 3) {

            const findCookQuery = `
                SELECT l.cook_id 
                FROM requests r
                JOIN listings l ON r.listing_id = l.listing_id
                WHERE r.request_id = ?
            `;

            db.query(findCookQuery, [request_id], (err, cookResult) => {
                if (err || cookResult.length === 0) {
                    console.error("Error finding cook for credit reward:", err);
                    // Επιστρέφουμε 201 επειδή η αξιολόγηση μπήκε, έστω κι αν απέτυχε το reward
                    return res.status(201).json({ message: 'Η αξιολόγηση υποβλήθηκε επιτυχώς' });
                }

                const cookId = cookResult[0].cook_id;


                const rewardCookQuery = `
                    UPDATE users 
                    SET credits = credits + 1 
                    WHERE user_id = ?
                `;

                db.query(rewardCookQuery, [cookId], (err, updateResult) => {
                    if (err) {
                        console.error("Error updating cook credits:", err);
                    } else {
                        console.log(`Ο μάγειρας με user_id ${cookId} πήρε +1 πόντο λόγω καλής αξιολόγησης!`);
                    }

                    return res.status(201).json({
                        message: 'Η αξιολόγηση υποβλήθηκε επιτυχώς! Ο μάγειρας επιβραβεύτηκε με +1 πόντο.'
                    });
                });
            });
        } else {

            return res.status(201).json({ message: 'Η αξιολόγηση υποβλήθηκε επιτυχώς' });
        }
    });
};

module.exports = { createRating };