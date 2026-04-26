export const locationData = {
    locations: [
        // ── ROAD NETWORK SKELETON ──
        { id: "j_balp", name: "Ballupur Chowk", type: "center", lat: 30.3341, lon: 78.0000 },
        { id: "j_bind", name: "Bindal Bridge", type: "center", lat: 30.3275, lon: 78.0280 },
        { id: "j_kish", name: "Kishan Nagar", type: "center", lat: 30.3256, lon: 78.0158 },
        { id: "j_chak_mid", name: "Chakrata Rd Mid", type: "center", lat: 30.3380, lon: 77.9750 },
        { id: "j_dill", name: "Dillaram Chowk", type: "center", lat: 30.3400, lon: 78.0550 },
        { id: "j_raj_1", name: "Rajpur Road Curve 1", type: "center", lat: 30.3550, lon: 78.0650 },
        { id: "j_raj_2", name: "Rajpur Road Curve 2", type: "center", lat: 30.3750, lon: 78.0750 },
        { id: "j_prince", name: "Prince Chowk", type: "center", lat: 30.3175, lon: 78.0375 },
        { id: "j_shc", name: "Saharanpur Chowk", type: "center", lat: 30.3135, lon: 78.0325 },
        { id: "j_clem", name: "Clement Town Junction", type: "center", lat: 30.2820, lon: 78.0100 },
        { id: "j_mah", name: "Majra Junction", type: "center", lat: 30.2950, lon: 78.0100 },

        // ── POPULAR LANDMARKS (User Requested) ──
        { id: "clk",  name: "Clock Tower", type: "center", lat: 30.3253, lon: 78.0413 },
        { id: "pac",  name: "Pacific Mall", type: "center", lat: 30.3665, lon: 78.0703 },
        { id: "itp",  name: "IT Park", type: "center", lat: 30.3684, lon: 78.0858 },
        { id: "crm",  name: "Crossroad Mall", type: "center", lat: 30.3308, lon: 78.0528 },
        { id: "scm",  name: "Silver City Mall", type: "center", lat: 30.3113, lon: 78.0614 },
        { id: "isbt", name: "ISBT Dehradun", type: "center", lat: 30.2892, lon: 77.9987 },
        { id: "fri",  name: "FRI Museum", type: "center", lat: 30.3425, lon: 77.9927 },
        { id: "sah",  name: "Sahastradhara", type: "center", lat: 30.3872, lon: 78.1311 },
        { id: "pre",  name: "Prem Nagar", type: "center", lat: 30.3360, lon: 77.9621 },
        { id: "geu",  name: "Graphic Era University", type: "center", lat: 30.2689, lon: 77.9931 },

        // ── EXCLUSIVE HOSTELS/PGs (Differentiator) ──
        { id: "h_shree", name: "Shree Krishna PG (Boys)", type: "hostel", lat: 30.2710, lon: 77.9950 },
        { id: "h_girls", name: "Green View Girls Hostel", type: "hostel", lat: 30.2740, lon: 77.9920 },
        { id: "h_pre",   name: "Prem Nagar Premium PG", type: "hostel", lat: 30.3340, lon: 77.9650 },
        { id: "h_bal",   name: "Ballupur Student Accom", type: "hostel", lat: 30.3320, lon: 78.0050 },

        // ── FETCHED REAL LOCATIONS ──
        { "id": "ChIJzQviZE4pCTkRnrSaEy9Yqy8", "name": "Shri Mahant Indiresh Hospital", "type": "hospital", "lat": 30.3045476, "lon": 78.02080269999999 },
        { "id": "ChIJIY7xBLkpCTkR36VRFLupqqs", "name": "City Heart Centre", "type": "hospital", "lat": 30.313376199999997, "lon": 78.0497074 },
        { "id": "ChIJS1u_XA4pCTkR054wcCVe9Ng", "name": "Kanishk Surgical Hospital", "type": "hospital", "lat": 30.2915861, "lon": 78.05076679999999 },
        { "id": "ChIJPZE-gB0pCTkR61QAotc1uV4", "name": "Kailash Hospital", "type": "hospital", "lat": 30.2882818, "lon": 78.0641818 },
        { "id": "ChIJUQbNZLwpCTkRlWF0y4Wfb-k", "name": "Baluni Hospital", "type": "hospital", "lat": 30.2891859, "lon": 78.06792659999999 },
        { "id": "ChIJGXjThpUpCTkRWTW86NuPB2I", "name": "Government Doon Medical College Hospital", "type": "hospital", "lat": 30.3196299, "lon": 78.0421506 },
        { "id": "ChIJO0Fo-PgpCTkR_ARxI9Ec0Es", "name": "Bharat Petroleum Pump", "type": "fuel", "lat": 30.303365, "lon": 78.074966 },
        { "id": "ChIJg58ov8EpCTkR3uE3blrxNGE", "name": "Universal Filling - BP", "type": "fuel", "lat": 30.3262741, "lon": 78.0439085 },
        { "id": "ChIJRZgDS70rCTkR8ccYD-dPa04", "name": "Jio-bp Ballupur", "type": "fuel", "lat": 30.336399, "lon": 78.01207699999999 },
        { "id": "ChIJrbNfUgwqCTkRHRoUZW49Zyg", "name": "Guru Kripa Petrol Pump", "type": "fuel", "lat": 30.332525399999998, "lon": 78.0002777 },
        { "id": "ChIJ16oAGO4pCTkRCnazncLmpoA", "name": "IndianOil Clock Tower", "type": "fuel", "lat": 30.328197799999998, "lon": 78.031559 },
        { "id": "ChIJuyjT48krCTkRBNvJuYL7Nqc", "name": "TATA EV Charging", "type": "ev", "lat": 30.2886246, "lon": 77.9969261 },
        { "id": "ChIJb9ZCUR8pCTkRcwwiEfXdwcU", "name": "Railway Station Parking", "type": "parking", "lat": 30.3146624, "lon": 78.033903 }
    ],
    connections: [
        // Chakrata Road Chain
        ["pre", "j_chak_mid"], ["j_chak_mid", "fri"], ["fri", "j_balp"], ["j_balp", "j_kish"], ["j_kish", "j_bind"], ["j_bind", "clk"],
        // Rajpur Road Chain
        ["clk", "j_dill"], ["j_dill", "j_raj_1"], ["j_raj_1", "pac"], ["pac", "itp"], ["itp", "j_raj_2"], ["j_raj_2", "sah"],
        // Saharanpur Road Chain
        ["isbt", "j_mah"], ["j_mah", "j_clem"], ["j_clem", "geu"], ["isbt", "j_shc"], ["j_shc", "j_prince"],
        // Haridwar Road Chain
        ["clk", "j_prince"], ["j_prince", "scm"], ["scm", "isbt"],
        // Crossroad Mall connects near Clock Tower/Dillaram
        ["clk", "crm"], ["crm", "j_dill"],
        // Shortcut
        ["bal", "j_balp"]
    ]
};

export const typeColor: Record<string, string> = {
    hospital: "#ef4444",
    fuel: "#f59e0b",
    ev: "#10b981",
    pharmacy: "#8b5cf6",
    center: "#3b82f6",
    parking: "#64748b",
    hostel: "#db2777",
    user: "#22c55e"
};