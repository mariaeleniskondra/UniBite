const db = require('../models/db');

const getDashboardStats = (req,res) =>{

    const totalPortionsQuery = `
    SELECT COUNT(*) AS total_shared 
    FROM requests 
    WHERE status = 'approved' 
      AND is_delivered = 'received' 
      AND created_at >= NOW() - INTERVAL 1 MONTH
  `;

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
        db.query(topDonorsQuery, (err, donorsResult) => {
            if (err) {
                console.error("MySQL Admin Stats Error (Donors):", err);
                return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη του leaderboard' });
            }

            db.query(topMealsQuery, (err, mealsResult) => {
                if (err) {
                    console.error("MySQL Admin Stats Error (Meals):", err);
                    return res.status(500).json({ message: 'Σφάλμα κατά τη λήψη των κορυφαίων γευμάτων' });
                }

                // Επιστροφή όλων των αποτελεσμάτων συγκεντρωμένα στο Front-End
                return res.json({
                    totalShared: portionsResult[0].total_shared || 0,
                    topDonors: donorsResult,
                    topMeals: mealsResult
                });
            });
        });
    });

}

module.exports = { getDashboardStats };