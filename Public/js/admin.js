document.addEventListener('DOMContentLoaded', () =>{
    fetchAdminStats();
})

function fetchAdminStats() {
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            //DOM manipulation  enimerosi sinolikon meridon
            document.getElementById('totalPortions').textContent = data.totalShared;
            //enimerosi energon xriston
            document.getElementById('activeUsers').textContent = data.activeUsers;
            //enimerosi avg rating
            const rawRating = data.globalAvgRating || 0;
            document.getElementById('avgRating').textContent = parseFloat(rawRating).toFixed(1);
            // enimerosi top donor
            const donorContainer= document.getElementById('topDonorContainer');
            donorContainer.innerHTML = '';
            if (data.topDonors && data.topDonors.length > 0) {
                const primaryDonor = data.topDonors[0];
                donorContainer.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center p-3 rounded bg-light border" style="border-left: 5px solid var(--purple) !important;">
                        <div class="d-flex align-items-center gap-3">
                            <div class="fs-3">🏆</div>
                            <div>
                                <h6 class="fw-bold mb-0">${primaryDonor.username}</h6>
                                <small class="text-muted">Κορυφαίος Πάροχος Κοινότητας</small>
                            </div>
                        </div>
                        <div class="text-end">
                            <h5 class="fw-bold text-success mb-0">${primaryDonor.total_portions}</h5>
                            <small class="text-muted">Μερίδες</small>
                        </div>
                    </div>
                `;
            } else {
                donorContainer.innerHTML = '<p class="p-3 text-muted text-center">Δεν υπάρχει ακόμα Top Donor.</p>';
            }

            // 3. Ενημέρωση των Γευμάτων με την Υψηλότερη Αξιολόγηση (Λίστα Top 3)
            const mealsList = document.getElementById('topMealsList');
            mealsList.innerHTML = ''; // Καθαρισμός του "Φόρτωση..."

            if (data.topMeals && data.topMeals.length > 0) {
                data.topMeals.forEach((meal) => {
                    const formattedRating = parseFloat(meal.avg_rating).toFixed(1);

                    mealsList.innerHTML += `
                        <li class="d-flex justify-content-between align-items-center p-3 rounded mb-2 bg-light border">
                            <div>
                                <h6 class="fw-bold mb-1">${meal.title}</h6>
                                <small class="text-muted">Από: ${meal.cook_name}</small>
                            </div>
                            <div class="text-end bg-white px-3 py-1 rounded-pill border">
                                <span class="fw-bold text-warning">${formattedRating}</span> 
                                <span class="small text-muted">(${meal.total_reviews} κριτικές)</span>
                            </div>
                        </li>
                    `;
                });
            } else {
                mealsList.innerHTML = '<li class="p-3 text-muted">Δεν υπάρχουν ακόμα αξιολογήσεις γευμάτων.</li>';
            }
        })
        .catch(error => {
            console.error('Error fetching admin statistics:', error);
        });
}

