// ========================================================
// cook_dashboard.js - Διαχείριση Πίνακα Ελέγχου Μάγειρα
// ========================================================

const API_URL = '';

// Μόλις φορτώσει η σελίδα, τρέχουμε τις συναρτήσεις
document.addEventListener('DOMContentLoaded', () => {
    loadCookListings();
});

// ===== ΣΥΝΑΡΤΗΣΗ: Φόρτωση Αγγελιών Μάγειρα =====
async function loadCookListings() {
    const container = document.getElementById('myListingsContainer');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/listings`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const listings = await response.json();

        if (!response.ok) {
            container.innerHTML = `<div class="alert alert-danger">${listings.message}</div>`;
            return;
        }

        // Αν ο μάγειρας δεν έχει ανεβάσει ακόμα καμία αγγελία
        if (listings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 bg-light rounded border border-dashed">
                    <p class="text-muted mb-3">Δεν έχετε ανεβάσει κάποιο φαγητό ακόμα.</p>
                    <a href="add_listing.html" class="btn btn-primary btn-sm">Δημιουργία Πρώτης Αγγελίας 👨‍🍳</a>
                </div>
            `;
            return;
        }

        // Καθαρίζουμε το container και χτίζουμε τις κάρτες δυναμικά (DOM Manipulation)
        container.innerHTML = '';
        listings.forEach(item => {
            // Έλεγχος κατάστασης (Active / Inactive) βάσει μερίδων
            const statusBadge = item.available_portions > 0
                ? '<span class="badge bg-success">Ενεργή</span>'
                : '<span class="badge bg-secondary">Εξαντλήθηκε</span>';

            const card = document.createElement('div');
            card.className = 'card shadow-sm border-0 mb-3 p-3 bg-white rounded';
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="mb-2">${statusBadge}</div>
                        <h5 class="fw-bold text-primary m-0">${item.title}</h5>
                        <p class="text-muted small my-1">📍 Τοποθεσία: ${item.pickup_location}</p>
                        <p class="text-muted small my-1">⏰ Ώρες: ${item.pickup_time}</p>
                        <p class="mt-2 text-dark" style="font-size: 0.95rem;">${item.description || '<i>Χωρίς περιγραφή</i>'}</p>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-light text-dark border p-2 mb-3 d-block">
                            ${item.available_portions} / ${item.total_portions} μερίδες
                        </span>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="editListing(${item.listing_id})">📝 Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteListing(${item.listing_id})">🗑️ Delete</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading listings:', error);
        container.innerHTML = '<div class="alert alert-danger">Σφάλμα κατά τη φόρτωση των δεδομένων.</div>';
    }
}

// Προσωρινές συναρτήσεις για Edit/Delete (Θα τις υλοποιήσουμε στη συνέχεια)
function editListing(id) { alert('Η επεξεργασία της αγγελίας ' + id + ' θα υλοποιηθεί στο επόμενο βήμα!'); }
function deleteListing(id) { alert('Η διαγραφή της αγγελίας ' + id + ' θα υλοποιηθεί στο επόμενο βήμα!'); }