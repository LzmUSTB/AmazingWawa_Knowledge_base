import { findGraphNode, getGraphEdges } from "./graph-data-store.js";

const LINK_RELATIONS = new Set(["depends-on", "used-in", "compares-with"]);

export function getHierarchyForNode(nodeId) {
  const edges = getGraphEdges();
  return {
    parentEdges: edges.filter((edge) => edge.relation === "contains" && edge.target === nodeId),
    childEdges: edges.filter((edge) => edge.relation === "contains" && edge.source === nodeId),
  };
}

export function getDirectRelationsForNode(nodeId) {
  return getGraphEdges().filter(
    (edge) => LINK_RELATIONS.has(edge.relation) && (edge.source === nodeId || edge.target === nodeId),
  );
}

export function getOtherNodeId(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

export function formatRelationLabel(edge) {
  const source = findGraphNode(edge.source);
  const target = findGraphNode(edge.target);
  return `${source?.title || edge.source} ${edge.relation} ${target?.title || edge.target}`;
}

export function getNodeTitleOrId(nodeId) {
  return findGraphNode(nodeId)?.title || nodeId;
}
