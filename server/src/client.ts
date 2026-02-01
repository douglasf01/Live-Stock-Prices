// Create a WebSocket client that connects to your local server
        const wsLocalClient = new WebSocket('ws://localhost:8080');

        // Set up a listener for incoming messages
        wsLocalClient.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('Received from server:', data);

            // Display the received data on the web page
            const dataContainer = document.getElementById('data-container');
            dataContainer.innerHTML += `<p>${JSON.stringify(data)}</p>`;
        };

        // Optional: Handle connection open and errors
        wsLocalClient.onopen = function() {
            console.log('Connected to the WebSocket server');
        };

        wsLocalClient.onerror = function(error) {
            console.error('WebSocket error:', error);
        };