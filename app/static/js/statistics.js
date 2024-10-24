document.addEventListener('DOMContentLoaded', function() {
    fetchTripSummary();
    fetchCarbonFootprint();
    fetchFrequentDestinations();
});

function fetchTripSummary() {
    fetch('/api/trip_summary')
        .then(response => response.json())
        .then(data => {
            displayTotalTrips(data.total_trips);
            displayTotalDistance(data.total_distance);
            displayAverageDistance(data.average_distance);
        })
        .catch(error => console.error('Error fetching trip summary:', error));
}

function displayTotalTrips(totalTrips) {
    const totalTripsBox = document.getElementById('totalTrips').querySelector('p');
    totalTripsBox.textContent = totalTrips;
}

function displayTotalDistance(totalDistance) {
    const totalDistanceBox = document.getElementById('totalDistance').querySelector('p');
    totalDistanceBox.textContent = totalDistance + " km";
}

function displayAverageDistance(averageDistance) {
    const averageDistanceBox = document.getElementById('averageDistance').querySelector('p');
    averageDistanceBox.textContent = averageDistance + " km";
}

function displayCarbonFootprint(carbon_public, carbon_private) {
    const carbonFootprintBox = document.getElementById('carbonFootprintComparison').querySelector('p');
    carbonFootprintBox.textContent = Math.round(carbon_public * 100)/100 + " kg CO2" + " " + Math.round(carbon_private * 100)/100 + " kg CO2";
}

function renderTripSummaryChart(data) {
    const ctx = document.getElementById('tripSummaryChart').getContext('2d');
    const tripSummaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Trips', 'Total Distance (km)', 'Average Distance (km)'],
            datasets: [{
                label: 'Trip Summary',
                data: [data.total_trips, data.total_distance, data.average_distance],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function fetchCarbonFootprint() {
    fetch('/api/carbon_footprint')
        .then(response => response.json())
        .then(data => {
            renderCarbonFootprintChart(data);
            console.log(data.carbon_footprint_private);
            displayCarbonFootprint(data.carbon_footprint_public, data.carbon_footprint_private)
        })
        .catch(error => console.error('Error fetching carbon footprint:', error));
}

function renderCarbonFootprintChart(data) {
    const ctx = document.getElementById('carbonFootprintChart').getContext('2d');
    const carbonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Public Transport', 'Private Transport'],
            datasets: [{
                label: 'Carbon Footprint',
                data: [data.carbon_footprint_public, data.carbon_footprint_private], // Adjust as needed
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'kg CO2'
                    }
                }
            }
        }
    });
}

function fetchFrequentDestinations() {
    fetch('/api/frequent_destinations')
        .then(response => response.json())
        .then(data => {
            renderFrequentDestinations(data);
        })
        .catch(error => console.error('Error fetching frequent destinations:', error));
}

function renderFrequentDestinations(data) {
    const list = document.getElementById('locationList');
    data.top_destinations.forEach(dest => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.textContent = dest.name;
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary rounded-pill';
        badge.textContent = dest.count;
        listItem.appendChild(badge);
        list.appendChild(listItem);
    });
}
