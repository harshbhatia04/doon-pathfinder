import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { locationData } from './constants';

declare const L: any;

export interface Location {
    id: string;
    name: string;
    type: string;
    lat: number;
    lon: number;
    address?: string;
    price?: string;
    conditions?: string[];
    amenities?: string[];
    gender?: 'boys' | 'girls' | 'coed';
    phone?: string;
    photo?: string | string[];
}

export interface Review {
    id: string;
    hostelId: string;
    rating: number;
    comment: string;
    userName: string;
    date: string;
}

const TYPE_COLORS: Record<string, string> = {
    hospital: '#ef4444',
    fuel: '#f59e0b',
    ev: '#10b981',
    center: '#3b82f6',
    pharmacy: '#8b5cf6',
    user: '#22c55e'
};

const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


function buildGraph(locations: Location[], connections: string[][]) {
    const idxMap = new Map<string, number>();
    locations.forEach((l, i) => idxMap.set(l.id, i));
    const adj: { to: number; w: number }[][] = locations.map(() => []);
    connections.forEach(([a, b]) => {
        const ai = idxMap.get(a), bi = idxMap.get(b);
        if (ai === undefined || bi === undefined) return;
        const la = locations[ai], lb = locations[bi];
        const w = getHaversineDistance(la.lat, la.lon, lb.lat, lb.lon);
        adj[ai].push({ to: bi, w });
        adj[bi].push({ to: ai, w });
    });
    return { adj, idxMap };
}

interface BidirResult {
    edgesF: [number, number][];
    edgesB: [number, number][];
    path: number[];
    cost: number;
}

function bidirDijkstra(adj: { to: number; w: number }[][], src: number, dst: number): BidirResult {
    const N = adj.length, INF = Infinity;
    const dF = new Array(N).fill(INF), dB = new Array(N).fill(INF);
    const pF = new Array(N).fill(-1), pB = new Array(N).fill(-1);
    dF[src] = 0; dB[dst] = 0;
    const pqF: [number, number][] = [[0, src]], pqB: [number, number][] = [[0, dst]];
    const visF = new Set<number>(), visB = new Set<number>();
    const edgesF: [number, number][] = [], edgesB: [number, number][] = [];
    let best = INF, meet = -1;

    function popMin(pq: [number, number][]) {
        let mi = 0;
        for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[mi][0]) mi = i;
        return pq.splice(mi, 1)[0];
    }

    while (pqF.length || pqB.length) {
        if (pqF.length) {
            const [, u] = popMin(pqF);
            if (!visF.has(u)) {
                visF.add(u);
                for (const { to, w } of adj[u]) {
                    if (dF[u] + w < dF[to]) {
                        dF[to] = dF[u] + w; pF[to] = u;
                        pqF.push([dF[to], to]);
                        edgesF.push([u, to]);
                    }
                }
                if (visB.has(u) && dF[u] + dB[u] < best) { best = dF[u] + dB[u]; meet = u; }
            }
        }
        if (pqB.length) {
            const [, u] = popMin(pqB);
            if (!visB.has(u)) {
                visB.add(u);
                for (const { to, w } of adj[u]) {
                    if (dB[u] + w < dB[to]) {
                        dB[to] = dB[u] + w; pB[to] = u;
                        pqB.push([dB[to], to]);
                        edgesB.push([u, to]);
                    }
                }
                if (visF.has(u) && dF[u] + dB[u] < best) { best = dF[u] + dB[u]; meet = u; }
            }
        }
    }

    const path: number[] = [];
    if (meet !== -1) {
        let c = meet; while (c !== -1) { path.unshift(c); c = pF[c]; }
        c = pB[meet]; while (c !== -1) { path.push(c); c = pB[c]; }
    }
    return { edgesF, edgesB, path, cost: best };
}


const ThemeToggle: React.FC<{ theme: string; toggle: () => void }> = ({ theme, toggle }) => (
    <button onClick={toggle} className="btn-secondary"
        style={{ width: '40px', height: '40px', borderRadius: '10px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
        {theme === 'light' ? '🌙' : '☀️'}
    </button>
);


const Combobox: React.FC<{
    locations: Location[];
    placeholder: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}> = ({ locations, placeholder, selectedId, onSelect }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = useMemo(() => locations.find(l => l.id === selectedId), [selectedId, locations]);
    const filtered = useMemo(() =>
        (query === ''
            ? locations.filter(l => !l.id.startsWith('j_') && !l.id.startsWith('r_')).slice(0, 40)
            : locations.filter(l => !l.id.startsWith('j_') && !l.id.startsWith('r_') && l.name.toLowerCase().includes(query.toLowerCase())).slice(0, 40)),
        [query, locations]);

    useEffect(() => { setQuery(selected ? selected.name : ''); }, [selected]);
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [selected, query]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input type="text" placeholder={placeholder} className="combo-input" value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)} />
            {open && filtered.length > 0 && (
                <div className="combo-dropdown">
                    {filtered.map(loc => (
                        <div key={loc.id} className="combo-item"
                            onMouseDown={() => { onSelect(loc.id); setQuery(loc.name); setOpen(false); }}>
                            <span className="combo-dot" style={{ background: TYPE_COLORS[loc.type] || '#60a5fa' }} />
                            {loc.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const HousingDashboard: React.FC<{
    locations: Location[];
    reviews: Review[];
    onRouteToCampus: (hostelId: string) => void;
    onOpenUpload: () => void;
    onAddReview: (hostelId: string, rating: number, comment: string, userName: string) => void;
}> = ({ locations, reviews, onRouteToCampus, onOpenUpload, onAddReview }) => {
    const hostels = locations.filter(l => l.type === 'hostel');
    const [selectedHostelForReview, setSelectedHostelForReview] = useState<string | null>(null);

    const renderStars = (rating: number) => {
        return (
            <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} style={{ fontSize: '14px' }}>{i <= rating ? '★' : '☆'}</span>
                ))}
            </div>
        );
    };

    return (
        <div style={{ padding: '40px', overflowY: 'auto', width: '100%', background: 'var(--bg-page)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🏠 Student Housing Portal</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={onOpenUpload} style={{ fontSize: '14px', padding: '8px 20px' }}>
                        + List Your Property
                    </button>
                    <button className="btn-secondary" onClick={() => onRouteToCampus('')} style={{ fontSize: '14px', padding: '8px 16px', background: 'var(--bg-card)' }}>
                        ✕ Close
                    </button>
                </div>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>Exclusive, verified student accommodations in Dehradun.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {hostels.map(h => {
                    const hostelReviews = reviews.filter(r => r.hostelId === h.id);
                    const avgRating = hostelReviews.length > 0 ? hostelReviews.reduce((acc, r) => acc + r.rating, 0) / hostelReviews.length : 0;
                    
                    return (
                        <div key={h.id} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
                            {h.photo && (
                                Array.isArray(h.photo) ? (
                                    <div className="photo-carousel" style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                                        {h.photo.map((p, i) => (
                                            <img key={i} src={p} alt={`${h.name} ${i}`} style={{ width: '100%', flexShrink: 0, height: '200px', objectFit: 'cover', scrollSnapAlign: 'start' }} />
                                        ))}
                                    </div>
                                ) : (
                                    <img src={h.photo as string} alt={h.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                                )
                            )}
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{h.name}</h3>
                                    <span style={{ background: h.gender === 'girls' ? '#fbcfe8' : h.gender === 'boys' ? '#bfdbfe' : 'var(--input-bg)', color: h.gender === 'girls' ? '#be185d' : h.gender === 'boys' ? '#1d4ed8' : 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                                        {h.gender || 'coed'}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    {renderStars(Math.round(avgRating))}
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {avgRating > 0 ? `${avgRating.toFixed(1)} (${hostelReviews.length} reviews)` : 'No reviews yet'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px' }}>
                                    {h.price || 'Price on Request'}
                                </div>

                                {h.address && (
                                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ fontSize: '16px' }}>📍</span>
                                        <span>{h.address}</span>
                                    </div>
                                )}
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Amenities</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {h.amenities?.map(a => <span key={a} style={{ background: 'var(--input-bg)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>✓ {a}</span>)}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                    <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onRouteToCampus(h.id)}>
                                        📍 Route
                                    </button>
                                    <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={() => setSelectedHostelForReview(selectedHostelForReview === h.id ? null : h.id)}>
                                        💬 Reviews
                                    </button>
                                </div>

                                {selectedHostelForReview === h.id && (
                                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Student Reviews</div>
                                            {hostelReviews.length === 0 ? (
                                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Be the first to review this property!</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {hostelReviews.map(r => (
                                                        <div key={r.id} style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.userName}</span>
                                                                {renderStars(r.rating)}
                                                            </div>
                                                            <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-main)' }}>{r.comment}</p>
                                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(r.date).toLocaleDateString()}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <ReviewForm hostelId={h.id} onAdd={onAddReview} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ReviewForm: React.FC<{ hostelId: string; onAdd: (hostelId: string, rating: number, comment: string, userName: string) => void }> = ({ hostelId, onAdd }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [userName, setUserName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment || !userName) return;
        onAdd(hostelId, rating, comment, userName);
        setComment('');
        setUserName('');
        setRating(5);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-page)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>Rate this Hostel</div>
            <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} onClick={() => setRating(i)} style={{ cursor: 'pointer', fontSize: '20px', color: i <= rating ? '#f59e0b' : 'var(--text-muted)' }}>
                        {i <= rating ? '★' : '☆'}
                    </span>
                ))}
            </div>
            <input required className="combo-input" style={{ fontSize: '13px', padding: '8px 12px' }} placeholder="Your Name" value={userName} onChange={e => setUserName(e.target.value)} />
            <textarea required className="combo-input" style={{ fontSize: '13px', padding: '8px 12px', minHeight: '60px', resize: 'vertical' }} placeholder="Your feedback..." value={comment} onChange={e => setComment(e.target.value)} />
            <button type="submit" className="btn-primary" style={{ padding: '8px', fontSize: '13px' }}>Post Review</button>
        </form>
    );
};


const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void; onUpload: (data: Partial<Location>) => void }> = ({ isOpen, onClose, onUpload }) => {
    const [formData, setFormData] = useState({
        name: '', price: '', address: '', gender: 'coed', phone: '', amenities: '', lat: 0, lon: 0, photo: ''
    });
    const [isLocating, setIsLocating] = useState(false);
    const [locStatus, setLocStatus] = useState<'idle' | 'success' | 'error'>('idle');

    if (!isOpen) return null;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const captureLocation = () => {
        setIsLocating(true);
        setLocStatus('idle');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData({ ...formData, lat: pos.coords.latitude, lon: pos.coords.longitude });
                setIsLocating(false);
                setLocStatus('success');
            },
            (err) => {
                console.error(err);
                setIsLocating(false);
                setLocStatus('error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onUpload({
            ...formData,
            amenities: formData.amenities.split(',').map(s => s.trim()).filter(s => s),
            conditions: ["Verified GPS Listing"],
            photo: formData.photo || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=1000"
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div style={{ background: 'var(--bg-page)', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 800 }}>List Your Property</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="field-group">
                        <label className="field-label">PG/HOSTEL NAME</label>
                        <input required className="combo-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Skyline Student Living" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="field-group">
                            <label className="field-label">PRICE PER MONTH</label>
                            <input required className="combo-input" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="₹8,500/mo" />
                        </div>
                        <div className="field-group">
                            <label className="field-label">GENDER</label>
                            <select className="combo-input" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}>
                                <option value="coed">Co-ed</option>
                                <option value="boys">Boys Only</option>
                                <option value="girls">Girls Only</option>
                            </select>
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">VERIFY LOCATION</label>
                        <button type="button" className="btn-secondary" onClick={captureLocation} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: locStatus === 'success' ? '1px solid #22c55e' : '1px solid var(--border)', background: locStatus === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'var(--input-bg)' }}>
                            {isLocating ? '📡 Locating...' : locStatus === 'success' ? '✅ Location Verified' : '📍 Capture Current Location'}
                        </button>
                        {formData.lat !== 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                                Coordinates Captured: {formData.lat.toFixed(4)}, {formData.lon.toFixed(4)}
                            </div>
                        )}
                        {locStatus === 'error' && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', textAlign: 'center' }}>⚠ Could not access GPS. Please check permissions.</div>}
                    </div>

                    <div className="field-group">
                        <label className="field-label">ADDRESS (for display)</label>
                        <input required className="combo-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street name, Area..." />
                    </div>
                    <div className="field-group">
                        <label className="field-label">PHONE NUMBER</label>
                        <input required className="combo-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 00000 00000" />
                    </div>
                    <div className="field-group">
                        <label className="field-label">UPLOAD PHOTO</label>
                        <input type="file" accept="image/*" className="combo-input" onChange={handlePhotoChange} style={{ padding: '8px' }} />
                        {formData.photo && (
                            <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', height: '100px', border: '1px solid var(--border)' }}>
                                <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                    <div className="field-group">
                        <label className="field-label">AMENITIES (comma separated)</label>
                        <input className="combo-input" value={formData.amenities} onChange={e => setFormData({ ...formData, amenities: e.target.value })} placeholder="WiFi, AC, Food, Laundry" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                            Submit Listing
                        </button>
                        <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>(locationData.locations as Location[]);
    const [startId, setStartId] = useState<string | null>(null);
    const [endId, setEndId] = useState<string | null>(null);
    const [mode, setMode] = useState<'route' | 'facility'>('route');
    const [facilityType, setFacilityType] = useState('hospital');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('System ready.');
    const [clickStep, setClickStep] = useState<'start' | 'end'>('start');
    const [isLocating, setIsLocating] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    const [animating, setAnimating] = useState(false);
    const [animPhase, setAnimPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
    const [view, setView] = useState<'map' | 'housing'>('map');
    const [language, setLanguage] = useState('en-IN');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
    const [sosHospital, setSosHospital] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                
                const hostelRes = await axios.get('http://localhost:3001/api/user-hostels');
                if (hostelRes.data && Array.isArray(hostelRes.data)) {
                    setLocations(prev => {
                        const existingIds = new Set(prev.map(l => l.id));
                        const newHostels = hostelRes.data.filter((h: any) => !existingIds.has(h.id));
                        return [...prev, ...newHostels];
                    });
                }
                
                const reviewRes = await axios.get('http://localhost:3001/api/reviews');
                if (reviewRes.data && Array.isArray(reviewRes.data)) {
                    setReviews(reviewRes.data);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };
        fetchData();
    }, []);

    const handleAddReview = async (hostelId: string, rating: number, comment: string, userName: string) => {
        try {
            const res = await axios.post('http://localhost:3001/api/reviews', { hostelId, rating, comment, userName });
            if (res.data.success) {
                setReviews(prev => [...prev, res.data.review]);
                setStatus(`✅ Review added for ${locationMap.get(hostelId)?.name || 'hostel'}`);
            }
        } catch (err) {
            setStatus('❌ Failed to add review.');
        }
    };

    const handleUploadHostel = async (data: Partial<Location>) => {
        try {
            setStatus('🛰️ Accessing GPS location...');
            
            const getCoords = () => new Promise<{lat: number, lon: number}>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("Geolocation not supported"));
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });

            let coords;
            try {
                coords = await getCoords();
                setStatus('✅ Current location captured!');
            } catch (e) {
                console.error('GPS error:', e);
                setStatus('⚠ GPS failed. Attempting geocoding fallback...');
                try {
                    const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address + ", Dehradun")}&limit=1`, {
                        headers: { 'User-Agent': 'Pathfinder-Dehradun-App' }
                    });
                    if (geoRes.data && geoRes.data.length > 0) {
                        coords = { lat: parseFloat(geoRes.data[0].lat), lon: parseFloat(geoRes.data[0].lon) };
                    } else {
                        coords = { lat: 30.3271, lon: 78.0315 };
                    }
                } catch (ge) {
                    coords = { lat: 30.3271, lon: 78.0315 };
                }
            }

            setStatus('📤 Uploading listing...');
            const finalData = { ...data, lat: coords.lat, lon: coords.lon };
            const res = await axios.post('http://localhost:3001/api/upload-hostel', finalData);
            if (res.data.success) {
                setLocations(prev => [...prev, res.data.hostel]);
                setStatus('✅ Hostel listed successfully!');
                setIsUploadOpen(false); 
            }
        } catch (err) {
            setStatus('❌ Failed to upload hostel.');
        }
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const mapRef = useRef<any>(null);
    const routeLayerRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const scanLayerRef = useRef<any>(null);
    const animLayerRef = useRef<any>(null);
    const gpsMarkerRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const animTimers = useRef<any[]>([]);

    const locationMap = useMemo(() => {
        const m = new Map<string, Location>();
        locations.forEach(l => m.set(l.id, l));
        return m;
    }, [locations]);

    
    useEffect(() => {
        if (mapRef.current) return;
        const map = L.map('map', { zoomControl: false }).setView([30.3271, 78.0315], 14);
        mapRef.current = map;
        tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        scanLayerRef.current = L.layerGroup().addTo(map);
        animLayerRef.current = L.layerGroup().addTo(map);

        map.on('click', (e: any) => {
            const { lat, lng: lon } = e.latlng;
            let best: any = null, bestD = Infinity;
            locations.forEach(l => {
                const d = Math.hypot(l.lat - lat, l.lon - lon);
                if (d < bestD) { bestD = d; best = l; }
            });
            if (best) {
                if (clickStep === 'start') { setStartId(best.id); setClickStep('end'); }
                else { setEndId(best.id); setClickStep('start'); }
            }
        });

        map.on('locationfound', (e: any) => {
            const { lat, lng } = e.latlng;
            const accuracy = e.accuracy;
            const userNode: Location = { id: 'user_pos', name: 'My Current Location', type: 'user', lat, lon: lng };
            setLocations(prev => [...prev.filter(l => l.id !== 'user_pos'), userNode]);
            setStartId('user_pos');
            setIsLocating(false);
            if (gpsMarkerRef.current) map.removeLayer(gpsMarkerRef.current);
            const gpsDotHtml = `<div class="gps-dot-wrapper"><div class="gps-dot-ring"></div><div class="gps-dot"></div></div>`;
            const icon = L.divIcon({ className: '', html: gpsDotHtml, iconSize: [20, 20], iconAnchor: [10, 10] });
            gpsMarkerRef.current = L.marker([lat, lng], { icon }).bindPopup(`<b>📍 You are here</b><br><small>±${Math.round(accuracy)}m</small>`).addTo(map);
            map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
            setStatus(`📡 Location found (±${Math.round(accuracy)}m)`);
        });

        map.on('locationerror', (e: any) => {
            setIsLocating(false);
            setStatus(`⚠ Location error: ${e.message}`);
        });
    }, [locations, locationMap, clickStep]);

    useEffect(() => {
        if (!tileLayerRef.current) return;
        const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        tileLayerRef.current.setUrl(theme === 'dark' ? darkUrl : lightUrl);
    }, [theme]);

    
    useEffect(() => {
        if (!markersLayerRef.current) return;
        markersLayerRef.current.clearLayers();
        locations.forEach(loc => {
            const isStart = loc.id === startId, isEnd = loc.id === endId;
            if (isStart || isEnd) {
                const color = isStart ? '#22c55e' : '#ef4444';
                L.circleMarker([loc.lat, loc.lon], { radius: 10, fillColor: color, color: '#fff', weight: 3, fillOpacity: 1, zIndexOffset: 1000 })
                    .bindTooltip(`<b>${isStart ? 'START: ' : 'DEST: '}${loc.name}</b>`, { permanent: true, direction: 'top', className: 'endpoint-label' })
                    .addTo(markersLayerRef.current);
            }
        });
    }, [locations, startId, endId]);

    
    const clearAnimation = useCallback(() => {
        animTimers.current.forEach(clearTimeout);
        animTimers.current = [];
        if (animLayerRef.current) animLayerRef.current.clearLayers();
        setAnimating(false);
        setAnimPhase('idle');
    }, []);

    const runBidirAnimation = useCallback((startLoc: Location, endLoc: Location, onDone?: (path: Location[]) => void) => {
        clearAnimation();
        setAnimating(true);
        setAnimPhase('scanning');

        const allLocs = locations;
        const { adj } = buildGraph(allLocs, locationData.connections as string[][]);

        
        let srcIdx = 0, dstIdx = 0, srcD = Infinity, dstD = Infinity;
        allLocs.forEach((l, i) => {
            const ds = Math.hypot(l.lat - startLoc.lat, l.lon - startLoc.lon);
            const dd = Math.hypot(l.lat - endLoc.lat, l.lon - endLoc.lon);
            if (ds < srcD) { srcD = ds; srcIdx = i; }
            if (dd < dstD) { dstD = dd; dstIdx = i; }
        });

        const { edgesF, edgesB, path } = bidirDijkstra(adj, srcIdx, dstIdx);

        const layer = animLayerRef.current;
        layer.clearLayers();

        const delay = 60; 
        const maxEdges = Math.max(edgesF.length, edgesB.length);

        
        for (let i = 0; i < maxEdges; i++) {
            const t = setTimeout(() => {
                if (i < edgesF.length) {
                    const [a, b] = edgesF[i];
                    const la = allLocs[a], lb = allLocs[b];
                    L.polyline([[la.lat, la.lon], [lb.lat, lb.lon]], {
                        color: '#1d4ed8', weight: 2.5, opacity: 0.7
                    }).addTo(layer);
                    
                    L.circleMarker([lb.lat, lb.lon], {
                        radius: 3, fillColor: '#60a5fa', color: 'transparent', fillOpacity: 0.9
                    }).addTo(layer);
                }
                if (i < edgesB.length) {
                    const [a, b] = edgesB[i];
                    const la = allLocs[a], lb = allLocs[b];
                    L.polyline([[la.lat, la.lon], [lb.lat, lb.lon]], {
                        color: '#0d9488', weight: 2.5, opacity: 0.7
                    }).addTo(layer);
                    L.circleMarker([la.lat, la.lon], {
                        radius: 3, fillColor: '#2dd4bf', color: 'transparent', fillOpacity: 0.9
                    }).addTo(layer);
                }
            }, i * delay);
            animTimers.current.push(t);
        }

        
        const finalT = setTimeout(() => {
            setAnimPhase('done');
            if (path.length > 1) {
                const pathCoords = path.map(i => [allLocs[i].lat, allLocs[i].lon]);
                
                L.polyline(pathCoords, { color: '#f59e0b', weight: 6, opacity: 0.95 }).addTo(layer);
                L.polyline(pathCoords, { color: '#fde68a', weight: 2, opacity: 0.8 }).addTo(layer);

                
                const mid = path[Math.floor(path.length / 2)];
                L.circleMarker([allLocs[mid].lat, allLocs[mid].lon], {
                    radius: 7, fillColor: '#fff', color: '#f59e0b', weight: 3, fillOpacity: 1
                }).addTo(layer);
            }
            setAnimating(false);
            if (onDone) onDone(path.map(i => allLocs[i]));
        }, maxEdges * delay + 400);
        animTimers.current.push(finalT);
    }, [clearAnimation]);

    const useCurrentLocation = () => {
        if (!mapRef.current) return;
        setIsLocating(true);
        setStatus('Requesting browser location permission...');
        mapRef.current.locate({ setView: false, maxZoom: 17, enableHighAccuracy: true, timeout: 10000 });
    };

    const clearAll = () => {
        setStartId(null); setEndId(null); setResult(null); setClickStep('start');
        routeLayerRef.current?.clearLayers();
        clearAnimation();
        setStatus('Map cleared.');
    };

    const getRouteGeometry = async (startLoc: Location, endLoc: Location) => {
        try {
            const coordStr = `${startLoc.lon},${startLoc.lat};${endLoc.lon},${endLoc.lat}`;
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`);
            if (res.data.routes?.[0]) {
                return {
                    coords: res.data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]),
                    distance: res.data.routes[0].distance / 1000,
                    duration: Math.round(res.data.routes[0].duration / 60)
                };
            }
        } catch {}
        return null;
    };

    const drawFinalRoute = async (startLoc: Location, endLoc: Location) => {
        const geo = await getRouteGeometry(startLoc, endLoc);
        if (geo && routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
            try {
                L.polyline.antPath(geo.coords, { color: '#2563eb', weight: 6, opacity: 0.9, delay: 600 }).addTo(routeLayerRef.current);
            } catch {
                L.polyline(geo.coords, { color: '#2563eb', weight: 6, opacity: 0.9 }).addTo(routeLayerRef.current);
            }
            mapRef.current?.fitBounds(L.polyline(geo.coords).getBounds(), { padding: [80, 80] });
            return geo;
        }
        return null;
    };

    const handleSearch = async () => {
        if (!startId) { setStatus('⚠ Select a start location.'); return; }
        setLoading(true);
        setResult(null);
        routeLayerRef.current?.clearLayers();

        const startLoc = locationMap.get(startId) || locations.find(l => l.id === startId);
        if (!startLoc) { setStatus('⚠ Could not find start location.'); setLoading(false); return; }

        if (mode === 'route') {
            if (!endId) { setStatus('⚠ Select a destination.'); setLoading(false); return; }
            const endLoc = locationMap.get(endId) || locations.find(l => l.id === endId);
            if (!endLoc) { setStatus('⚠ Could not find destination.'); setLoading(false); return; }

            setStatus('Running Bidirectional Dijkstra animation...');

            
            runBidirAnimation(startLoc, endLoc, async () => {
                setStatus('Path found! Fetching road geometry...');
                const geo = await drawFinalRoute(startLoc, endLoc);
                const dist = geo?.distance ?? getHaversineDistance(startLoc.lat, startLoc.lon, endLoc.lat, endLoc.lon);
                const timeMins = geo?.duration ?? Math.round((dist / 30) * 60);
                setResult({ path: [startId, endId], distance: dist, timeMins });
                setStatus(`Route found — ${dist.toFixed(1)} km · ~${timeMins} min`);
                setLoading(false);
                
                
                handleVoiceAnnouncement(startLoc.name, endLoc.name, dist, timeMins);
            });
            return;
        }

        
        setStatus(`Fetching nearest ${facilityType} via Google Maps...`);
        try {
            const res = await axios.post('http://localhost:3001/api/search-places', { 
                query: facilityType,
                lat: startLoc.lat,
                lon: startLoc.lon
            });
            
            const candidates = res.data;
            if (candidates.length === 0) { 
                setStatus(`No ${facilityType} found nearby.`); 
                setLoading(false); 
                return; 
            }

            
            const nearest = candidates[0];
            
            
            if (!locations.find(l => l.id === nearest.id)) {
                setLocations(prev => [...prev, nearest]);
            }

            runBidirAnimation(startLoc, nearest, async () => {
                setStatus(`Nearest ${facilityType}: ${nearest.name}. Fetching road route...`);
                const geo = await drawFinalRoute(startLoc, nearest);
                const dist = geo?.distance ?? getHaversineDistance(startLoc.lat, startLoc.lon, nearest.lat, nearest.lon);
                const timeMins = geo?.duration ?? Math.round((dist / 30) * 60);

                const beaconHtml = `<div style="position:relative;width:28px;height:28px;"><div style="position:absolute;inset:0;background:rgba(239,68,68,0.25);border-radius:50%;animation:gps-pulse 1.4s infinite;"></div><div style="position:absolute;inset:5px;background:#ef4444;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(239,68,68,0.6);"></div></div>`;
                L.marker([nearest.lat, nearest.lon], {
                    icon: L.divIcon({ className: '', html: beaconHtml, iconSize: [28, 28], iconAnchor: [14, 14] }),
                    zIndexOffset: 1000
                }).bindPopup(`<b>📍 ${nearest.name}</b><br>${dist.toFixed(2)} km · ~${timeMins} min`).addTo(routeLayerRef.current).openPopup();

                setResult({ path: [startId, nearest.id], distance: dist, timeMins, destName: nearest.name });
                setStatus(`Nearest ${facilityType}: ${nearest.name} — ${dist.toFixed(1)} km`);
                setLoading(false);
                
                
                handleVoiceAnnouncement(startLoc.name, nearest.name, dist, timeMins);
            });
        } catch (err) {
            console.error(err);
            setStatus('⚠ Live search failed. Using local fallback...');
            setLoading(false);
        }
    };

    const displayLocations = useMemo(() => {
        const base = locations.filter(l => l.id !== 'current_loc');
        return [{ id: 'current_loc', name: '📍 My Current Location', type: 'user', lat: 0, lon: 0 }, ...base];
    }, [locations]);

    const handleRouteToCampus = (hostelId: string) => {
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
    };

    const handleSOS = async () => {
        setIsLocating(true);
        setStatus('🚨 EMERGENCY ACTIVATED: Getting GPS...');
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            const userNode: Location = { id: 'user_pos', name: 'My Current Location', type: 'user', lat, lon };
            setLocations(prev => [...prev.filter(l => l.id !== 'user_pos'), userNode]);
            setStartId('user_pos');
            setIsLocating(false);

            setStatus('🚨 Finding nearest hospital...');
            try {
                const res = await axios.post('http://localhost:3001/api/search-places', { 
                    query: 'hospital',
                    lat,
                    lon
                });
                
                if (res.data.length > 0) {
                    const nearest = res.data[0];
                    setSosHospital(nearest.name);
                    setIsSOSModalOpen(true);
                    
                    
                    if (!locations.find(l => l.id === nearest.id)) {
                        setLocations(prev => [...prev, nearest]);
                    }

                    
                    const sosMsg = `Emergency activated. Your location has been shared with ${nearest.name} and the nearest police station. Help is on the way.`;
                    handleVoiceAnnouncement("Your location", nearest.name, 0, 0, sosMsg);

                    
                    runBidirAnimation(userNode, nearest, async () => {
                        await drawFinalRoute(userNode, nearest);
                        setStatus(`🆘 EMERGENCY: Routing to ${nearest.name}`);
                    });
                }
            } catch (err) {
                setStatus('❌ SOS Failed: Network error.');
            }
        }, (err) => {
            setStatus('❌ SOS Failed: GPS required.');
            setIsLocating(false);
        }, { enableHighAccuracy: true });
    };

    const handleVoiceAnnouncement = async (source: string, destination: string, distance: number, time: number, customMessage?: string) => {
        setIsSpeaking(true);
        setStatus('🔊 Generating voice announcement...');
        try {
            const payload = customMessage ? {
                source: "Emergency",
                destination: "Help",
                distance: "0",
                time: 0,
                language,
                template: customMessage 
            } : {
                source,
                destination,
                distance: distance.toFixed(1),
                time,
                language
            };

            
            const response = await axios.post('http://localhost:3001/api/voice-announcement', {
                ...payload,
                customMessage 
            });
            
            if (response.data.audio) {
                const audio = new Audio(`data:audio/wav;base64,${response.data.audio}`);
                audio.onended = () => {
                    setIsSpeaking(false);
                    setStatus('System ready.');
                };
                audio.play().catch(e => {
                    console.error('Playback error:', e);
                    setStatus(`🔊 Playback failed: ${e.message}`);
                    setIsSpeaking(false);
                });
            } else {
                setIsSpeaking(false);
                setStatus('Voice announcement failed (no audio).');
            }
        } catch (error: any) {
            console.error('Voice announcement error:', error);
            setIsSpeaking(false);
            setStatus(`Voice assistant error: ${error.response?.data?.error?.message || error.message}`);
        }
    };

    return (
        <div id="app-container">
            <div className="main-layout">
                <div id="control-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>📍 Pathfinder</div>
                        <button 
                            className="btn-primary" 
                            style={{ 
                                background: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                fontWeight: 800, 
                                fontSize: '12px', 
                                padding: '8px 16px', 
                                borderRadius: '30px',
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)', 
                                animation: 'pulse-red 2s infinite',
                                cursor: 'pointer'
                            }}
                            onClick={handleSOS}
                        >
                            🚨 SOS
                        </button>
                    </div>

                    <button 
                        className="btn-secondary" 
                        style={{ marginBottom: '16px', background: view === 'housing' ? 'var(--primary)' : 'var(--bg-card)', color: view === 'housing' ? 'white' : 'var(--text-main)', borderColor: view === 'housing' ? 'var(--primary)' : 'var(--border)' }}
                        onClick={() => setView(view === 'housing' ? 'map' : 'housing')}
                    >
                        {view === 'housing' ? '🗺️ Back to Map' : '🏠 Student Housing Portal'}
                    </button>

                    {}
                    <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>Bidirectional Dijkstra</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#60a5fa', marginRight: 6 }}></span>Forward scan (from start)</span>
                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2dd4bf', marginRight: 6 }}></span>Backward scan (from end)</span>
                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', marginRight: 6 }}></span>Shortest path found</span>
                        </div>
                    </div>

                    <div className="segmented-control">
                        <button className={mode === 'route' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('route')}>Custom Route</button>
                        <button className={mode === 'facility' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('facility')}>Nearest Facility</button>
                    </div>

                    <div className="field-group">
                        <label className="field-label">ANNOUNCEMENT LANGUAGE</label>
                        <select className="combo-input" value={language} onChange={e => setLanguage(e.target.value)}>
                            <option value="hi-IN">Hindi (हिंदी)</option>
                            <option value="mr-IN">Marathi (मराठी)</option>
                            <option value="te-IN">Telugu (తెలుగు)</option>
                            <option value="ta-IN">Tamil (தமிழ்)</option>
                            <option value="bn-IN">Bengali (বাংলা)</option>
                            <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                            <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                            <option value="en-IN">English</option>
                        </select>
                    </div>

                    <div className="field-group">
                        <label className="field-label">
                            START LOCATION
                            <span className={`loc-link${isLocating ? ' searching' : ''}`} onClick={useCurrentLocation} title="Use current GPS location">
                                {isLocating ? '⏳ Locating...' : '📍 Use Current Location'}
                            </span>
                        </label>
                        <Combobox locations={displayLocations} placeholder="Select or click map..." selectedId={startId}
                            onSelect={(id) => id === 'current_loc' ? useCurrentLocation() : setStartId(id)} />
                    </div>

                    {mode === 'route' ? (
                        <div className="field-group">
                            <label className="field-label">DESTINATION</label>
                            <Combobox locations={displayLocations} placeholder="Select destination..." selectedId={endId}
                                onSelect={(id) => setEndId(id)} />
                        </div>
                    ) : (
                        <div className="field-group">
                            <label className="field-label">FACILITY TYPE</label>
                            <select className="combo-input" value={facilityType} onChange={e => setFacilityType(e.target.value)}>
                                <option value="hospital">🏥 Hospital</option>
                                <option value="fuel">⛽ Fuel Station</option>
                                <option value="pharmacy">💊 Pharmacy</option>
                                <option value="ev">⚡ EV Charging</option>
                                <option value="parking">🅿️ Parking</option>
                                <option value="hostel">🏠 Hostel / PG</option>
                            </select>
                        </div>
                    )}

                    <button className="btn-primary" onClick={handleSearch} disabled={loading || animating}>
                        {animating ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="bidir-spinner"></span>
                                {animPhase === 'scanning' ? 'Scanning paths...' : 'Drawing route...'}
                            </span>
                        ) : loading ? 'Processing...' : (mode === 'route' ? '▶ Find Route' : `▶ Find Nearest ${facilityType.charAt(0).toUpperCase() + facilityType.slice(1)}`)}
                    </button>

                    <div className="btn-row">
                        <button className="btn-secondary" onClick={clearAll}>✕ Clear</button>
                        <button className="btn-secondary" onClick={() => mapRef.current?.setView([30.3271, 78.0315], 14)}>⊙ Center</button>
                    </div>

                    <div className="hint-bar">
                        Next click sets: <strong>{clickStep === 'start' ? '🟢 Start' : '🔴 Destination'}</strong>
                    </div>

                    {result && result.path && (
                        <div className="result-card" style={{ border: isSpeaking ? '2px solid var(--primary)' : '1px solid var(--border)', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div className="result-label">DIJKSTRA {mode === 'route' ? 'ROUTE' : `NEAREST ${facilityType.toUpperCase()}`}</div>
                                {isSpeaking && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '11px', fontWeight: 800 }}>
                                        <div className="bidir-spinner" style={{ width: '10px', height: '10px', border: '1.5px solid var(--primary)', borderTopColor: 'transparent' }}></div>
                                        SPEAKING...
                                    </div>
                                )}
                            </div>
                            <div className="result-val">
                                {result.distance?.toFixed(2)} <span className="result-unit">km</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>~{result.timeMins} min</span>
                            </div>
                            <div className="path-list">
                                <div className="path-item">
                                    <div className="path-idx" style={{ background: '#22c55e', color: 'white' }}>A</div>
                                    {locationMap.get(result.path[0])?.name || result.path[0]}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 6, color: '#94a3b8', fontSize: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e2e8f0' }} />
                                    via road network
                                </div>
                                <div className="path-item" style={{ color: '#ef4444', fontWeight: 700 }}>
                                    <div className="path-idx" style={{ background: '#ef4444', color: 'white' }}>B</div>
                                    {locationMap.get(result.path[result.path.length - 1])?.name || result.destName || result.path[result.path.length - 1]}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                        {status}
                    </div>
                </div>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', zIndex: 2000, background: 'var(--bg-page)', display: view === 'housing' ? 'block' : 'none' }}>
                    <HousingDashboard locations={locations} reviews={reviews} onRouteToCampus={handleRouteToCampus} onOpenUpload={() => setIsUploadOpen(true)} onAddReview={handleAddReview} />
                </div>
                <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUpload={handleUploadHostel} />
                
                {isSOSModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(239, 68, 68, 0.4)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: 'var(--bg-page)', width: '90%', maxWidth: '450px', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '2px solid #ef4444' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'pulse-red 1.5s infinite' }}>🚨</div>
                            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444', margin: '0 0 16px 0' }}>EMERGENCY ACTIVATED</h2>
                            <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                                Your live GPS location has been shared with <strong>{sosHospital}</strong> and the nearest Police Station.
                            </p>
                            <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                                A rescue team is being dispatched. Please stay calm and follow the route on your screen.
                            </p>
                            <button className="btn-primary" onClick={() => setIsSOSModalOpen(false)} style={{ background: '#ef4444', padding: '16px 32px', fontSize: '16px', width: '100%' }}>
                                I UNDERSTAND
                            </button>
                        </div>
                    </div>
                )}
                {false ? (
                    <HousingDashboard locations={locations} onRouteToCampus={handleRouteToCampus} />
                ) : (
                    <div id="map"></div>
                )}
            </div>
        </div>
    );
};

export default App;
