const fs = require('fs');
let data = fs.readFileSync('src/App.tsx', 'utf8');

const newText = `                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Conditions</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {h.conditions?.map(c => <span key={c} style={{ border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>{c}</span>)}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onRouteToCampus(h.id)}>
                                    📍 Route
                                </button>
                                {h.phone && (
                                    <a href={\`tel:\${h.phone.replace(/\\s+/g, '')}\`} className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                        📞 Contact
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};`;

const regex = /<div style=\{\{\s*marginBottom:\s*'24px'\s*\}\}>\s*<div style=\{\{\s*fontSize:\s*'12px',\s*fontWeight:\s*800,\s*color:\s*'var\(--text-muted\)',\s*textTransform:\s*'uppercase',\s*marginBottom:\s*'8px',\s*letterSpacing:\s*'0\.05em'\s*\}\}>Conditions<\/div>\s*\);\s*\};/m;

if (regex.test(data)) {
    data = data.replace(regex, newText);
    fs.writeFileSync('src/App.tsx', data);
    console.log("Fixed App.tsx successfully");
} else {
    console.log("Could not find target block to replace");
}
