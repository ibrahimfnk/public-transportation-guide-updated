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

    // Create a list of steps
    const ul = document.createElement('ul');
    directions.forEach((step, index) => {
        const li = document.createElement('li');
        const duration = step.duration.text;
        let transitDetails = '';

        //Debug steps in console
        console.log(`Step ${index}:`, step);

        // Check if the step has transit details
        if (step.transit) {
            const departureStop = step.transit.departure_stop.name;
            const arrivalStop = step.transit.arrival_stop.name;
            const departureTime = step.transit.departure_time ? step.transit.departure_time.text : 'N/A';
            const arrivalTime = step.transit.arrival_time ? step.transit.arrival_time.text : 'N/A';

            transitDetails = `
                Get on at ${departureStop} (Departure Time: ${departureTime}) <br>
                ${arrivalStop ? ` Get off at ${arrivalStop} (Arrival Time: ${arrivalTime})` : ''}
            `;
        }

        li.innerHTML = `<div class="instructions">${step.instructions}</div>
            (Duration: ${duration})
            <br>
            ${transitDetails}`;
        

        ul.appendChild(li);
    });
    
    stepsContainer.appendChild(ul);
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

window.initMap = initMap;

