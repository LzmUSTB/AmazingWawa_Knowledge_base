import { buildGraphScopes } from "../../../../packages/knowledge-core/src/index.js";
import {
  domains as mockDomains,
  graphEdges as mockEdges,
  graphNodes as mockNodes,
  noteSections,
} from "./mock-graph-data.js";

function buildMockNotes() {
  const body = noteSections.map((section) => `## ${section.label}\n\n${section.body}`).join("\n\n");
  return Object.fromEntries(
    mockNodes
      .filter((node) => node.type !== "domain")
      .map((node) => [node.id, { id: node.id, markdown: `# ${node.title}\n\n${body}` }]),
  );
}

function buildMockFileTree() {
  return mockDomains.map((domain) => ({
    id: domain.id,
    title: domain.title,
    path: `vault/content/${domain.id}`,
    type: "domain",
    color: domain.color,
    children: mockNodes
      .filter((node) => node.type !== "domain" && node.domain === domain.id)
      .map((node) => ({
        id: node.id,
        title: node.title,
        path: `vault/content/${node.domain}/${node.id}`,
        type: node.type,
        status: node.status,
      })),
  }));
}

export function createMockVault() {
  const edges = mockEdges.map((edge) => ({
    ...edge,
    from: edge.source,
    to: edge.target,
  }));
  const scopes = buildGraphScopes({ domains: mockDomains, nodes: mockNodes, edges });

  return {
    vault: {
      schemaVersion: 1,
      title: "Mock Knowledge Vault",
      description: "Fallback demo data.",
      language: "en",
      defaultDomain: "graphics",
    },
    domains: mockDomains,
    nodes: mockNodes,
    edges,
    layouts: { boards: {} },
    notes: buildMockNotes(),
    fileTree: buildMockFileTree(),
    scopes,
    validation: { errors: [], warnings: [] },
  };
}

let activeVault = createMockVault();

export function setActiveVault(vault) {
  activeVault = vault || createMockVault();
}

export function getActiveVault() {
  return activeVault;
}

export function getGraphNodes() {
  return getActiveVault().nodes;
}

export function getGraphEdges() {
  return getActiveVault().edges;
}

export function getDomains() {
  return getActiveVault().domains;
}

export function findGraphNode(nodeId) {
  return getGraphNodes().find((node) => node.id === nodeId);
}
