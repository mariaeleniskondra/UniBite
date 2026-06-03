// ========================================================
// auth.js - Διαχείριση Σύνδεσης και Εγγραφής Χρηστών
// ========================================================

const API_URL = '';

// Φόρτωση live στατιστικών από τη βάση δεδομένων
document.addEventListener('DOMContentLoaded', async () => {
    const portionsEl = document.getElementById('statPortions');
    const usersEl = document.getElementById('statUsers');
    const ratingEl = document.getElementById('statRating');

    try {
        const response = await fetch('/api/auth/stats');
        if (response.ok) {
            const stats = await response.json();
            if (portionsEl) portionsEl.textContent = stats.total_meals;
            if (usersEl) usersEl.textContent = stats.total_students;
            if (ratingEl) ratingEl.textContent = stats.avg_rating;
        }
    } catch (error) {
        console.error('Αποτυχία φόρτωσης live στατιστικών:', error);
        if (portionsEl) portionsEl.textContent = "0";
        if (usersEl) usersEl.textContent = "0";
        if (ratingEl) ratingEl.textContent = "5.0";
    }
});

function showTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    if (tab === 'login') {
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
        toggleBtns[0].classList.add('active');
        toggleBtns[1].classList.remove('active');
    } else {
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
        toggleBtns[0].classList.remove('active');
        toggleBtns[1].classList.add('active');
    }
}

// ========================================================
// 1. ΛΟΓΙΚΗ ΕΓΓΡΑΦΗΣ (REGISTER)
// ========================================================
document.getElementById('registerFormEl').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    // ΔΙΟΡΘΩΣΗ: Διαβάζουμε το ενιαίο username όπως ορίστηκε στην HTML
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!username || !email || !password) {
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Παρακαλώ συμπληρώστε όλα τα πεδία';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.classList.remove('d-none');
            successDiv.textContent = 'Ο λογαριασμός δημιουργήθηκε! Συνδεθείτε τώρα. 🎉';
            document.getElementById('registerFormEl').reset();
            setTimeout(() => showTab('login'), 2000);
        } else {
            errorDiv.classList.remove('d-none');
            errorDiv.textContent = data.message || 'Αποτυχία εγγραφής.';
        }
    } catch (error) {
        console.error('Register Error:', error);
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Σφάλμα κατά τη σύνδεση με τον διακομιστή.';
    }
});

// ========================================================
// 2. ΛΟΓΙΚΗ ΣΥΝΔΕΣΗΣ (LOGIN)
// ========================================================
document.getElementById('loginFormEl').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.add('d-none');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'cook_dashboard.html';
        } else {
            errorDiv.classList.remove('d-none');
            errorDiv.textContent = data.message || 'Λάθος στοιχεία σύνδεσης.';
        }
    } catch (error) {
        console.error('Login Error:', error);
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Σφάλμα κατά τη σύνδεση με τον διακομιστή.';
    }
});