SET FOREIGN_KEY_CHECKS = 0;


-- Δημιουργία και χρήση της βάσης unibite (για να κουμπώσει με τον Node.js)
CREATE DATABASE IF NOT EXISTS unibite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unibite_db;

-- Καθαρίζουμε τους παλιούς πίνακες για να αποφύγουμε conflicts
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS listing_allergens;
DROP TABLE IF EXISTS allergens;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. ΠΙΝΑΚΑΣ ΧΡΗΣΤΩΝ (Με τον ενιαίο ρόλο 'student')
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(100) NOT NULL UNIQUE, -- Εδώ αποθηκεύεται το 'Όνομα_Επώνυμο'
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role ENUM('student', 'admin') DEFAULT 'student', -- Ο ενιαίος ρόλος για όλους τους φοιτητές
                       credits INT DEFAULT 5, -- [cite: 43] Οι νέοι χρήστες ξεκινούν με 5 πόντους
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

-- 3. ΠΙΝΑΚΑΣ ΑΛΛΕΡΓΙΟΓΟΝΩΝ (Static Data) [cite: 10]
CREATE TABLE allergens (
                           allergen_id INT AUTO_INCREMENT PRIMARY KEY,
                           name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. ΠΙΝΑΚΑΣ ΣΥΝΔΕΣΗΣ ΑΓΓΕΛΙΑΣ - ΑΛΛΕΡΓΙΟΓΟΝΩΝ (Many-to-Many)
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

-- ΕΙΣΑΓΩΓΗ ΤΩΝ 14 ΒΑΣΙΚΩΝ ΑΛΛΕΡΓΙΟΓΟΝΩΝ [cite: 10]
INSERT INTO allergens (name) VALUES
                                 ('Celery'), ('Cereals containing gluten'), ('Crustaceans'), ('Eggs'),
                                 ('Fish'), ('Lupin'), ('Milk'), ('Molluscs'), ('Mustard'),
                                 ('Nuts'), ('Peanuts'), ('Sesame seeds'), ('Soya'), ('Sulphur dioxide and sulphites');