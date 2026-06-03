// ========================================================
// edit_listing.js - Αυτόματο Γέμισμα και Ενημέρωση Edit
// ========================================================

const API_URL = '';

const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!listingId) {
        alert('Δεν βρέθηκε ID αγγελίας στο URL!');
        window.location.href = 'cook_dashboard.html';
        return;
    }
    fetchOriginalListingData();
});

async function fetchOriginalListingData() {
    const token = localStorage.getItem('token');

    try {
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

        document.getElementById('title').value = data.title;
        document.getElementById('total_portions').value = data.total_portions;
        document.getElementById('pickup_location').value = data.pickup_location;
        document.getElementById('pickup_time').value = data.pickup_time;
        document.getElementById('description').value = data.description || '';

        if (data.allergens && data.allergens.length > 0) {
            data.allergens.forEach(allergenId => {
                const checkbox = document.getElementById(`allergen_${allergenId}`);
                if (checkbox) checkbox.checked = true;
            });
        }

    } catch (error) {
        console.error('Error fetching listing data:', error);
        alert('Σφάλμα κατά τη σύνδεση με τον server.');
    }
}

document.getElementById('editListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('editError');
    const successDiv = document.getElementById('editSuccess');
    const token = localStorage.getItem('token');

    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    // ΔΙΟΡΘΩΣΗ: Χρήση FormData αντί για JSON, επειδή το router περιμένει upload.single('image')
    const formData = new FormData();
    formData.append('title', document.getElementById('title').value.trim());
    formData.append('total_portions', parseInt(document.getElementById('total_portions').value));
    formData.append('pickup_location', document.getElementById('pickup_location').value.trim());
    formData.append('pickup_time', document.getElementById('pickup_time').value.trim());
    formData.append('description', document.getElementById('description').value.trim());

    const imageInput = document.getElementById('image');
    if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    const selectedAllergens = [];
    document.querySelectorAll('.allergen-checkbox:checked').forEach(cb => {
        selectedAllergens.push(parseInt(cb.value));
    });
    formData.append('allergens', JSON.stringify(selectedAllergens));

    try {
        const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // ΠΡΟΣΟΧΗ: Όχι Content-Type όταν στέλνουμε FormData!
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.classList.remove('d-none');
            successDiv.textContent = 'Η αγγελία ενημερώθηκε με επιτυχία! 💾';
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