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
    price?: string;
    conditions?: string[];
    amenities?: string[];
    gender?: 'boys' | 'girls' | 'coed';
    phone?: string;
    photo?: string | string[];
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

// ── Bidirectional Dijkstra on the location graph ──────────────────────────
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

// ── Theme Toggle ─────────────────────────────────────────────────────────
const ThemeToggle: React.FC<{ theme: string; toggle: () => void }> = ({ theme, toggle }) => (
    <button onClick={toggle} className="btn-secondary"
        style={{ width: '40px', height: '40px', borderRadius: '10px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
        {theme === 'light' ? '🌙' : '☀️'}
    </button>
);

// ── Combobox ──────────────────────────────────────────────────────────────
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

// ── Housing Dashboard ─────────────────────────────────────────────────────
const HousingDashboard: React.FC<{
    locations: Location[];
    onRouteToCampus: (hostelId: string) => void;
}> = ({ locations, onRouteToCampus }) => {
    const hostels = locations.filter(l => l.type === 'hostel');
    return (
        <div style={{ padding: '40px', overflowY: 'auto', width: '100%', background: 'var(--bg-page)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🏠 Student Housing Portal</h1>
                <button className="btn-secondary" onClick={() => onRouteToCampus('')} style={{ fontSize: '14px', padding: '8px 16px', background: 'var(--bg-card)' }}>
                    ✕ Close Portal
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>Exclusive, verified student accommodations in Dehradun.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {hostels.map(h => (
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{h.name}</h3>
                                <span style={{ background: h.gender === 'girls' ? '#fbcfe8' : h.gender === 'boys' ? '#bfdbfe' : 'var(--input-bg)', color: h.gender === 'girls' ? '#be185d' : h.gender === 'boys' ? '#1d4ed8' : 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {h.gender || 'coed'}
                                </span>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px' }}>
                                {h.price || 'Price on Request'}
                            </div>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Amenities</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {h.amenities?.map(a => <span key={a} style={{ background: 'var(--input-bg)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>✓ {a}</span>)}
                                </div>
                            </div>

                                                        <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Conditions</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {h.conditions?.map(c => <span key={c} style={{ border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>{c}</span>)}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onRouteToCampus(h.id)}>
                                    📍 Route
                                </button>
                                {h.phone && (
                                    <a href={`tel:${h.phone.replace(/\s+/g, '')}`} className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
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
};

// ── Main App ──────────────────────────────────────────────────────────────
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
    // const [facilityResults, setFacilityResults] = useState<any[]>([]);
    const [animating, setAnimating] = useState(false);
    const [animPhase, setAnimPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
    const [view, setView] = useState<'map' | 'housing'>('map');
    const [language, setLanguage] = useState('en-IN');
    const [isSpeaking, setIsSpeaking] = useState(false);

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

    // ── Init Leaflet ────────────────────────────────────────────────────
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

    // ── Markers ──────────────────────────────────────────────────────────
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

    // ── BIDIRECTIONAL DIJKSTRA ANIMATION ─────────────────────────────────
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

        // Find nearest graph nodes to start/end
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

        const delay = 60; // ms per edge
        const maxEdges = Math.max(edgesF.length, edgesB.length);

        // Animate edges batch by batch
        for (let i = 0; i < maxEdges; i++) {
            const t = setTimeout(() => {
                if (i < edgesF.length) {
                    const [a, b] = edgesF[i];
                    const la = allLocs[a], lb = allLocs[b];
                    L.polyline([[la.lat, la.lon], [lb.lat, lb.lon]], {
                        color: '#1d4ed8', weight: 2.5, opacity: 0.7
                    }).addTo(layer);
                    // Glowing node dot
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

        // After scan — draw final path
        const finalT = setTimeout(() => {
            setAnimPhase('done');
            if (path.length > 1) {
                const pathCoords = path.map(i => [allLocs[i].lat, allLocs[i].lon]);
                // Glowing gold path
                L.polyline(pathCoords, { color: '#f59e0b', weight: 6, opacity: 0.95 }).addTo(layer);
                L.polyline(pathCoords, { color: '#fde68a', weight: 2, opacity: 0.8 }).addTo(layer);

                // Pulse at meeting point
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

            // Run the visual animation first
            runBidirAnimation(startLoc, endLoc, async () => {
                setStatus('Path found! Fetching road geometry...');
                const geo = await drawFinalRoute(startLoc, endLoc);
                const dist = geo?.distance ?? getHaversineDistance(startLoc.lat, startLoc.lon, endLoc.lat, endLoc.lon);
                const timeMins = geo?.duration ?? Math.round((dist / 30) * 60);
                setResult({ path: [startId, endId], distance: dist, timeMins });
                setStatus(`Route found — ${dist.toFixed(1)} km · ~${timeMins} min`);
                setLoading(false);
                
                // Trigger voice announcement
                handleVoiceAnnouncement(startLoc.name, endLoc.name, dist, timeMins);
            });
            return;
        }

        // FACILITY MODE (LIVE SEARCH VIA GOOGLE MAPS)
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

            // The first result from Google Maps is usually the most relevant/nearest
            const nearest = candidates[0];
            
            // Add the found location to our state if it's new
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
                
                // Trigger voice announcement
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

    const handleVoiceAnnouncement = async (source: string, destination: string, distance: number, time: number) => {
        setIsSpeaking(true);
        setStatus('🔊 Generating voice announcement...');
        try {
            const response = await axios.post('http://localhost:3001/api/voice-announcement', {
                source,
                destination,
                distance: distance.toFixed(1),
                time,
                language
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Pathfinder</h1>
                        <ThemeToggle theme={theme} toggle={toggleTheme} />
                    </div>

                    <button 
                        className="btn-secondary" 
                        style={{ marginBottom: '16px', background: view === 'housing' ? 'var(--primary)' : 'var(--bg-card)', color: view === 'housing' ? 'white' : 'var(--text-main)', borderColor: view === 'housing' ? 'var(--primary)' : 'var(--border)' }}
                        onClick={() => setView(view === 'housing' ? 'map' : 'housing')}
                    >
                        {view === 'housing' ? '🗺️ Back to Map' : '🏠 Student Housing Portal'}
                    </button>

                    {/* Bidir legend */}
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
                    <HousingDashboard locations={locations} onRouteToCampus={handleRouteToCampus} />
                </div>
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
