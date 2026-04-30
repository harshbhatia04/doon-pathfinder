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

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/harshbhatia04/doon-pathfinder.git
cd doon-pathfinder
```

### 2. Install Dependencies
```bash
# Install Frontend dependencies
npm install

# Install Backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Setup (CRITICAL)
Since API keys are sensitive, they are not included in the repository. To run the app, you must:
1. Go to the `backend` folder.
2. Rename `.env.example` to `.env`.
3. Open `.env` and paste your own API keys for **SerpApi** and **Sarvam AI**.

### 4. Run the Project
```bash
# Start Backend (in /backend folder)
npm start

# Start Frontend (in root folder)
npm run dev
```
