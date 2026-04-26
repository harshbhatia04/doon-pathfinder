require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// helper to run the C executable and get JSON output
function runCBackend(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('./dijkstra.exe', args);
        let data = '';
        child.stdout.on('data', (chunk) => data += chunk);
        child.on('close', () => {
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                reject(e);
            }
        });
    });
}

// api to find shortest path between two points
app.post('/api/shortest-path', async (req, res) => {
    try {
        const result = await runCBackend(['path', req.body.startId, req.body.endId]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'failed to run pathfinder' });
    }
});

// api to find the nearest facility of a certain type
app.post('/api/find-facility', async (req, res) => {
    try {
        const result = await runCBackend(['facility', req.body.startId, req.body.facilityType]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'failed to find facility' });
    }
});

// api to search for places using SerpApi near a specific location
app.post('/api/search-places', async (req, res) => {
    const { query, lat, lon } = req.body;
    // Refine query for better accuracy in India (e.g. petrol pump instead of fuel)
    let refinedQuery = query;
    if (query.toLowerCase() === 'fuel') refinedQuery = 'petrol pump';
    if (query.toLowerCase() === 'ev') refinedQuery = 'ev charging station';
    if (query.toLowerCase() === 'hostel') refinedQuery = 'hostel pg dehradun';

    const location = lat && lon ? `@${lat},${lon},15z` : '@30.3271,78.0315,15z';
    console.log(`Searching for: ${refinedQuery} near ${location}`);
    try {
        const response = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: 'google_maps',
                q: refinedQuery,
                ll: location,
                api_key: process.env.SERPAPI_KEY
            }
        });
        const results = response.data.local_results || [];
        console.log(`Found ${results.length} raw results from SerpApi`);

        let formatted = results.map(r => ({
            id: r.place_id || `serp_${Math.random().toString(36).substr(2, 9)}`,
            name: r.title,
            category: r.type || r.category || '', 
            type: query.toLowerCase().includes('hospital') ? 'hospital' : 
                  (query.toLowerCase().includes('fuel') ? 'fuel' : 
                  (query.toLowerCase().includes('pharmacy') ? 'pharmacy' : 
                  (query.toLowerCase().includes('charging') ? 'ev' : 
                  (query.toLowerCase().includes('parking') ? 'parking' : 
                  (query.toLowerCase().includes('hostel') ? 'hostel' : 'center'))))),
            lat: r.gps_coordinates?.latitude,
            lon: r.gps_coordinates?.longitude
        })).filter(r => {
            if (!r.lat || !r.lon) return false;
            // Strict filtering for fuel
            if (query.toLowerCase() === 'fuel') {
                const cat = (r.category || '').toLowerCase();
                const name = (r.name || '').toLowerCase();
                console.log(`Checking result: ${r.name} (Category: ${r.category})`);
                const isMatch = cat.includes('gas') || cat.includes('petrol') || cat.includes('fuel') || cat.includes('station') || name.includes('filling station') || name.includes('petrol pump');
                return isMatch;
            }
            return true;
        });
        console.log(`Returning ${formatted.length} filtered results`);

        // If lat/lon provided, sort by distance to ensure truly "nearest"
        if (lat && lon) {
            const getDist = (lat1, lon1, lat2, lon2) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };
            formatted.sort((a, b) => getDist(lat, lon, a.lat, a.lon) - getDist(lat, lon, b.lat, b.lon));
        }
        res.json(formatted);
    } catch (err) {
        console.error('SerpApi Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'failed to search places' });
    }
});

app.listen(3001, () => console.log('Server started on port 3001'));
