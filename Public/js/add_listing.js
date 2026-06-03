// ========================================================
// add_listing.js - Ολοκληρωμένη Δημιουργία Αγγελίας με Εικόνα
// ========================================================

const API_URL = ''; // Αφήνουμε κενό για να παίρνει αυτόματα το τρέχον host (localhost:8080)

document.getElementById('addListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('listingError');
    const successDiv = document.getElementById('listingSuccess');

    // Καθαρισμός παλιών μηνυμάτων
    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    // 1. Έλεγχος αν ο χρήστης είναι συνδεδεμένος (ύπαρξη Token)
    const token = localStorage.getItem('token');
    if (!token) {
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Δεν είστε συνδεδεμένος/η. Παρακαλώ συνδεθείτε ξανά.';
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }

    // 2. Χρήση FormData για την υποστήριξη αποστολής αρχείου (Multipart/Form-Data)
    const formData = new FormData();

    // Προσθήκη των βασικών κειμένων και αριθμών
    formData.append('title', document.getElementById('title').value.trim());
    formData.append('total_portions', parseInt(document.getElementById('total_portions').value));
    formData.append('pickup_location', document.getElementById('pickup_location').value.trim());
    formData.append('pickup_time', document.getElementById('pickup_time').value.trim());
    formData.append('description', document.getElementById('description').value.trim());

    // 3. Προσθήκη του αρχείου εικόνας (αν έχει επιλεγεί από τον χρήστη - Προαιρετικό!)
    const imageInput = document.getElementById('image');
    if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]); // Το όνομα 'image' πρέπει να είναι ολόιδιο με το upload.single('image') στο router
    }

    // 4. Μάζεμα των επιλεγμένων αλλεργιογόνων
    const selectedAllergens = [];
    const checkboxes = document.querySelectorAll('.allergen-checkbox:checked');
    checkboxes.forEach((cb) => {
        selectedAllergens.push(parseInt(cb.value));
    });

    // ΕΠΕΞΗΓΗΣΗ: Επειδή το FormData δέχεται μόνο strings ή αρχεία, μετατρέπουμε τον πίνακα
    // των αλλεργιογόνων σε JSON String. Το backend θα αναλάβει να το κάνει JSON.parse()
    formData.append('allergens', JSON.stringify(selectedAllergens));

    try {
        // 5. Αποστολή των δεδομένων στο Backend API
        const response = await fetch(`${API_URL}/api/listings`, {
            method: 'POST',
            headers: {
                // ΠΡΟΣΟΧΗ: ΔΕΝ βάζουμε 'Content-Type'. Όταν στέλνουμε FormData, ο browser
                // ρυθμίζει αυτόματα το σωστό Content-Type μαζί με το απαραίτητο multipart boundary!
                'Authorization': `Bearer ${token}`
            },
            body: formData // Στέλνουμε το formData αντικείμενο αντί για JSON string
        });

        const data = await response.json();

        if (response.ok) {
            // Εμφάνιση μηνύματος επιτυχίας
            successDiv.classList.remove('d-none');
            successDiv.textContent = 'Η αγγελία σας δημοσιεύτηκε με επιτυχία! 🚀';

            // Καθαρισμός της φόρμας
            document.getElementById('addListingForm').reset();

            // Μετά από 2 δευτερόλεπτα, μεταφορά του μάγειρα στο Dashboard του
            setTimeout(() => {
                window.location.href = 'cook_dashboard.html';
            }, 2000);
        } else {
            errorDiv.classList.remove('d-none');
            errorDiv.textContent = data.message || 'Αποτυχία δημοσίευσης αγγελίας.';
        }

    } catch (error) {
        console.error('Add Listing Error:', error);
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Σφάλμα κατά τη σύνδεση με τον διακομιστή.';
    }
});