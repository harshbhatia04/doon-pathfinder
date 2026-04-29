require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());


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


app.post('/api/shortest-path', async (req, res) => {
    try {
        const result = await runCBackend(['path', req.body.startId, req.body.endId]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'failed to run pathfinder' });
    }
});


app.post('/api/find-facility', async (req, res) => {
    try {
        const result = await runCBackend(['facility', req.body.startId, req.body.facilityType]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'failed to find facility' });
    }
});


app.post('/api/search-places', async (req, res) => {
    const { query, lat, lon } = req.body;
    
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


app.post('/api/voice-announcement', async (req, res) => {
    const { source, destination, distance, time, language } = req.body;
    const template = `Your travel from ${source} to ${destination} will take approximately ${time} minutes and it is ${distance} km long.`;
    
    console.log(`Generating announcement in ${language}: "${template}"`);

    try {
        let textToSpeak = template;
        
        
        if (language !== 'en-IN') {
            try {
                const transRes = await axios.post('https://api.sarvam.ai/translate', {
                    input: template,
                    source_language_code: 'en-IN',
                    target_language_code: language,
                    model: 'mayura:v1'
                }, {
                    headers: { 'api-subscription-key': process.env.SARVAM_API_KEY }
                });
                textToSpeak = transRes.data.translated_text;
                console.log(`Translated text: ${textToSpeak}`);
            } catch (transErr) {
                console.error('Translation Error:', transErr.response?.data || transErr.message);
                
            }
        }

        
        const ttsRes = await axios.post('https://api.sarvam.ai/text-to-speech', {
            inputs: [textToSpeak],
            target_language_code: language,
            speaker: 'anushka',
            pitch: 0,
            pace: 1.1,
            loudness: 1.5,
            speech_sample_rate: 8000,
            enable_preprocessing: true,
            model: 'bulbul:v2'
        }, {
            headers: { 'api-subscription-key': process.env.SARVAM_API_KEY }
        });

        if (ttsRes.data && ttsRes.data.audios && ttsRes.data.audios.length > 0) {
            res.json({ audio: ttsRes.data.audios[0], text: textToSpeak });
        } else {
            throw new Error('No audio returned from Sarvam AI');
        }
    } catch (err) {
        console.error('Sarvam API Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'failed to generate voice announcement' });
    }
});

app.listen(3001, () => console.log('Server started on port 3001'));
