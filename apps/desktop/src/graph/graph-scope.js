import { findGraphNode, getActiveVault } from "./graph-data-store.js";

export function getGraphScope(scopeId) {
  const scopes = getActiveVault().scopes || {};
  return scopes[scopeId] || scopes.root || {
    id: "root",
    type: "root",
    breadcrumb: ["Global Graph"],
    selectedNodeId: "",
    nodes: [],
    edges: [],
  };
}

export function hasGraphScope(scopeId) {
  return Boolean(getActiveVault().scopes?.[scopeId]);
}

export function scopeForDomain(domainId) {
  return getActiveVault().scopes?.[domainId] ? domainId : "root";
}

export function scopeForNode(nodeId) {
  const node = findGraphNode(nodeId);
  if (!node) return "root";
  if (isDomainNode(node.id)) return scopeForDomain(node.id);
  return getActiveVault().scopes?.[node.id] ? node.id : scopeForDomain(node.domain);
}

export function isDomainNode(nodeId) {
  return findGraphNode(nodeId)?.type === "domain";
}

export function getContainsChildren(nodeId) {
  return getActiveVault()
    .edges.filter((edge) => edge.relation === "contains" && edge.source === nodeId)
    .map((edge) => edge.target);
}

export function hasContainsChildren(nodeId) {
  return getContainsChildren(nodeId).length > 0;
}
