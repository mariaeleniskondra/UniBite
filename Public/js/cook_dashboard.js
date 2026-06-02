// ========================================================
// cook_dashboard.js - Πλήρης Διαχείριση Dashboard Μάγειρα
// ========================================================

const API_URL = '';

// Μόλις φορτώσει η σελίδα, τρέχουμε τις συναρτήσεις για να γεμίσουν τα δεδομένα
document.addEventListener('DOMContentLoaded', () => {
    loadCookListings();
    loadCookRequests();
});

// ===== 1. ΣΥΝΑΡΤΗΣΗ: Φόρτωση Αγγελιών Μάγειρα =====
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

        if (listings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 bg-light rounded border border-dashed">
                    <p class="text-muted mb-3">Δεν έχετε ανεβάσει κάποιο φαγητό ακόμα.</p>
                    <a href="add_listing.html" class="btn btn-primary btn-sm">Δημιουργία Πρώτης Αγγελίας 👨‍🍳</a>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        listings.forEach(item => {
            const statusBadge = item.available_portions > 0
                ? '<span class="badge bg-success">Ενεργή</span>'
                : '<span class="badge bg-secondary">Εξαντλήθηκε</span>';

            const card = document.createElement('div');
            card.className = 'card shadow-sm border-0 mb-3 p-3 bg-white rounded';

            // Εδώ προσθέσαμε ξανά τα κουμπιά Διόρθωσης και Διαγραφής που έλειπαν!
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
                        <div class="d-flex gap-2 justify-content-end">
                            <button class="btn btn-sm btn-warning text-dark fw-bold" onclick="editListing(${item.listing_id})">📝 Διόρθωση</button>
                            <button class="btn btn-sm btn-danger fw-bold" onclick="deleteListing(${item.listing_id})">🗑️ Διαγραφή</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading listings:', error);
        container.innerHTML = '<div class="alert alert-danger">Σφάλμα κατά τη φόρτωση των αγγελιών.</div>';
    }
}

// ===== 2. ΣΥΝΑΡΤΗΣΗ: Φόρτωση Αιτημάτων Φοιτητών =====
async function loadCookRequests() {
    const container = document.getElementById('myRequestsContainer');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/requests/cook`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const requests = await response.json();

        if (requests.length === 0) {
            container.innerHTML = `<div class="text-center py-5 text-muted bg-light rounded"><p class="m-0">🙌 Δεν υπάρχουν εκκρεμή αιτήματα ή παραδόσεις.</p></div>`;
            return;
        }

        container.innerHTML = '';
        requests.forEach(req => {
            const card = document.createElement('div');

            // Διαφορετικό στυλ ανάλογα με το αν εκκρεμεί ή αν έχει εγκριθεί
            if (req.status === 'pending') {
                card.className = 'card shadow-sm border-start border-warning border-4 mb-3 p-3 bg-white rounded';
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="fw-bold m-0 text-dark">🙋‍♂️ Αίτημα από: <span class="text-primary">${req.consumer_name}</span></h6>
                            <small class="text-muted">Πιάτο: <strong>${req.listing_title}</strong></small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-success fw-bold" onclick="handleRequest(${req.request_id}, 'approve')">✓ Έγκριση</button>
                            <button class="btn btn-sm btn-outline-danger fw-bold" onclick="handleRequest(${req.request_id}, 'reject')">✕</button>
                        </div>
                    </div>
                `;
            } else if (req.status === 'approved') {
                card.className = 'card shadow-sm border-start border-success border-4 mb-3 p-3 bg-white rounded';
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="fw-bold m-0 text-success">⏳ Εγκεκριμένο (Προς Παραλαβή)</h6>
                            <small class="text-dark">Ο/Η <strong>${req.consumer_name}</strong> έρχεται για το πιάτο: <strong>${req.listing_title}</strong></small>
                        </div>
                        <div class="d-flex flex-column gap-1">
                            <button class="btn btn-sm btn-primary fw-bold" onclick="deliveryAction(${req.request_id}, 'confirm-delivery')">📦 Παραδόθηκε</button>
                            <button class="btn btn-sm btn-light text-danger fw-bold border" style="font-size:0.75rem;" onclick="deliveryAction(${req.request_id}, 'no-show')">❌ Δεν ήρθε</button>
                        </div>
                    </div>
                `;
            }
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading requests:', error);
        container.innerHTML = '<div class="alert alert-danger">Σφάλμα κατά τη φόρτωση των αιτημάτων.</div>';
    }
}

// ===== 3. ΣΥΝΑΡΤΗΣΗ: Μεταφορά στη Σελίδα Επεξεργασίας (Edit) =====
function editListing(id) { window.location.href = `edit_listing.html?id=${id}`; }

// ===== 4. ΣΥΝΑΡΤΗΣΗ: Διαγραφή Αγγελίας (Soft Delete) =====
async function deleteListing(id) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αγγελία;')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/listings/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) { alert('Η αγγελία διαγράφηκε επιτυχώς!'); loadCookListings(); } else { alert('Αποτυχία διαγραφής.'); }
    } catch (error) { alert('Σφάλμα σύνδεσης.'); }
}

// ===== 5. ΣΥΝΑΡΤΗΣΗ: Διαχείριση Έγκρισης / Απόρριψης Αιτήματος =====
async function handleRequest(requestId, action) {
    const token = localStorage.getItem('token');
    if (!confirm(action === 'approve' ? 'Θέλετε να εγκρίνετε αυτό το αίτημα;' : 'Θέλετε να απορρίψετε αυτό το αίτημα;')) return;

    try {
        const response = await fetch(`${API_URL}/api/requests/${requestId}/${action}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            alert(action === 'approve' ? 'Το αίτημα εγκρίθηκε! 👍' : 'Το αίτημα απορρίφθηκε.');
            loadCookListings(); loadCookRequests();
        } else { alert('Αποτυχία επεξεργασίας αιτήματος.'); }
    } catch (error) { alert('Σφάλμα σύνδεσης.'); }
}

// ===== 6. ΣΥΝΑΡΤΗΣΗ: Διαχείριση Παράδοσης / No-Show (Β3) =====
async function deliveryAction(requestId, endpoint) {
    const token = localStorage.getItem('token');
    const msg = endpoint === 'confirm-delivery' ? 'Επιβεβαιώνετε ότι ο φοιτητής παρέλαβε το φαγητό;' : 'Επιβεβαιώνετε ότι ο φοιτητής ΔΕΝ εμφανίστηκε για την παραλαβή;';

    if (!confirm(msg)) return;

    try {
        const response = await fetch(`${API_URL}/api/requests/${requestId}/${endpoint}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert(endpoint === 'confirm-delivery' ? 'Η παράδοση καταγράφηκε! 🎉' : 'Το No-Show καταγράφηκε και οι πόντοι αφαιρέθηκαν.');
            loadCookListings(); loadCookRequests();
        } else {
            alert('Αποτυχία ενημέρωσης κατάστασης παράδοσης.');
        }
    } catch (error) {
        alert('Σφάλμα σύνδεσης με τον server.');
    }
}

// ===== 3. ΣΥΝΑΡΤΗΣΗ: Μεταφορά στη Σελίδα Επεξεργασίας (Edit) =====
function editListing(id) {
    window.location.href = `edit_listing.html?id=${id}`;
}

// ===== 4. ΣΥΝΑΡΤΗΣΗ: Διαγραφή Αγγελίας (Soft Delete) =====
async function deleteListing(id) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αγγελία;')) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/listings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            alert('Η αγγελία διαγράφηκε επιτυχώς!');
            loadCookListings(); // Ξαναφορτώνουμε τη λίστα για να εξαφανιστεί η κάρτα live
        } else {
            alert(data.message || 'Αποτυχία διαγραφής.');
        }
    } catch (error) {
        console.error('Delete listing error:', error);
        alert('Σφάλμα κατά τη σύνδεση με τον διακομιστή.');
    }
}

// ===== 5. ΣΥΝΑΡΤΗΣΗ: Διαχείριση Έγκρισης / Απόρριψης Αιτήματος =====
async function handleRequest(requestId, action) {
    const token = localStorage.getItem('token');
    const message = action === 'approve' ? 'Θέλετε να εγκρίνετε αυτό το αίτημα;' : 'Θέλετε να απορρίψετε αυτό το αίτημα;';

    if (!confirm(message)) return;

    try {
        // Στήνουμε το PUT αίτημα προς το backend endpoint των αιτημάτων
        const response = await fetch(`${API_URL}/api/requests/${requestId}/${action}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            alert(action === 'approve' ? 'Το αίτημα εγκρίθηκε! 👍' : 'Το αίτημα απορρίφθηκε.');
            // Ανανεώνουμε live και τις δύο στήλες για να φαίνονται οι νέες μερίδες και να φύγει το αίτημα
            loadCookListings();
            loadCookRequests();
        } else {
            alert(data.message || 'Αποτυχία επεξεργασίας αιτήματος.');
        }
    } catch (error) {
        console.error('Handle request error:', error);
        alert('Σφάλμα κατά τη σύνδεση με τον διακομιστή.');
    }
}