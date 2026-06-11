let map;
let markersGroup;
let userLat = null;
let userLng = null;
let userMarker = null;

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchAvailableMeals();

    const userRole = localStorage.getItem('role');
    const adminBtn = document.getElementById('adminDashboardBtn');

    // Αν ο χρήστης είναι admin, κάνε το κουμπί ορατό!
    if (userRole === 'admin' && adminBtn) {
        adminBtn.style.display = 'inline-block'; // ή 'block' ανάλογα με το CSS σου
    }

    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            const textLabel = document.getElementById('userLocationText');
            textLabel.textContent = "Αναζήτηση τοποθεσίας...";

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    userLat = position.coords.latitude;
                    userLng = position.coords.longitude;
                    textLabel.innerHTML = "<span class='text-success fw-bold'>Η τοποθεσία βρέθηκε!</span>";
                    document.getElementById('applyFiltersBtn').disabled = false;

                    if (userMarker) { map.removeLayer(userMarker); }
                    userMarker = L.circleMarker([userLat, userLng], {
                        radius: 8, fillColor: "#0d6efd", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
                    }).addTo(map).bindPopup("Βρίσκεστε εδώ!").openPopup();

                    map.setView([userLat, userLng], 14);
                }, () => {
                    textLabel.innerHTML = "<span class='text-danger'>Σφάλμα πρόσβασης τοποθεσίας.</span>";
                });
            }
        });
    }

    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            fetchAvailableMeals();
        });
    }
});

function initMap() {
    const patrasUniversityCoords = [38.2881, 21.7885];
    map = L.map('map').setView(patrasUniversityCoords, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersGroup = L.layerGroup().addTo(map);
}

const locationCoordinates = {
    'Φοιτητική Εστία Β, Δωμάτιο 42': [38.2912, 21.7890],
    'Φοιτητική Εστία Β': [38.2912, 21.7890],
    'Κτήριο Πολυτεχνικής': [38.2865, 21.7860],
    'Φοιτητική Εστία Α': [38.2930, 21.7915],
    'Πλατεία Όλγας': [38.2462, 21.7375]
};

function fetchAvailableMeals() {
    fetch('/api/meals')
        .then(response => {
            if (!response.ok) throw new Error('Αποτυχία λήψης γευμάτων');
            return response.json();
        })
        .then(meals => {
            const feedContainer = document.getElementById('mealFeedContainer');
            feedContainer.innerHTML = '';
            markersGroup.clearLayers();

            // ΦΙΛΤΡΑΡΙΣΜΟς: active ΚΑΙ inactive (όχι deleted)
            // Οι active εμφανίζονται κανονικά, οι inactive γκριζαρισμένες
            let visibleMeals = meals.filter(meal => meal.status !== 'deleted');

            if (userLat !== null && userLng !== null) {
                const maxDist = parseFloat(document.getElementById('maxDistance').value) || 5;
                const maxRes = parseInt(document.getElementById('maxResults').value) || 10;

                visibleMeals.forEach(meal => {
                    const mLat = meal.latitude || 38.2881;
                    const mLng = meal.longitude || 21.7885;
                    meal.distance = calculateDistance(userLat, userLng, mLat, mLng);
                });

                visibleMeals = visibleMeals.filter(meal => meal.distance <= maxDist);
                visibleMeals.sort((a, b) => a.distance - b.distance);
                visibleMeals = visibleMeals.slice(0, maxRes);
            }

            if (visibleMeals.length === 0) {
                feedContainer.innerHTML = '<p class="text-muted text-center p-4">Δεν υπάρχουν διαθέσιμα γεύματα αυτή τη στιγμή.</p>';
                return;
            }

            visibleMeals.forEach(meal => {
                // Αν είναι inactive: γκριζαρισμένη κάρτα, χωρίς κουμπί κράτησης
                const isInactive = meal.status === 'inactive' || meal.available_portions === 0;

                const distanceBadge = meal.distance !== undefined
                    ? `<span class="badge bg-info text-dark mb-2">📍 ${meal.distance.toFixed(1)} km μακριά</span>`
                    : '';

                // Διαφορετικό στυλ για inactive
                const cardStyle = isInactive
                    ? 'opacity: 0.5; filter: grayscale(80%);'
                    : '';

                const portionsBadge = isInactive
                    ? `<span class="badge bg-secondary fs-6 rounded-pill px-3 py-2">${meal.available_portions} / ${meal.total_portions}</span>`
                    : `<span class="badge bg-success fs-6 rounded-pill px-3 py-2">${meal.available_portions} / ${meal.total_portions}</span>`;

                const bookButton = isInactive
                    ? `<button class="btn btn-sm btn-secondary mt-3 px-3 rounded-pill fw-bold" disabled>Εξαντλήθηκε</button>`
                    : `<button class="btn btn-sm btn-primary mt-3 px-3 rounded-pill fw-bold" onclick="bookMeal(event, ${meal.listing_id})">Κράτηση</button>`;

                const inactiveBadge = isInactive
                    ? `<span class="badge bg-secondary mb-2 ms-1">Εξαντλήθηκε</span>`
                    : '';

                const mealCard = `
                    <div class="card meal-feed-card shadow-sm border-0 p-3 rounded-4 mb-3" 
                         style="${cardStyle}" 
                         onclick="${!isInactive ? `focusOnMeal(${meal.listing_id})` : ''}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="mb-2">
                                    <span class="badge bg-purple-light text-purple">🍲 Σπιτικό Γεύμα</span>
                                    ${inactiveBadge}
                                </div>
                                ${distanceBadge}
                                <h5 class="fw-bold mb-1 text-dark">${meal.title}</h5>
                                <p class="small text-muted mb-2">${meal.description || ''}</p>
                                <div class="d-flex flex-column gap-1 small text-secondary">
                                    <span>📍 <strong>Τοποθεσία:</strong> ${meal.pickup_location}</span>
                                    <span>🕒 <strong>Ώρα Παραλαβής:</strong> ${meal.pickup_time}</span>
                                </div>
                            </div>
                            <div class="text-end">
                                ${portionsBadge}
                                <div class="small text-muted mt-1">μερίδες</div>
                                ${bookButton}
                            </div>
                        </div>
                    </div>
                `;
                feedContainer.innerHTML += mealCard;

                // Marker στον χάρτη μόνο για active αγγελίες
                if (!isInactive) {
                    const coords = (meal.latitude && meal.longitude)
                        ? [meal.latitude, meal.longitude]
                        : [38.2881, 21.7885];

                    const marker = L.marker(coords).bindPopup(`
                        <div style="font-family: sans-serif;">
                            <h6 class="fw-bold mb-1">${meal.title}</h6>
                            <p class="small text-muted mb-1">${meal.pickup_location}</p>
                            <span class="badge bg-success text-white">Μερίδες: ${meal.available_portions}</span>
                        </div>
                    `);
                    marker.listingId = meal.listing_id;
                    markersGroup.addLayer(marker);
                }
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
    event.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Δεν είστε συνδεδεμένος/η. Παρακαλώ συνδεθείτε πρώτα.');
        window.location.href = 'index.html';
        return;
    }

    if (!confirm('Θέλετε να προχωρήσετε σε δέσμευση μιας μερίδας από αυτό το γεύμα;')) {
        return;
    }

    fetch('/api/requests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ listing_id: listingId })
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Αποτυχία κατά την κράτηση.');
            return data;
        })
        .then(data => {
            alert('Η κράτηση υποβλήθηκε! Εκκρεμεί η έγκριση του μάγειρα. ⏳');
            fetchAvailableMeals(); // Ανανέωση feed
        })
        .catch(error => {
            console.error('Error during booking:', error);
            alert('Σφάλμα: ' + error.message);
        });
}