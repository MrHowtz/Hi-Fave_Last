const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const jsonFilePath = path.join(__dirname, '..', 'output', 'fhir_observations.json');


// Endpoint to serve the JSON data
router.get('/', (req, res) => {
    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Unable to read observations file' });
        }
        res.json(JSON.parse(data)); 
    });
});

module.exports = router;
