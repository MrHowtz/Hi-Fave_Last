// Import required modules
const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const cors = require('cors'); // Added for CORS support

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Import and use the router for observations
const observationsRouter = require('../routes/observations'); // Corrected path
app.use('/api/observations', observationsRouter);

// Serve static files for the frontend (if frontend exists)
app.use(express.static(path.join(__dirname, 'frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Service is running' });
});

// Create WebSocket server for real-time ECG data streaming
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    // Stream data at 1 reading per second
    const ecgDataPath = path.join(__dirname, '../output/fhir_observations.json');
    let intervalId;

    fs.readFile(ecgDataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            ws.send(JSON.stringify({ error: 'Unable to read ECG data.' }));
            return;
        }

        const ecgData = JSON.parse(data);
        let index = 0;

        intervalId = setInterval(() => {
            if (index < ecgData.length) {
                ws.send(JSON.stringify(ecgData[index]));
                index++;
            } else {
                clearInterval(intervalId);
                ws.close();
            }
        }, 1000); // 1 reading per second
    });

    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clearInterval(intervalId);
    });
});

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Error handling middleware (must come after all other handlers)
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
});
