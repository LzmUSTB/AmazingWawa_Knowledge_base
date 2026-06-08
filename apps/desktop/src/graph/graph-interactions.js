import { graphEdges } from "./mock-graph-data.js";

export function getConnectedNodeIds(nodeId, edges = graphEdges) {
  const connected = new Set([nodeId]);
  edges.forEach((edge) => {
    if (edge.source === nodeId) connected.add(edge.target);
    if (edge.target === nodeId) connected.add(edge.source);
  });
  return connected;
}

export function isConnectedEdge(edge, nodeId) {
  return edge.source === nodeId || edge.target === nodeId;
}
