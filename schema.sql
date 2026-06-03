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


SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ratings;
TRUNCATE TABLE requests;
TRUNCATE TABLE listings;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. ΕΙΣΑΓΩΓΗ 5 ΦΟΙΤΗΤΩΝ
INSERT INTO users (username, email, password_hash, credits) VALUES
                                                                ('giorgos_p', 'p210045@upatras.gr', 'hash123', 5),
                                                                ('maria_k', 'p210892@upatras.gr', 'hash456', 5),
                                                                ('nikos_a', 'p220111@upatras.gr', 'hash789', 5),
                                                                ('eleni_m', 'p230012@upatras.gr', 'hash012', 5),
                                                                ('kiriakos_s', 'p220555@upatras.gr', 'hash345', 5);

-- 3. ΕΙΣΑΓΩΓΗ 5 ΑΓΓΕΛΙΩΝ (LISTINGS)
-- Ο Γιώργος (cook_id=1) προσφέρει 2 γεύματα
INSERT INTO listings (cook_id, title, description, total_portions, available_portions, pickup_location, pickup_time, status) VALUES
                                                                                                                                 (1, 'Παστίτσιο της γιαγιάς', 'Κλασική συνταγή με μπεσαμέλ.', 5, 2, 'Φοιτητική Εστία Β, Δωμάτιο 42', '14:00 - 15:00', 'active'),
                                                                                                                                 (1, 'Φασολάκια λαδερά', 'Φρέσκα φασολάκια με πατάτες.', 4, 1, 'Φοιτητική Εστία Β, Δωμάτιο 42', '13:30 - 14:30', 'active');

-- Η Μαρία (cook_id=2) προσφέρει 1 γεύμα
INSERT INTO listings (cook_id, title, description, total_portions, available_portions, pickup_location, pickup_time, status) VALUES
    (2, 'Γεμιστά με ρύζι', 'Παραδοσιακά γεμιστά, ιδανικά για vegan.', 4, 2, 'Κτήριο Πολυτεχνικής', '12:30 - 13:30', 'active');

-- Ο Νίκος (cook_id=3) προσφέρει 1 γεύμα
INSERT INTO listings (cook_id, title, description, total_portions, available_portions, pickup_location, pickup_time, status) VALUES
    (3, 'Φακές βελουτέ', 'Σούπα φακές με καρότο και σέλινο.', 3, 0, 'Φοιτητική Εστία Α', '13:00 - 14:00', 'inactive');

-- Η Ελένη (cook_id=4) προσφέρει 1 γεύμα
INSERT INTO listings (cook_id, title, description, total_portions, available_portions, pickup_location, pickup_time, status) VALUES
    (4, 'Μακαρόνια με κιμά', 'Σπαγγέτι με φρέσκο μοσχαρίσιο κιμά.', 6, 3, 'Πλατεία Όλγας', '15:00 - 16:00', 'active');


-- 4. ΕΙΣΑΓΩΓΗ ΟΛΟΚΛΗΡΩΜΕΝΩΝ ΑΙΤΗΜΑΤΩΝ (REQUESTS)
-- (status='approved' και is_delivered='received' για να μετρήσουν στα στατιστικά)

-- 3 αιτήματα για το Παστίτσιο του Γιώργου (listing_id=1)
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (1, 2, 'approved', 'received');
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (1, 3, 'approved', 'received');
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (1, 4, 'approved', 'received');

-- 2 αιτήματα για τα Φασολάκια του Γιώργου (listing_id=2)
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (2, 5, 'approved', 'received');
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (2, 2, 'approved', 'received');

-- 2 αιτήματα για τα Γεμιστά της Μαρίας (listing_id=3)
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (3, 1, 'approved', 'received');
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (3, 3, 'approved', 'received');

-- 1 αίτημα για τα Μακαρόνια της Ελένης (listing_id=5)
INSERT INTO requests (listing_id, consumer_id, status, is_delivered) VALUES (5, 5, 'approved', 'received');



-- 5. ΕΙΣΑΓΩΓΗ ΑΞΙΟΛΟΓΗΣΕΩΝ (RATINGS)
-- Συνδέουμε τις αξιολογήσεις με τα request_ids (1 έως 8) που δημιουργήθηκαν αυτόματα παραπάνω

-- Αξιολογήσεις για το Παστίτσιο του Γιώργου (request_id: 1, 2, 3) -> Μέσος όρος: 5.0
INSERT INTO ratings (request_id, rating_value, comments) VALUES (1, 5, 'Τέλειο!');
INSERT INTO ratings (request_id, rating_value, comments) VALUES (2, 5, 'Η καλύτερη μπεσαμέλ.');
INSERT INTO ratings (request_id, rating_value, comments) VALUES (3, 5, 'Πολύ χορταστικό.');

-- Αξιολογήσεις για τα Φασολάκια του Γιώργου (request_id: 4, 5) -> Μέσος όρος: 4.5
INSERT INTO ratings (request_id, rating_value, comments) VALUES (4, 4, 'Πολύ καλό.');
INSERT INTO ratings (request_id, rating_value, comments) VALUES (5, 5, 'Νόστιμο και σπιτικό.');

-- Αξιολογήσεις για τα Γεμιστά της Μαρίας (request_id: 6, 7) -> Μέσος όρος: 4.0
INSERT INTO ratings (request_id, rating_value, comments) VALUES (6, 4, 'Ωραία γεμιστά.');
INSERT INTO ratings (request_id, rating_value, comments) VALUES (7, 4, 'Μια χαρά φαγητό.');

-- Αξιολόγηση για τα Μακαρόνια της Ελένης (request_id: 8) -> Μέσος όρος: 3.0
INSERT INTO ratings (request_id, rating_value, comments) VALUES (8, 3, 'Λίγο κρύο αλλά γευστικό.');


