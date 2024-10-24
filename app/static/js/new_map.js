let map;
let directionsResponse;

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 18.9918, lng: 73.1276 },
    zoom: 8,
    disableDefaultUI: true
  });

const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
directionsRenderer.setMap(map);


// Initialize autocomplete
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");
const startAutocomplete = new google.maps.places.Autocomplete(startInput);
const endAutocomplete = new google.maps.places.Autocomplete(endInput);

// Handle button click
document.getElementById("submitBtn").addEventListener("click", function() {
    // Get place details
    const startPlace = startAutocomplete.getPlace();
    const endPlace = endAutocomplete.getPlace();

    if (!startPlace || !startPlace.place_id || !endPlace || !endPlace.place_id) {
        window.alert("Please select a valid location from the dropdown for both 'From' and 'To' fields.");
        return;
    }

    // Request route
    directionsService.route({
        origin: { placeId: startPlace.place_id },
        destination: { placeId: endPlace.place_id },
        travelMode: google.maps.TravelMode.TRANSIT,
    })
    .then((response) => {
        directionsResponse = response; // Update directionsResponse
        directionsRenderer.setDirections(response);
        displayRouteDetails(response);
    })
    .catch((e) => {
        window.alert("Directions request failed due to " + e);
    });
});

// Handle button click for saving trip
document.getElementById("saveTripBtn").addEventListener("click", function() {
    if (!directionsResponse) {
        window.alert("No route available to save.");
        return;
    }

    const leg = directionsResponse.routes[0].legs[0];

    const startLocation = {
        name: leg.start_address,
        latitude: leg.start_location.lat(),
        longitude: leg.start_location.lng()
    };

    const endLocation = {
        name: leg.end_address,
        latitude: leg.end_location.lat(),
        longitude: leg.end_location.lng()
    };

    const distance = leg.distance.value / 1000; // Distance in kilometers

    // Gather transport modes for each step
    const transportModes = leg.steps.map(step => step.travel_mode).join(",");
    console.log(transportModes);

    // Calculate carbon footprint based on the distance and transport mode
    const carbonFootprint = calculateCarbonFootprint(leg.steps);
    
    // Calculate carbon footprint for all steps as if they were driving
    const carbonFootprintPrivate = calculateCarbonFootprintPrivate(leg.steps);

    // Send the data to the backend using fetch
    fetch('/save_trip', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_location: startLocation,
            end_location: endLocation,
            distance: distance,
            transport_mode: transportModes,
            carbon_footprint: carbonFootprint,
            carbon_footprint_private: carbonFootprintPrivate, // Send private car carbon footprint
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Trip saved successfully', data);
        alert('Trip saved successfully!');
    })
    .catch((error) => {
        console.error('Error saving trip:', error);
        alert('Failed to save trip.');
    });
});
}

function displayRouteDetails(response) {
    const stepsContainer = document.getElementById("steps");
    const directions = response.routes[0].legs[0].steps;
    
    // Clear previous steps
    stepsContainer.innerHTML = '';

    // Create a container for the journey steps
    const ul = document.createElement('ul');
    ul.className = 'journey-steps'; // Add a class for custom styling

    directions.forEach((step, index) => {
        const li = document.createElement('li');
        li.className = 'journey-step'; // Custom class for each step

        const duration = step.duration.text;
        let transitDetails = '';

        // Debug steps in console
        console.log(`Step ${index}:`, step);

        // Check if the step has transit details
        if (step.transit) {
            const departureStop = step.transit.departure_stop.name;
            const arrivalStop = step.transit.arrival_stop.name;
            const departureTime = step.transit.departure_time ? step.transit.departure_time.text : 'N/A';
            const arrivalTime = step.transit.arrival_time ? step.transit.arrival_time.text : 'N/A';

            transitDetails = `
                <div class="transit-details">
                    <span class="transit-stop">Departure: ${departureStop} (Time: ${departureTime})</span><br>
                    <span class="transit-stop">Arrival: ${arrivalStop} (Time: ${arrivalTime})</span>
                </div>
            `;
        }

        const stepInstructions = `
            <div class="step-header">
                <span class="step-icon">${getStepIcon(step.travel_mode)}</span>
                <span class="step-instructions">${step.instructions}</span>
                <span class="step-duration">(${duration})</span>
            </div>
            <div class="step-details">
                ${transitDetails}
            </div>
        `;

        li.innerHTML = stepInstructions;

        // Add click functionality to expand/collapse details
        li.addEventListener('click', () => {
            li.classList.toggle('expanded');
        });

        ul.appendChild(li);
    });

    stepsContainer.appendChild(ul);
}

// Helper function to get appropriate icons for each mode of transport
function getStepIcon(mode) {
    switch (mode) {
        case 'WALKING':
            return '🚶';  // Walking icon
        case 'DRIVING':
            return '🚗';  // Car icon
        case 'TRANSIT':
            return '🚌';  // Bus icon
        case 'BICYCLING':
            return '🚲';  // Bicycle icon
        default:
            return 'ℹ️';  // Default info icon
    }
}



function calculateCarbonFootprint(steps) {
    // Emission factors for each mode of transport in grams of CO2 per kilometer
    const emissionFactors = {
        'WALKING': 0,         // No emissions for walking
        'BICYCLING': 0,       // No emissions for cycling
        'DRIVING': 150,       // 150 g CO2/km for driving a car
        'TRANSIT': 80,        // 80 g CO2/km for bus or public transit
        'TRAIN': 40           // 40 g CO2/km for trains
    };

    let totalCarbonFootprint = 0;

    // Iterate over each step and calculate the carbon footprint
    steps.forEach((step) => {
        const mode = step.travel_mode; // Get the travel mode
        const distanceInKm = step.distance.value / 1000; // Convert distance to kilometers

        // Look up the emission factor for the transport mode
        const emissionFactor = emissionFactors[mode] || 0;

        // Calculate the carbon footprint for this step (in grams)
        const carbonFootprintForStep = distanceInKm * emissionFactor;

        // Add the carbon footprint of this step to the total
        totalCarbonFootprint += carbonFootprintForStep;
    });

    // Return the total carbon footprint in kilograms (by dividing by 1000)
    return totalCarbonFootprint / 1000;
}

// Function to calculate carbon footprint for all steps as driving
function calculateCarbonFootprintPrivate(steps) {
    const carEmissionFactor = 150; // Emission factor for driving a car in g CO2/km

    let totalPrivateCarFootprint = 0;

    steps.forEach((step) => {
        const distanceInKm = step.distance.value / 1000; 
        totalPrivateCarFootprint += distanceInKm * carEmissionFactor; // Calculate assuming all steps as driving
    });

    return totalPrivateCarFootprint / 1000; // Return in kg
}

window.initMap = initMap;

