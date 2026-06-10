SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS unibite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unibite_db;

DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS listing_allergens;
DROP TABLE IF EXISTS allergens;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. ΠΙΝΑΚΑΣ ΧΡΗΣΤΩΝ
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(100) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role ENUM('student', 'admin') DEFAULT 'student',
                       credits INT DEFAULT 5,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ΠΙΝΑΚΑΣ ΑΓΓΕΛΙΩΝ
CREATE TABLE listings (
                          listing_id INT AUTO_INCREMENT PRIMARY KEY,
                          cook_id INT NOT NULL,
                          title VARCHAR(150) NOT NULL,
                          description TEXT,
                          image_url VARCHAR(255) DEFAULT NULL,
                          total_portions INT NOT NULL,
                          available_portions INT NOT NULL,
                          pickup_location VARCHAR(255) NOT NULL,
                          latitude DECIMAL(10, 8) DEFAULT NULL,
                          longitude DECIMAL(11, 8) DEFAULT NULL,
                          pickup_time VARCHAR(100) NOT NULL,
                          status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          FOREIGN KEY (cook_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. ΠΙΝΑΚΑΣ ΑΛΛΕΡΓΙΟΓΟΝΩΝ
CREATE TABLE allergens (
                           allergen_id INT AUTO_INCREMENT PRIMARY KEY,
                           name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. ΠΙΝΑΚΑΣ ΣΥΝΔΕΣΗΣ ΑΓΓΕΛΙΑΣ - ΑΛΛΕΡΓΙΟΓΟΝΩΝ
CREATE TABLE listing_allergens (
                                   listing_id INT NOT NULL,
                                   allergen_id INT NOT NULL,
                                   PRIMARY KEY (listing_id, allergen_id),
                                   FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
                                   FOREIGN KEY (allergen_id) REFERENCES allergens(allergen_id) ON DELETE CASCADE
);

-- 5. ΠΙΝΑΚΑΣ ΑΙΤΗΜΑΤΩΝ
CREATE TABLE requests (
                          request_id INT AUTO_INCREMENT PRIMARY KEY,
                          listing_id INT NOT NULL,
                          consumer_id INT NOT NULL,
                          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                          is_delivered ENUM('pending', 'received', 'no_show') DEFAULT 'pending',
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
                          FOREIGN KEY (consumer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6. ΠΙΝΑΚΑΣ ΑΞΙΟΛΟΓΗΣΕΩΝ
CREATE TABLE ratings (
                         rating_id INT AUTO_INCREMENT PRIMARY KEY,
                         request_id INT NOT NULL UNIQUE,
                         rating_value INT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
                         comments TEXT,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
);

-- ============================================================
-- ΑΛΛΕΡΓΙΟΓΟΝΑ
-- ============================================================
INSERT INTO allergens (name) VALUES
                                 ('Celery'), ('Cereals containing gluten'), ('Crustaceans'), ('Eggs'),
                                 ('Fish'), ('Lupin'), ('Milk'), ('Molluscs'), ('Mustard'),
                                 ('Nuts'), ('Peanuts'), ('Sesame seeds'), ('Soya'), ('Sulphur dioxide and sulphites');

-- ============================================================
-- ΧΡΗΣΤΕΣ
-- φοιτητές: student123 | admins: admin123
-- ============================================================
INSERT INTO users (username, email, password_hash, role, credits) VALUES
                                                                      ('giorgos_p',   'p210045@upatras.gr',  '$2b$10$Sg6zMb6zHcF0IZ0VkPA7BeD6.HdA.w6kArHhflw2K3VV09DtEiuYi', 'student', 10),
                                                                      ('maria_k',     'p210892@upatras.gr',  '$2b$10$Sg6zMb6zHcF0IZ0VkPA7BeD6.HdA.w6kArHhflw2K3VV09DtEiuYi', 'student', 8),
                                                                      ('nikos_a',     'p220111@upatras.gr',  '$2b$10$Sg6zMb6zHcF0IZ0VkPA7BeD6.HdA.w6kArHhflw2K3VV09DtEiuYi', 'student', 0),
                                                                      ('eleni_m',     'p230012@upatras.gr',  '$2b$10$Sg6zMb6zHcF0IZ0VkPA7BeD6.HdA.w6kArHhflw2K3VV09DtEiuYi', 'student', 5),
                                                                      ('kiriakos_s',  'p220555@upatras.gr',  '$2b$10$Sg6zMb6zHcF0IZ0VkPA7BeD6.HdA.w6kArHhflw2K3VV09DtEiuYi', 'student', 5),
                                                                      ('admin_panos', 'admin1@upatras.gr',   '$2b$10$VrZvZXdHiKz79fIv0tfuZuNi09JEGJixuoKeM1U08UwuIxn.lbxQa', 'admin',   0),
                                                                      ('admin_anna',  'admin2@upatras.gr',   '$2b$10$VrZvZXdHiKz79fIv0tfuZuNi09JEGJixuoKeM1U08UwuIxn.lbxQa', 'admin',   0);


