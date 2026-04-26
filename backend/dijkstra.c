#include <stdio.h>
#include <stdlib.h>
#include <float.h>
#include "graph_data.h"

// min-heap structure for dijkstra
typedef struct {
    int nodeIdx;
    double dist;
} HeapNode;

typedef struct {
    HeapNode* data;
    int size;
    int capacity;
} MinHeap;

MinHeap* createHeap(int capacity) {
    MinHeap* h = (MinHeap*)malloc(sizeof(MinHeap));
    h->data = (HeapNode*)malloc(sizeof(HeapNode) * capacity);
    h->size = 0;
    h->capacity = capacity;
    return h;
}

void push(MinHeap* h, int idx, double d) {
    int i = h->size++;
    while (i > 0 && h->data[(i-1)/2].dist > d) {
        h->data[i] = h->data[(i-1)/2];
        i = (i-1)/2;
    }
    h->data[i].nodeIdx = idx;
    h->data[i].dist = d;
}

HeapNode pop(MinHeap* h) {
    HeapNode res = h->data[0];
    HeapNode last = h->data[--h->size];
    int i = 0;
    while (i*2+1 < h->size) {
        int child = i*2+1;
        if (child+1 < h->size && h->data[child+1].dist < h->data[child].dist) child++;
        if (last.dist <= h->data[child].dist) break;
        h->data[i] = h->data[child];
        i = child;
    }
    h->data[i] = last;
    return res;
}

// core dijkstra algorithm
void dijkstra(Graph* g, int start, double* dists, int* parents) {
    for (int i = 0; i < g->numNodes; i++) {
        dists[i] = DBL_MAX;
        parents[i] = -1;
    }
    dists[start] = 0;
    MinHeap* h = createHeap(g->numNodes * 2);
    push(h, start, 0);

    while (h->size > 0) {
        HeapNode top = pop(h);
        int u = top.nodeIdx;
        if (top.dist > dists[u]) continue;

        AdjNode* curr = g->adj[u];
        while (curr) {
            int v = curr->destIdx;
            if (dists[u] + curr->weight < dists[v]) {
                dists[v] = dists[u] + curr->weight;
                parents[v] = u;
                push(h, v, dists[v]);
            }
            curr = curr->next;
        }
    }
    free(h->data);
    free(h);
}
