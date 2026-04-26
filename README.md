# Smart Facility Finder (DAA Project)

This project is a **Smart Vehicle Service & Facility Finder** for Dehradun city. It uses a custom-implemented Dijkstra’s algorithm in C to find the shortest path and nearest facilities (Hospitals, Fuel Stations, EV Chargers, etc.) from a given starting point.

## Project Structure
- **/src**: Contains the React + TypeScript frontend (Leaflet.js for mapping).
- **/backend**: Contains the Dijkstra implementation in C and a Node.js API server.

## Features
- Manually implemented Dijkstra's Algorithm and Min-Heap in C.
- Real-world Dehradun landmark data.
- Facility-finding logic (nearest neighbor search using graph algorithms).
- Web-based interactive map for visualization.

## How to Run
1. **Backend**: 
   - Compile the C code in `backend/` using `gcc`.
   - Start the Node server: `node server.js`
2. **Frontend**:
   - Run `npm run dev` in the root folder.
   - Open `http://localhost:5173`.
