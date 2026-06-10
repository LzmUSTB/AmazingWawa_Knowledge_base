import { buildFileTree } from "./build-file-tree.js";
import { buildGraphScopes } from "./build-graph-scopes.js";
import { buildNoteIndex, idFromContentPath } from "./build-note-index.js";
import { getBlockRegistry, normalizeBlockTypes } from "./block-registry.js";
import { parseYaml, parseYamlFiles } from "./parse-yaml.js";
import { DEFAULT_BOARD_SIZE } from "./schema.js";
import { validateVault } from "./validate-vault.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDomain(domain = {}) {
  return {
    id: domain.id,
    title: domain.title || domain.id,
    description: domain.description || "",
    color: domain.color || "#EDEDED",
    order: domain.order ?? 999,
  };
}

function normalizeDomainNode(domain) {
  return {
    id: domain.id,
    title: domain.title,
    domain: domain.id,
    type: "domain",
    status: "domain",
    summary: domain.description || `${domain.title} domain graph.`,
    color: domain.color,
  };
}

function normalizeConceptNode(meta = {}, filePath = "") {
  const id = meta.id || idFromContentPath(filePath);

  return {
    ...meta,
    id,
    title: meta.title || id,
    domain: meta.domain || "",
    type: meta.type || "concept",
    status: meta.status || "seed",
    summary: meta.summary || "",
    filePath,
  };
}

function normalizeEdge(edge = {}) {
  const source = edge.source || edge.from;
  const target = edge.target || edge.to;

  return {
    ...edge,
    id: edge.id || `${source}-${edge.relation}-${target}`,
    from: source,
    to: target,
    source,
    target,
    relation: edge.relation,
  };
}

function normalizeLayoutBox(box = {}) {
  return {
    x: box.x ?? 0,
    y: box.y ?? 0,
    width: box.width ?? box.w ?? 180,
    height: box.height ?? box.h ?? 80,
  };
}

function normalizeBoard(board = {}, source = "manual") {
  const nodes = Object.fromEntries(
    Object.entries(board.nodes || {}).map(([id, box]) => [id, normalizeLayoutBox(box)]),
  );
  const routes = Object.fromEntries(
    Object.entries(board.routes || {}).map(([id, route]) => [
      id,
      {
        ...route,
        edge: route.edge || id,
        points: asArray(route.points),
      },
    ]),
  );

  return {
    width: board.width || DEFAULT_BOARD_SIZE.width,
    height: board.height || DEFAULT_BOARD_SIZE.height,
    grid: board.grid || DEFAULT_BOARD_SIZE.grid,
    source: board.source || source,
    nodes,
    routes,
  };
}

function buildFallbackBox(index, count, board) {
  const centerX = board.width / 2;
  const centerY = board.height / 2;
  if (index === 0) return { x: centerX - 110, y: centerY - 50, width: 220, height: 100 };

  const ring = Math.max(280, Math.min(board.width, board.height) * 0.28);
  const angle = ((index - 1) / Math.max(1, count - 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.round(centerX + Math.cos(angle) * ring - 95),
    y: Math.round(centerY + Math.sin(angle) * ring - 40),
    width: 190,
    height: 80,
  };
}

function ensureScopeBoards(layouts, scopes) {
  const boards = { ...layouts.boards };

  Object.values(scopes).forEach((scope) => {
    const hasManualBoard = Boolean(boards[scope.id]);
    const board = boards[scope.id] || { ...DEFAULT_BOARD_SIZE, nodes: {}, routes: {} };
    const nextBoard = normalizeBoard(board, hasManualBoard ? "manual" : "generated");

    scope.nodes.forEach((node, index) => {
      if (!nextBoard.nodes[node.id]) {
        nextBoard.nodes[node.id] = buildFallbackBox(index, scope.nodes.length, nextBoard);
      }
    });

    nextBoard.missingRouteEdgeIds = scope.edges
      .filter((edge) => !nextBoard.routes[edge.id])
      .map((edge) => edge.id);

    boards[scope.id] = nextBoard;
  });

  return { boards };
}

function normalizeLayouts(layoutYaml = {}) {
  const boards = layoutYaml.boards || {};

  return {
    boards: Object.fromEntries(
      Object.entries(boards).map(([scopeId, board]) => [scopeId, normalizeBoard(board, "manual")]),
    ),
  };
}

export function normalizeVault(rawFiles = {}) {
  const vault = parseYaml(rawFiles.vaultYaml, "vault/vault.yaml");
  const domainsYaml = parseYaml(rawFiles.domainsYaml, "vault/domains.yaml");
  const graphYaml = parseYaml(rawFiles.graphYaml, "vault/graph.yaml");
  const graphLayoutYaml = parseYaml(rawFiles.graphLayoutYaml, "vault/graph-layout.yaml");
  const metaYamlFiles = parseYamlFiles(rawFiles.metaFiles || {});
  const blockTypeResult = normalizeBlockTypes(rawFiles.blockTypeFiles || {});

  const domains = asArray(domainsYaml.domains).map(normalizeDomain);
  const domainNodes = domains.map(normalizeDomainNode);
  const conceptNodes = Object.entries(metaYamlFiles)
    .map(([filePath, meta]) => normalizeConceptNode(meta, filePath))
    .filter((node) => node.id);
  const nodes = [...domainNodes, ...conceptNodes];
  const edges = asArray(graphYaml.edges).map(normalizeEdge);
  const notes = buildNoteIndex(rawFiles.noteFiles || {});
  const scopes = buildGraphScopes({ domains, nodes, edges });
  const layouts = ensureScopeBoards(normalizeLayouts(graphLayoutYaml), scopes);
  const fileTree = buildFileTree(domains, nodes);

  const normalizedVault = {
    vault: {
      schemaVersion: vault.schemaVersion,
      title: vault.title || "Knowledge Vault",
      description: vault.description || "",
      language: vault.language || "zh-CN",
      defaultDomain: vault.defaultDomain || domains[0]?.id || "",
    },
    domains,
    nodes,
    edges,
    rawGraphYaml: rawFiles.graphYaml || "",
    layouts,
    notes,
    blockTypes: blockTypeResult.definitions,
    blockTypeErrors: blockTypeResult.errors,
    blockTypeWarnings: blockTypeResult.warnings,
    fileTree,
    scopes,
  };

  return {
    ...normalizedVault,
    blockRegistry: getBlockRegistry(normalizedVault),
    validation: validateVault(normalizedVault),
  };
}
