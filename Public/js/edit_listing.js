// ========================================================
// edit_listing.js - Αυτόματο Γέμισμα και Ενημέρωση Edit
// ========================================================

const API_URL = '';

// 1. Διαβάζουμε το listing_id από το URL (π.χ. αν είναι ?id=3, απομονώνει το 3)
const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('id');

// Μόλις φορτώσει η σελίδα, τρέχουμε τη συνάρτηση για να γεμίσει η φόρμα
document.addEventListener('DOMContentLoaded', () => {
    if (!listingId) {
        alert('Δεν βρέθηκε ID αγγελίας στο URL!');
        window.location.href = 'cook_dashboard.html';
        return;
    }
    fetchOriginalListingData();
});

// ===== ΒΗΜΑ Α: ΦΟΡΤΩΣΗ ΚΑΙ ΑΥΤΟΜΑΤΟ ΓΕΜΙΣΜΑ ΤΩΝ ΣΤΟΙΧΕΙΩΝ =====
async function fetchOriginalListingData() {
    const token = localStorage.getItem('token');

    try {
        // Καλούμε το single endpoint του Backend που φτιάξαμε πριν
        const response = await fetch(`${API_URL}/api/listings/single/${listingId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'Αποτυχία φόρτωσης στοιχείων.');
            window.location.href = 'cook_dashboard.html';
            return;
        }

        // ΕΔΩ ΓΙΝΕΤΑΙ Η ΜΑΓΕΙΑ: Τοποθετούμε τις παλιές τιμές live στα πεδία της φόρμας!
        document.getElementById('title').value = data.title;
        document.getElementById('total_portions').value = data.total_portions;
        document.getElementById('pickup_location').value = data.pickup_location;
        document.getElementById('pickup_time').value = data.pickup_time;
        document.getElementById('description').value = data.description || '';

        // Τσεκάρουμε αυτόματα τα αλλεργιογόνα που είχε ήδη αποθηκευμένα ο μάγειρας
        if (data.allergens && data.allergens.length > 0) {
            data.allergens.forEach(allergenId => {
                const checkbox = document.getElementById(`allergen_${allergenId}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

    } catch (error) {
        console.error('Error fetching listing data:', error);
        alert('Σφάλμα κατά τη σύνδεση με τον server για τη λήψη των δεδομένων.');
    }
}

// ===== ΒΗΜΑ Β: ΑΠΟΣΤΟΛΗ ΤΩΝ ΝΕΩΝ ΑΛΛΑΓΩΝ (PUT) =====
document.getElementById('editListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('editError');
    const successDiv = document.getElementById('editSuccess');
    const token = localStorage.getItem('token');

    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    // Μαζεύουμε ό,τι γράφει εκείνη τη στιγμή ο χρήστης στα κουτάκια (είτε τα άλλαξε είτε όχι)
    const title = document.getElementById('title').value.trim();
    const total_portions = parseInt(document.getElementById('total_portions').value);
    const pickup_location = document.getElementById('pickup_location').value.trim();
    const pickup_time = document.getElementById('pickup_time').value.trim();
    const description = document.getElementById('description').value.trim();

    // Μαζεύουμε τα τσεκαρισμένα αλλεργιογόνα
    const selectedAllergens = [];
    document.querySelectorAll('.allergen-checkbox:checked').forEach(cb => {
        selectedAllergens.push(parseInt(cb.value));
    });

    const updatedData = {
        title,
        total_portions,
        pickup_location,
        pickup_time,
        description,
        allergens: selectedAllergens
    };

    try {
        // Στέλνουμε το PUT αίτημα ανανέωσης στο Backend
        const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedData)
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.classList.remove('d-none');
            successDiv.textContent = 'Η αγγελία ενημερώθηκε με επιτυχία! 💾';
            // Μετά από 2 δευτερόλεπτα επιστρέφει στο Dashboard για να δει τις αλλαγές
            setTimeout(() => window.location.href = 'cook_dashboard.html', 2000);
        } else {
            errorDiv.classList.remove('d-none');
            errorDiv.textContent = data.message || 'Αποτυχία ενημέρωσης αγγελίας.';
        }

    } catch (error) {
        console.error('Update error:', error);
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Σφάλμα κατά την αποθήκευση.';
    }
});