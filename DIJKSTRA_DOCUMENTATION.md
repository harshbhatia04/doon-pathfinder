# Pathfinder: Dijkstra Implementation Documentation

This document explains how the **Shortest Path Algorithm** is implemented in this project, using real-world data from Dehradun's road network.

---

## 1. Core Concepts

### Nodes (Vertices)
In this project, a **Node** represents a specific point on the map. We have two types:
- **Junction Nodes**: Major intersections (e.g., `Saharanpur Chowk`, `Prince Chowk`). These are the decision points for the algorithm.
- **Landmark Nodes**: Points of interest (e.g., `Graphic Era`, `Clock Tower`, `ISBT`). These are usually the start or end goals.

**Current Count**: 33 active nodes.  
**Max Capacity**: 500 nodes (Defined in `graph_data.h`).

### Edges
An **Edge** is a connection between two nodes (a road segment). 
- **Directed/Undirected**: In our implementation, we add edges in both directions (bi-directional) to simulate two-way roads.
- **Weights**: Every edge has a "Weight," which is the physical distance between the two points in kilometers.

---

## 2. Technical Stack (The "Brain")

The engine is written in **C** for maximum performance, ensuring pathfinding is nearly instantaneous.

### Data Structures (`graph_data.h`)
- **`Node` Struct**: Stores ID, Name, Latitude, Longitude, and Type.
- **`Edge` Struct**: Stores the target node index and the weight (distance).
- **`Adjacency List`**: Instead of a simple matrix, we use an adjacency list. This is much more memory-efficient for sparse road networks (where most nodes only connect to 3-4 others).

---

## 3. The Dijkstra Algorithm (`dijkstra.c`)

The algorithm finds the shortest path by following these steps:

1.  **Initialize**: Set the distance to the starting node as `0` and all other nodes as `Infinity`.
2.  **Min-Priority Queue (Min-Heap)**: We use a **Min-Heap** to always pick the node with the smallest known distance. This optimizes the algorithm from $O(V^2)$ to **$O(E \log V)$**, making it extremely fast.
3.  **Relaxation**: 
    - For the current node, look at all its neighbors.
    - If `(distance to current) + (edge weight to neighbor)` is less than the `known distance to neighbor`, update the neighbor's distance.
    - Keep track of the "Parent" node to reconstruct the path later.
4.  **Repeat**: Continue until the destination node is reached or all reachable nodes are visited.

---

## 4. Road Curvature Calibration

A unique feature of this project is the **1.18x Calibration Factor** in `graph_data.c`. 
- **The Problem**: Real roads are rarely straight lines (they have curves).
- **The Solution**: We calculate the "Haversine Distance" (as the crow flies) and multiply it by **1.18** to accurately estimate the actual road distance. This aligns our results with Google Maps.

---

## 5. Frontend Integration (`App.tsx`)

- The **React frontend** sends the `StartID` and `EndID` to the NodeJS server.
- The NodeJS server executes the **C Binary (`dijkstra.exe`)**.
- The C program returns the sequence of Node IDs.
- The UI then fetches smooth road geometry using the **OSRM API** to draw the blue line on the map.

---

## Summary for your Teacher
- **Algorithm**: Dijkstra's with Min-Heap Optimization.
- **Data Structure**: Adjacency List.
- **Efficiency**: $O(E \log V)$.
- **Accuracy**: Calibrated Haversine distance for road network topology.
