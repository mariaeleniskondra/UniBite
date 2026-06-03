document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile(); // ΝΕΟ: Φέρνει το όνομα και τους πόντους
    fetchConsumerRequests(); // Φέρνει τις κρατήσεις
});

// ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Τραβάει τα στοιχεία του χρήστη (όνομα, credits)
function fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                // Βάζουμε το όνομα και τους πόντους στα αντίστοιχα HTML στοιχεία
                document.getElementById('profileUsername').textContent = data.user.username;
                document.getElementById('profileCredits').textContent = data.user.credits + ' 🪙';
            }
        })
        .catch(err => {
            console.error('Σφάλμα κατά τη λήψη προφίλ:', err);
            document.getElementById('profileUsername').textContent = 'Σφάλμα φόρτωσης';
        });
}
// Τραβάει τις κρατήσεις του φοιτητή και φτιάχνει τις κάρτες
function fetchConsumerRequests() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/requests/consumer', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(requests => {
            const container = document.getElementById('consumerRequestsContainer');
            container.innerHTML = '';

            if (requests.length === 0) {
                container.innerHTML = '<p class="text-center text-muted p-4">Δεν έχετε κάνει καμία κράτηση ακόμα.</p>';
                return;
            }

            requests.forEach(req => {
                let statusBadge = '';
                if (req.status === 'pending') statusBadge = '<span class="badge bg-warning text-dark">Εκκρεμεί Έγκριση ⏳</span>';
                else if (req.status === 'approved') statusBadge = '<span class="badge bg-success">Εγκρίθηκε! ✅</span>';
                else if (req.status === 'rejected') statusBadge = '<span class="badge bg-danger">Απορρίφθηκε ❌</span>';
                else if (req.status === 'no_show') statusBadge = '<span class="badge bg-secondary">Δεν παραλάβατε (No-Show)</span>';

                // Κουτί Αξιολόγησης (Δυναμικό)
                let ratingHTML = '';

                if (req.status === 'approved' && req.is_delivered === 'received') {
                    // Αν ΥΠΑΡΧΕΙ ήδη αξιολόγηση στη βάση (req.rating_value)
                    if (req.rating_value) {
                        // Φτιάχνουμε τα αστεράκια (π.χ. αν είναι 4, βγάζει 4 αστεράκια)
                        let stars = '⭐'.repeat(req.rating_value);
                        // Ελέγχουμε αν έχει αφήσει σχόλιο
                        let commentText = req.rating_comments ? `<p class="small text-muted mt-2 mb-0"><em>"${req.rating_comments}"</em></p>` : '';

                        ratingHTML = `
                        <div class="rating-box mt-3 p-3 bg-light rounded border border-success">
                            <h6 class="fw-bold mb-1 text-success">Η αξιολόγησή σας υποβλήθηκε ✅</h6>
                            <div class="fs-5">${stars} <span class="fs-6 text-muted">(${req.rating_value}/5)</span></div>
                            ${commentText}
                        </div>
                    `;
                    }
                    // Αν ΔΕΝ ΥΠΑΡΧΕΙ αξιολόγηση (εμφάνιση κουμπιού)
                    else {
                        ratingHTML = `
                        <div class="rating-box text-center mt-3 p-3 bg-light rounded border border-warning">
                            <h6 class="fw-bold mb-1">Παραλάβατε το φαγητό;</h6>
                            <p class="small text-muted mb-2">Αξιολογήστε τον μάγειρα για να του δώσετε πόντους!</p>
                            <button class="btn btn-warning btn-sm fw-bold w-100" onclick="openRatingModal(${req.request_id})">
                                ⭐ Αξιολόγηση
                            </button>
                        </div>
                    `;
                    }
                }

                const card = `
                <div class="meal-card border rounded p-3 mb-3 shadow-sm bg-white">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="meal-title mt-0 mb-1 fw-bold text-dark">${req.listing_title}</h5>
                        ${statusBadge}
                    </div>
                    <p class="text-muted small mb-1">👨‍🍳 Από: <strong>${req.cook_name}</strong></p>
                    <p class="text-muted small mb-1">📍 Τοποθεσία: ${req.pickup_location}</p>
                    <p class="text-muted small mb-3">🕒 Ώρα: ${req.pickup_time}</p>
                    ${ratingHTML}
                </div>
            `;
                container.innerHTML += card;
            });
        })
        .catch(err => {
            console.error('Σφάλμα:', err);
            document.getElementById('consumerRequestsContainer').innerHTML = '<p class="text-danger text-center">Αποτυχία φόρτωσης κρατήσεων.</p>';
        });
}

// Ανοίγει το Modal Αξιολόγησης
function openRatingModal(requestId) {
    document.getElementById('ratingRequestId').value = requestId;
    document.getElementById('ratingComments').value = '';
    document.getElementById('ratingValue').value = '5';

    const ratingModal = new bootstrap.Modal(document.getElementById('ratingModal'));
    ratingModal.show();
}

// Υποβάλλει την Αξιολόγηση
function submitRating() {
    const requestId = document.getElementById('ratingRequestId').value;
    const ratingValue = document.getElementById('ratingValue').value;
    const comments = document.getElementById('ratingComments').value;
    const token = localStorage.getItem('token');

    fetch('/api/ratings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            request_id: parseInt(requestId),
            rating_value: parseInt(ratingValue),
            comments: comments
        })
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Αποτυχία υποβολής.');
            return data;
        })
        .then(data => {
            alert(data.message);

            // Κλείνει το modal
            const modalElement = document.getElementById('ratingModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();

            // Ξαναφορτώνει τις κρατήσεις για να εξαφανιστεί το κουμπί αξιολόγησης (εφόσον ψηφίσαμε)
            fetchConsumerRequests();
        })
        .catch(error => {
            alert('Σφάλμα: ' + error.message);
        });
}