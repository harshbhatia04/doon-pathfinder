const fs = require('fs');
let data = fs.readFileSync('src/App.tsx', 'utf8');

const header = `import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
`;

fs.writeFileSync('src/App.tsx', header + data);
console.log('Restored');
