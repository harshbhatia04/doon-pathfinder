#ifndef GRAPH_DATA_H
#define GRAPH_DATA_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <float.h>

#define MAX_NODES 500
#define MAX_NAME_LEN 60
#define MAX_ID_LEN 30

typedef struct {
    char id[MAX_ID_LEN];
    char name[MAX_NAME_LEN];
    double lat;
    double lon;
    char type[MAX_ID_LEN];
} Node;

typedef struct AdjNode {
    int destIdx;
    double weight;
    struct AdjNode* next;
} AdjNode;

typedef struct {
    Node nodes[MAX_NODES];
    AdjNode* adj[MAX_NODES];
    int numNodes;
} Graph;


double get_distance(double lat1, double lon1, double lat2, double lon2);
int get_node_index(Graph* g, const char* id);
void add_node(Graph* g, const char* id, const char* name, double lat, double lon, const char* type);
void add_edge(Graph* g, const char* id1, const char* id2);
void audit_graph(Graph* g);
void loadDehradunData(Graph* g);
void findShortestPath(Graph* g, char* startId, char* endId);
void findNearestFacility(Graph* g, char* startId, char* type);
Graph* createGraph();

#endif

