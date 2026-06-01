

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

    // 2. Μάζεμα των βασικών στοιχείων από τα πεδία της φόρμας
    const title = document.getElementById('title').value.trim();
    const total_portions = parseInt(document.getElementById('total_portions').value);
    const pickup_location = document.getElementById('pickup_location').value.trim();
    const pickup_time = document.getElementById('pickup_time').value.trim();
    const description = document.getElementById('description').value.trim();

    // 3. Μάζεμα των επιλεγμένων αλλεργιογόνων (κρατάμε τα IDs τους)
    const selectedAllergens = [];
    const checkboxes = document.querySelectorAll('.allergen-checkbox:checked');
    checkboxes.forEach((cb) => {
        selectedAllergens.push(parseInt(cb.value)); // Το cb.value αντιστοιχεί στο allergen_id (1 έως 14)
    });

    // Προετοιμασία του αντικειμένου για αποστολή
    const listingData = {
        title,
        total_portions,
        pickup_location,
        pickup_time,
        description,
        allergens: selectedAllergens // Πίνακας με IDs π.χ. [2, 7]
    };

    try {
        // 4. Αποστολή των δεδομένων στο Backend API
        const response = await fetch(`${API_URL}/api/listings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Αυτή είναι η πιο κρίσιμη γραμμή. Επειδή το route της δημιουργίας αγγελίας είναι κλειδωμένο και απαιτεί σύνδεση, περνάμε το token μέσα στα headers.
                // Έτσι, το backend θα ξέρει ακριβώς ποιος μάγειρας πάει να ανεβάσει το φαγητό.
            },
            body: JSON.stringify(listingData)
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