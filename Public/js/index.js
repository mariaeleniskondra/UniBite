let map;
let markersGroup;

document.addEventListener('DOMContentLoaded', () => {
    //arxikopoiisi xarti
    initMap();

    fetchAvailableMeals();
});

function initMap() {

    const patrasUniversityCoords = [38.2881, 21.7885];


    map = L.map('map').setView(patrasUniversityCoords, 15);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);


    markersGroup = L.layerGroup().addTo(map);
}

// Ένας βοηθητικός χάρτης (Geocoding Mapper) για να μετατρέπουμε τα κείμενα τοποθεσίας σε συντεταγμένες
const locationCoordinates = {
    'Φοιτητική Εστία Β, Δωμάτιο 42': [38.2912, 21.7890],
    'Φοιτητική Εστία Β': [38.2912, 21.7890],
    'Κτήριο Πολυτεχνικής': [38.2865, 21.7860],
    'Φοιτητική Εστία Α': [38.2930, 21.7915],
    'Πλατεία Όλγας': [38.2462, 21.7375] // Για την περίπτωση που κάποιος μένει κέντρο
};

function fetchAvailableMeals() {

    fetch('/api/meals')
        .then(response => {
            if (!response.ok) {
                throw new Error('Αποτυχία λήψης γευμάτων');
            }
            return response.json();
        })
        .then(meals => {
            const feedContainer = document.getElementById('mealFeedContainer');
            feedContainer.innerHTML = '';
            markersGroup.clearLayers();


            const activeMeals = meals.filter(meal => meal.status === 'active' && meal.available_portions > 0);

            if (activeMeals.length === 0) {
                feedContainer.innerHTML = '<p class="text-muted text-center p-4">Δεν υπάρχουν διαθέσιμα γεύματα αυτή τη στιγμή.</p>';
                return;
            }


            activeMeals.forEach(meal => {
                const mealCard = `
                    <div class="card meal-feed-card shadow-sm border-0 p-3 rounded-4 mb-3" onclick="focusOnMeal(${meal.listing_id})">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <span class="badge bg-purple-light text-purple mb-2">🍲 Σπιτικό Γεύμα</span>
                                <h5 class="fw-bold mb-1 text-dark">${meal.title}</h5>
                                <p class="small text-muted mb-2">${meal.description}</p>
                                <div class="d-flex flex-column gap-1 small text-secondary">
                                    <span>📍 <strong>Τοποθεσία:</strong> ${meal.pickup_location}</span>
                                    <span>🕒 <strong>Ώρα Παραλαβής:</strong> ${meal.pickup_time}</span>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-success fs-6 rounded-pill px-3 py-2">${meal.available_portions} / ${meal.total_portions}</span>
                                <div class="small text-muted mt-1">μερίδες</div>
                                <button class="btn btn-sm btn-primary mt-3 px-3 rounded-pill fw-bold" onclick="bookMeal(event, ${meal.listing_id})">Κράτηση</button>
                            </div>
                        </div>
                    </div>
                `;
                feedContainer.innerHTML += mealCard;

                const coords = locationCoordinates[meal.pickup_location] || [38.2881, 21.7885];

                const marker = L.marker(coords).bindPopup(`
                    <div style="font-family: 'Inter', sans-serif;">
                        <h6 class="fw-bold mb-1">${meal.title}</h6>
                        <p class="small text-muted mb-1">${meal.pickup_location}</p>
                        <span class="badge bg-success text-white">Μερίδες: ${meal.available_portions}</span>
                    </div>
                `);

                marker.listingId = meal.listing_id;
                markersGroup.addLayer(marker);
            });
        })
        .catch(error => {
            console.error('Error loading consumer feed:', error);
            document.getElementById('mealFeedContainer').innerHTML =
                '<p class="text-danger text-center p-4">Σφάλμα κατά τη σύνδεση με τον διακομιστή.</p>';
        });
}


function focusOnMeal(listingId) {
    markersGroup.eachLayer(marker => {
        if (marker.listingId === listingId) {
            map.setView(marker.getLatLng(), 17, { animate: true });
            marker.openPopup();
        }
    });
}


function bookMeal(event, listingId) {
    event.stopPropagation(); // Εμποδίζει το κλικ της κάρτας  από το να ανοίξει το popup του χάρτη ταυτόχρονα


    const token = localStorage.getItem('token');
    if (!token) {
        alert('Δεν είστε συνδεδεμένος/η. Παρακαλώ συνδεθείτε για να κάνετε κράτηση.');
        window.location.href = 'login.html';
        return;
    }

    // parathiro epivevaiosis
    if (!confirm('Θέλετε να προχωρήσετε σε δέσμευση μιας μερίδας από αυτό το γεύμα;')) {
        return;
    }

    // POST sto backend
    fetch('/api/requests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Προσθήκη του token για το authMiddleware
        },
        body: JSON.stringify({
            listing_id: listingId
        })
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Αποτυχία κατά την ολοκλήρωση της κράτησης.');
            }
            return data;
        })
        .then(data => {
            alert('Η κράτηση υποβλήθηκε με επιτυχία! Εκκρεμεί η έγκριση του μάγειρα. ⏳');

            // ananeosi feed kai xarti  live
            fetchAvailableMeals();
        })
        .catch(error => {
            console.error('Error during booking request:', error);
            alert('Σφάλμα: ' + error.message);
        });
}
