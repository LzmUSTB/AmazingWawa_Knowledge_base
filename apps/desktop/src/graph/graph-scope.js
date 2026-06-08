import { conceptNodes, domainNodes, graphEdges, graphNodes } from "./mock-graph-data.js";

const rootNodeIds = [
  "graphics",
  "linear-algebra",
  "machine-learning",
  "web-dev",
  "game-dev",
  "career",
  "language",
  "simulation",
];

const graphicsNodeIds = [
  "graphics",
  "rendering-pipeline",
  "shader",
  "pbr",
  "rasterization",
  "post-process",
  "material-system",
];

const focusNodeIds = ["graphics", "rendering-pipeline", "shader", "pbr", "rasterization"];

const rootEdgeIds = ["root-graphics-ml", "root-graphics-simulation", "root-web-career"];
const graphicsEdgeIds = [
  "graphics-rendering-pipeline",
  "graphics-shader",
  "graphics-pbr",
  "graphics-rasterization",
  "graphics-post-process",
  "graphics-material-system",
];
const focusEdgeIds = ["graphics-rendering-pipeline", "e1", "e2", "e3"];

function pickNodes(ids) {
  return ids.map((id) => graphNodes.find((node) => node.id === id)).filter(Boolean);
}

function pickEdges(ids) {
  return ids.map((id) => graphEdges.find((edge) => edge.id === id)).filter(Boolean);
}

export const graphScopes = {
  root: {
    id: "root",
    type: "root",
    breadcrumb: ["Global Graph"],
    selectedNodeId: "graphics",
    nodes: pickNodes(rootNodeIds),
    edges: pickEdges(rootEdgeIds),
  },
  graphics: {
    id: "graphics",
    type: "domain",
    breadcrumb: ["Global Graph", "Graphics"],
    centerNodeId: "graphics",
    selectedNodeId: "graphics",
    nodes: pickNodes(graphicsNodeIds),
    edges: pickEdges(graphicsEdgeIds),
  },
  "rendering-pipeline": {
    id: "rendering-pipeline",
    type: "focus",
    breadcrumb: ["Global Graph", "Graphics", "Rendering Pipeline"],
    centerNodeId: "rendering-pipeline",
    selectedNodeId: "rendering-pipeline",
    nodes: pickNodes(focusNodeIds),
    edges: pickEdges(focusEdgeIds),
  },
};

export function getGraphScope(scopeId) {
  return graphScopes[scopeId] || graphScopes.root;
}

export function scopeForDomain(domainId) {
  return graphScopes[domainId] ? domainId : "root";
}

export function scopeForNode(nodeId) {
  const node = conceptNodes.find((item) => item.id === nodeId);
  return node?.domain && graphScopes[node.domain] ? node.domain : "root";
}

export function isDomainNode(nodeId) {
  return domainNodes.some((node) => node.id === nodeId);
}
