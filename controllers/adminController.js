const db = require('../models/db');

const getDashboardStats = (req, res) => {

    // 1. Query total portions
    const totalPortionsQuery = `
        SELECT COUNT(*) AS total_shared
        FROM requests
        WHERE status = 'approved'
          AND is_delivered = 'received'
          AND created_at >= NOW() - INTERVAL 1 MONTH
    `;

    // query active users
    const activeUsersQuery = `
        SELECT COUNT(*) AS active_users
        FROM users
    `;

    //Query avg rating
    const globalAvgRatingQuery = `
        SELECT AVG(rating_value) AS global_avg_rating
        FROM ratings
    `;

    // Query  Top Donor
    const topDonorQuery = `
        SELECT u.user_id, u.username, COUNT(r.request_id) AS total_portions
        FROM users u
                 JOIN listings l ON u.user_id = l.cook_id
                 JOIN requests r ON l.listing_id = r.listing_id
        WHERE r.status = 'approved' AND r.is_delivered = 'received'
        GROUP BY u.user_id, u.username
        ORDER BY total_portions DESC
        LIMIT 1
    `;

    //  Query  Top 3 Meals
    const topMealsQuery = `
    SELECT l.title, u.username AS cook_name, AVG(ra.rating_value) AS avg_rating, COUNT(ra.rating_id) AS total_reviews
    FROM listings l
    JOIN users u ON l.cook_id = u.user_id
    JOIN requests r ON l.listing_id = r.listing_id
    JOIN ratings ra ON r.request_id = ra.request_id
    GROUP BY l.listing_id, l.title, u.username
    ORDER BY avg_rating DESC, total_reviews DESC
    LIMIT 3
  `;


    db.query(totalPortionsQuery, (err, portionsResult) => {
        if (err) {
            console.error("MySQL Admin Stats Error (Portions):", err);
            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των στατιστικών μερίδων' });
        }

        db.query(activeUsersQuery, (err, usersResult) => {
            if (err) {
                console.error("MySQL Admin Stats Error (Users):", err);
                return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των ενεργών χρηστών' });
            }

            db.query(globalAvgRatingQuery, (err, ratingResult) => {
                if (err) {
                    console.error("MySQL Admin Stats Error (Global Rating):", err);
                    return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη της γενικής αξιολόγησης' });
                }

                db.query(topDonorQuery, (err, donorsResult) => {
                    if (err) {
                        console.error("MySQL Admin Stats Error (Donors):", err);
                        return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη του leaderboard' });
                    }

                    db.query(topMealsQuery, (err, mealsResult) => {
                        if (err) {
                            console.error("MySQL Admin Stats Error (Meals):", err);
                            return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των κορυφαίων γευμάτων' });
                        }


                        return res.json({
                            totalShared: portionsResult[0].total_shared || 0,
                            activeUsers: usersResult[0].active_users || 0,
                            globalAvgRating: ratingResult[0].global_avg_rating || 0,
                            topDonors: donorsResult,
                            topMeals: mealsResult
                        });
                    });
                });
            });
        });
    });
};

module.exports = { getDashboardStats };