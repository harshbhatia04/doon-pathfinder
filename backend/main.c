#include "graph_data.h"

int main(int argc, char* argv[]) {
    // Expected args: ./dijkstra.exe <mode> <start_id> <end_id_or_type>
    if (argc < 4) {
        printf("{\"error\": \"Incorrect arguments provided to backend engine\"}\n");
        return 1;
    }

    char* mode = argv[1];
    char* startId = argv[2];
    char* target = argv[3];

    Graph* g = createGraph();
    loadDehradunData(g);
    audit_graph(g);

    if (strcmp(mode, "path") == 0) {
        findShortestPath(g, startId, target);
    } else if (strcmp(mode, "facility") == 0) {
        findNearestFacility(g, startId, target);
    } else {
        printf("{\"error\": \"Unknown mode requested: %s\"}\n", mode);
    }

    // Clean up would go here in a production app, but for this CLI tool 
    // we let the OS reclaim memory on exit for maximum speed.
    return 0;
}

