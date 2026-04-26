#include "graph_data.h"

#define PI 3.14159265358979323846

// Haversine formula to get distance between two points
double get_distance(double lat1, double lon1, double lat2, double lon2) {
    double r = 6371; // Earth radius in km
    double dlat = (lat2 - lat1) * PI / 180.0;
    double dlon = (lon2 - lon1) * PI / 180.0;
    double a = sin(dlat / 2) * sin(dlat / 2) +
               cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
               sin(dlon / 2) * sin(dlon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return r * c * 1.18; // Calibration factor for road curvature
}

int get_node_index(Graph* g, const char* id) {
    for (int i = 0; i < g->numNodes; i++) {
        if (strcmp(g->nodes[i].id, id) == 0) return i;
    }
    return -1;
}

void add_node(Graph* g, const char* id, const char* name, double lat, double lon, const char* type) {
    if (get_node_index(g, id) != -1) return;
    if (g->numNodes >= MAX_NODES) return;
    int i = g->numNodes++;
    strncpy(g->nodes[i].id, id, MAX_ID_LEN);
    strncpy(g->nodes[i].name, name, MAX_NAME_LEN);
    g->nodes[i].lat = lat;
    g->nodes[i].lon = lon;
    strncpy(g->nodes[i].type, type, MAX_ID_LEN);
    g->adj[i] = NULL;
}

void add_edge(Graph* g, const char* id1, const char* id2) {
    int u = get_node_index(g, id1);
    int v = get_node_index(g, id2);
    if (u == -1 || v == -1 || u == v) return;

    // Check for existing edge
    AdjNode* check = g->adj[u];
    while (check) {
        if (check->destIdx == v) return;
        check = check->next;
    }

    double w = get_distance(g->nodes[u].lat, g->nodes[u].lon, g->nodes[v].lat, g->nodes[v].lon);

    AdjNode* newNode = (AdjNode*)malloc(sizeof(AdjNode));
    newNode->destIdx = v;
    newNode->weight = w;
    newNode->next = g->adj[u];
    g->adj[u] = newNode;

    newNode = (AdjNode*)malloc(sizeof(AdjNode));
    newNode->destIdx = u;
    newNode->weight = w;
    newNode->next = g->adj[v];
    g->adj[v] = newNode;
}

void audit_graph(Graph* g) {
    int edgeCount = 0;
    for (int i = 0; i < g->numNodes; i++) {
        AdjNode* curr = g->adj[i];
        while (curr) { edgeCount++; curr = curr->next; }
    }
    fprintf(stderr, "{\"audit\": {\"nodes\": %d, \"edges\": %d}}\n", g->numNodes, edgeCount);
}

Graph* createGraph() {
    Graph* g = (Graph*)malloc(sizeof(Graph));
    g->numNodes = 0;
    for (int i = 0; i < MAX_NODES; i++) g->adj[i] = NULL;
    return g;
}

void loadDehradunData(Graph* g) {
    g->numNodes = 0;
    
    // ── ROAD NETWORK SKELETON (Intersections & Midpoints) ────────
    // Chakrata Road Branch (West)
    add_node(g, "j_balp", "Ballupur Chowk", 30.3341, 78.0000, "center");
    add_node(g, "j_bind", "Bindal Bridge", 30.3275, 78.0280, "center");
    add_node(g, "j_kish", "Kishan Nagar", 30.3256, 78.0158, "center");
    add_node(g, "j_chak_mid", "Chakrata Rd Mid", 30.3380, 77.9750, "center");
    
    // Rajpur Road Branch (North East)
    add_node(g, "j_dill", "Dillaram Chowk", 30.3400, 78.0550, "center");
    add_node(g, "j_raj_1", "Rajpur Road Curve 1", 30.3550, 78.0650, "center");
    add_node(g, "j_raj_2", "Rajpur Road Curve 2", 30.3750, 78.0750, "center");
    
    // Saharanpur/Haridwar Hub (Central)
    add_node(g, "j_prince", "Prince Chowk", 30.3175, 78.0375, "center");
    add_node(g, "j_shc", "Saharanpur Chowk", 30.3135, 78.0325, "center");
    add_node(g, "j_clem", "Clement Town Junction", 30.2820, 78.0100, "center");
    add_node(g, "j_mah", "Majra Junction", 30.2950, 78.0100, "center");
    
    // ── LANDMARKS (POIs) - Precise Coordinates ──────────────────
    add_node(g, "geu",  "Graphic Era University", 30.2689, 77.9931, "center");
    add_node(g, "clk",  "Clock Tower", 30.3253, 78.0413, "center");
    add_node(g, "isbt", "ISBT Dehradun", 30.2892, 77.9987, "center");
    add_node(g, "bal",  "Balliwala Chowk", 30.3239, 78.0113, "center");
    add_node(g, "pac",  "Pacific Mall", 30.3665, 78.0703, "center");
    add_node(g, "itp",  "IT Park", 30.3684, 78.0858, "center");
    add_node(g, "pre",  "Prem Nagar", 30.3360, 77.9621, "center");
    add_node(g, "plt",  "Paltan Bazar", 30.3230, 78.0426, "pharmacy");
    add_node(g, "dnh",  "Doon Hospital", 30.3220, 78.0437, "hospital");
    add_node(g, "fri",  "FRI Museum", 30.3425, 77.9927, "center");
    add_node(g, "max",  "Max Hospital", 30.3853, 78.0772, "hospital");
    add_node(g, "sah",  "Sahastradhara", 30.3872, 78.1311, "center");
    add_node(g, "neh",  "Nehru Colony", 30.3058, 78.0558, "center");
    add_node(g, "ris",  "Rispana Bridge", 30.3013, 78.0574, "center");
    add_node(g, "sph",  "St. Paul Hospital", 30.3395, 77.9621, "hospital");
    add_node(g, "smih", "Indiresh Hospital", 30.3156, 78.0264, "hospital");
    add_node(g, "hpsn", "HP Pump", 30.3345, 77.9960, "fuel");
    add_node(g, "evck", "EV Station", 30.3228, 78.0366, "ev");
    add_node(g, "rly",  "Railway Station", 30.3159, 78.0351, "center");
    add_node(g, "gnp",  "Gandhi Park", 30.3284, 78.0435, "center");
    add_node(g, "srv",  "Survey Chowk", 30.3255, 78.0526, "center");
    add_node(g, "snj",  "Subhash Nagar Junc", 30.2725, 77.9995, "center");

    // ── ROAD NETWORK TOPOLOGY (Dijkstra Edges) ──────────────────
    // Road 1: Chakrata Road (West -> Center)
    add_edge(g, "pre", "j_chak_mid");
    add_edge(g, "j_chak_mid", "fri");
    add_edge(g, "fri", "hpsn");
    add_edge(g, "hpsn", "j_balp");
    add_edge(g, "j_balp", "j_kish");
    add_edge(g, "j_kish", "j_bind");
    add_edge(g, "j_bind", "clk");

    // Road 2: Rajpur Road (Center -> North East)
    add_edge(g, "clk", "gnp");
    add_edge(g, "gnp", "j_dill");
    add_edge(g, "j_dill", "j_raj_1");
    add_edge(g, "j_raj_1", "pac");
    add_edge(g, "pac", "itp");
    add_edge(g, "itp", "j_raj_2");
    add_edge(g, "j_raj_2", "max");
    add_edge(g, "j_raj_1", "sah"); // Branch to Sahastradhara

    // Road 3: Saharanpur Road (South -> Center)
    add_edge(g, "isbt", "j_mah");
    add_edge(g, "j_mah", "snj");
    add_edge(g, "snj", "j_clem");
    add_edge(g, "j_clem", "geu");
    add_edge(g, "j_clem", "sph");
    add_edge(g, "isbt", "j_shc");
    add_edge(g, "j_shc", "smih");
    add_edge(g, "j_shc", "j_prince");

    // Road 4: Haridwar Road / Central Hub
    add_edge(g, "clk", "plt");
    add_edge(g, "plt", "j_prince");
    add_edge(g, "j_prince", "rly");
    add_edge(g, "j_prince", "dnh");
    add_edge(g, "j_prince", "srv");
    add_edge(g, "srv", "ris");
    add_edge(g, "ris", "neh");
    add_edge(g, "neh", "isbt");
    
    // Cross-connects & Shortcuts
    add_edge(g, "srv", "gnp");
    add_edge(g, "bal", "j_balp");
    add_edge(g, "bal", "j_shc");
    add_edge(g, "clk", "evck");
}

void findShortestPath(Graph* g, char* startId, char* endId) {
    int startIdx = get_node_index(g, startId);
    int endIdx = get_node_index(g, endId);
    if (startIdx == -1 || endIdx == -1) return;
    double dists[MAX_NODES]; int parents[MAX_NODES];
    extern void dijkstra(Graph* g, int start, double* dists, int* parents);
    dijkstra(g, startIdx, dists, parents);
    if (dists[endIdx] == DBL_MAX) return;
    int path[MAX_NODES], pathLen = 0, curr = endIdx;
    while (curr != -1) { path[pathLen++] = curr; curr = parents[curr]; }
    printf("{\"distance\": %f, \"path\": [", dists[endIdx]);
    for (int i = pathLen - 1; i >= 0; i--) {
        printf("\"%s\"%s", g->nodes[path[i]].id, (i == 0 ? "" : ", "));
    }
    printf("]}\n");
}

void findNearestFacility(Graph* g, char* startId, char* type) {
    int startIdx = get_node_index(g, startId);
    if (startIdx == -1) return;
    
    double dists[MAX_NODES]; 
    int parents[MAX_NODES];
    extern void dijkstra(Graph* g, int start, double* dists, int* parents);
    dijkstra(g, startIdx, dists, parents);

    // Collect all candidates of matching type
    typedef struct { int idx; double d; } Cand;
    Cand candidates[MAX_NODES];
    int count = 0;

    for (int i = 0; i < g->numNodes; i++) {
        if (strcmp(g->nodes[i].type, type) == 0 && dists[i] != DBL_MAX) {
            candidates[count].idx = i;
            candidates[count].d = dists[i];
            count++;
        }
    }

    if (count == 0) {
        printf("{\"error\": \"No facilities of type '%s' found.\", \"results\": []}\n", type);
        return;
    }

    // Sort by distance
    for (int i = 0; i < count - 1; i++) {
        for (int j = 0; j < count - i - 1; j++) {
            if (candidates[j].d > candidates[j+1].d) {
                Cand temp = candidates[j];
                candidates[j] = candidates[j+1];
                candidates[j+1] = temp;
            }
        }
    }

    // Return Top 1
    int limit = (count < 1) ? count : 1;
    printf("[");
    for (int k = 0; k < limit; k++) {
        int targetIdx = candidates[k].idx;
        int path[MAX_NODES], pathLen = 0, curr = targetIdx;
        while (curr != -1) { path[pathLen++] = curr; curr = parents[curr]; }

        printf("{\"distance\": %f, \"name\": \"%s\", \"path\": [", candidates[k].d, g->nodes[targetIdx].name);
        for (int i = pathLen - 1; i >= 0; i--) {
            printf("\"%s\"%s", g->nodes[path[i]].id, (i == 0 ? "" : ", "));
        }
        printf("]}%s", (k == limit - 1 ? "" : ", "));
    }
    printf("]\n");
}
