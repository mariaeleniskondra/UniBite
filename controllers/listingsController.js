const db = require('../models/db');

// ===== ΑΝΑΚΤΗΣΗ ΠΡΟΣΦΑΤΩΝ ΑΓΓΕΛΙΩΝ (ΤΕΛΕΥΤΑΙΕΣ 48 ΩΡΕΣ) =====
const getRecentListings = async (req, res) => {
  try {
    // Επιλέγουμε όλες τις αγγελίες που δημιουργήθηκαν τις τελευταίες 48 ώρες.
    // Συμπεριλαμβάνονται και αυτές με available_portions = 0 (ελέγχεται στο frontend για styling).
    const query = `
      SELECT 
        l.*,
        u.username as cook_name
      FROM listings l
      JOIN users u ON l.cook_id = u.user_id
      WHERE l.created_at >= NOW() - INTERVAL 48 HOUR
        AND l.status != 'deleted'
      ORDER BY l.created_at DESC
    `;

    const [results] = await db.query(query);

    return res.status(200).json({
      success: true,
      count: results.length,
      listings: results
    });
  } catch (error) {
    console.error("MYSQL SELECT ERROR (Recent Listings):", error);
    return res.status(500).json({ 
      success: false,
      message: 'Σφάλμα server κατά την ανάκτηση των αγγελιών' 
    });
  }
};

module.exports = { 
  getRecentListings
};