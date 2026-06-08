import { getGraphEdges } from "./graph-data-store.js";

export function getConnectedNodeIds(nodeId, edges = getGraphEdges()) {
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
