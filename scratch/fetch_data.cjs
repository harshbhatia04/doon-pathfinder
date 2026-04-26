const axios = require('axios');
const fs = require('fs');
require('dotenv').config({ path: './backend/.env' });

const API_KEY = process.env.SERPAPI_KEY;
const CATEGORIES = ['hospital', 'pharmacy', 'fuel station', 'ev charging', 'parking'];
const CENTER = '30.3271,78.0315';

async function fetchLocations() {
    let allLocations = [];
    
    for (const category of CATEGORIES) {
        console.log(`Fetching ${category}...`);
        try {
            const response = await axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: 'google_maps',
                    q: `${category} in Dehradun`,
                    ll: `@${CENTER},14z`,
                    api_key: API_KEY
                }
            });
            
            const results = response.data.local_results || [];
            const formatted = results.map(r => ({
                id: r.place_id || `loc_${Math.random().toString(36).substr(2, 5)}`,
                name: r.title,
                type: category === 'fuel station' ? 'fuel' : (category === 'ev charging' ? 'ev' : category),
                lat: r.gps_coordinates?.latitude,
                lon: r.gps_coordinates?.longitude
            })).filter(r => r.lat && r.lon);
            
            allLocations = [...allLocations, ...formatted];
            console.log(`Found ${formatted.length} for ${category}`);
        } catch (err) {
            console.error(`Error fetching ${category}:`, err.message);
        }
    }
    
    fs.writeFileSync('./scratch/fetched_locations.json', JSON.stringify(allLocations, null, 2));
    console.log(`Done! Total locations: ${allLocations.length}`);
}

fetchLocations();
