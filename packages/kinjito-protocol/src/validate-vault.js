import {
  isAllowedKnowledgeStatus,
  isAllowedKnowledgeType,
  isAllowedRelationType,
} from "./schema.js";
import { validateLayout } from "./validate-layout.js";

function pushIssue(target, message, filePath = "") {
  target.push(filePath ? `${filePath}: ${message}` : message);
}

export function validateVault(normalizedVault) {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set();
  const edgeIds = new Set();
  const edgeKeys = new Set();
  const comparesKeys = new Set();
  const domainIds = new Set(normalizedVault.domains.map((domain) => domain.id));

  if (!normalizedVault.vault.schemaVersion) {
    pushIssue(errors, "vault.yaml is missing schemaVersion");
  }

  normalizedVault.nodes.forEach((node) => {
    if (!node.id) pushIssue(errors, "node is missing id", node.filePath);
    if (nodeIds.has(node.id)) pushIssue(errors, `duplicate node id "${node.id}"`, node.filePath);
    nodeIds.add(node.id);

    if (!domainIds.has(node.domain)) {
      pushIssue(errors, `node "${node.id}" references unknown domain "${node.domain}"`, node.filePath);
    }
    if (!isAllowedKnowledgeType(node.type)) {
      pushIssue(errors, `node "${node.id}" has invalid type "${node.type}"`, node.filePath);
    }
    if (!isAllowedKnowledgeStatus(node.status)) {
      pushIssue(errors, `node "${node.id}" has invalid status "${node.status}"`, node.filePath);
    }
  });

  normalizedVault.edges.forEach((edge) => {
    if (!edge.id) pushIssue(errors, "edge is missing id");
    if (edgeIds.has(edge.id)) pushIssue(errors, `duplicate edge id "${edge.id}"`);
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) pushIssue(errors, `edge "${edge.id}" references unknown source "${edge.source}"`);
    if (!nodeIds.has(edge.target)) pushIssue(errors, `edge "${edge.id}" references unknown target "${edge.target}"`);
    if (!isAllowedRelationType(edge.relation)) {
      pushIssue(errors, `edge "${edge.id}" has invalid relation "${edge.relation}"`);
    }

    const edgeKey = `${edge.source}->${edge.target}:${edge.relation}`;
    if (edgeKeys.has(edgeKey)) pushIssue(errors, `duplicate edge ${edgeKey}`);
    edgeKeys.add(edgeKey);

    if (edge.relation === "compares-with") {
      const comparesKey = [edge.source, edge.target].sort().join("<->");
      if (comparesKeys.has(comparesKey)) {
        pushIssue(errors, `duplicate compares-with edge in both directions: ${comparesKey}`);
      }
      comparesKeys.add(comparesKey);
    }
  });

  normalizedVault.nodes
    .filter((node) => node.type !== "domain")
    .forEach((node) => {
      if (!normalizedVault.notes[node.id]) {
        pushIssue(warnings, `node "${node.id}" has no note.md`, node.filePath);
      }
    });

  warnings.push(...validateLayout(normalizedVault));

  return { errors, warnings };
}
