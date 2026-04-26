const fs = require('fs');
let data = fs.readFileSync('src/App.tsx', 'utf8');

const targetH1 = `<h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--primary)' }}>🏠 Student Housing Portal</h1>`;
const newH1 = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
    <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🏠 Student Housing Portal</h1>
    <button className="btn-secondary" onClick={() => onRouteToCampus('')} style={{ fontSize: '14px', padding: '8px 16px', background: 'var(--bg-card)' }}>
        ✕ Close Portal
    </button>
</div>`;

const targetFunc = `    const handleRouteToCampus = (hostelId: string) => {
        setView('map');
        setMode('route');
        setStartId(hostelId);
        setEndId(null);
        setClickStep('end');
        setStatus('Hostel selected. Please select your campus destination.');
        const loc = locations.find(l => l.id === hostelId);
        if (loc && mapRef.current) mapRef.current.setView([loc.lat, loc.lon], 15);
    };`;
const newFunc = `    const handleRouteToCampus = (hostelId: string) => {
        setView('map');
        if (hostelId) {
            setMode('route');
            setStartId(hostelId);
            setEndId(null);
            setClickStep('end');
            setStatus('Hostel selected. Please select your campus destination.');
            const loc = locations.find(l => l.id === hostelId);
            if (loc && mapRef.current) mapRef.current.setView([loc.lat, loc.lon], 15);
        } else {
            setStatus('System ready.');
        }
    };`;

data = data.replace(targetH1, newH1);
// Normalize newlines for the function replacement
const normalize = str => str.replace(/\r\n/g, '\n').trim();
if (!data.includes(targetH1)) console.log("H1 not found");

// Regex based replacement for function to avoid whitespace issues
const funcRegex = /const handleRouteToCampus[\s\S]*?mapRef\.current\.setView.*?;[\s\n]*};/;
if (funcRegex.test(data)) {
    data = data.replace(funcRegex, newFunc.trim());
} else {
    console.log("Func not found");
}

fs.writeFileSync('src/App.tsx', data);
console.log("Patched successfully");
