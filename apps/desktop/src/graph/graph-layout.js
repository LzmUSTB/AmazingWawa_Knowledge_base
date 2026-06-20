import { getActiveVault } from "./graph-data-store.js";
import { generateOrthogonalRoute } from "./graph-route-generator.js";

export const graphBoardSize = {
  desktop: { width: 2400, height: 1600 },
  mobile: { width: 900, height: 1200 },
};

export const graphCanvasSize = graphBoardSize;

const desktopOffset = { x: 610, y: 410 };
const mobileOffset = { x: 255, y: 326 };

function offsetLayout(layout, offset) {
  return Object.fromEntries(
    Object.entries(layout).map(([id, box]) => [
      id,
      { ...box, x: box.x + offset.x, y: box.y + offset.y },
    ]),
  );
}

function offsetRoutes(routes, offset) {
  return Object.fromEntries(
    Object.entries(routes).map(([id, points]) => [
      id,
      points.map(([x, y]) => [x + offset.x, y + offset.y]),
    ]),
  );
}

const rootNodeLayout = {
  graphics: { x: 132, y: 120, width: 156, height: 92 },
  "linear-algebra": { x: 404, y: 120, width: 168, height: 92 },
  "machine-learning": { x: 688, y: 120, width: 184, height: 92 },
  "web-dev": { x: 916, y: 292, width: 150, height: 86 },
  "game-dev": { x: 688, y: 520, width: 156, height: 86 },
  career: { x: 404, y: 520, width: 150, height: 86 },
  language: { x: 132, y: 520, width: 150, height: 86 },
  simulation: { x: 132, y: 292, width: 156, height: 86 },
};

const graphicsNodeLayout = {
  graphics: { x: 500, y: 322, width: 180, height: 104 },
  "rendering-pipeline": { x: 140, y: 122, width: 190, height: 78 },
  shader: { x: 140, y: 322, width: 146, height: 66 },
  pbr: { x: 170, y: 548, width: 126, height: 62 },
  rasterization: { x: 850, y: 122, width: 168, height: 78 },
  "post-process": { x: 880, y: 322, width: 154, height: 66 },
  "material-system": { x: 840, y: 548, width: 178, height: 62 },
};

const focusNodeLayout = {
  "rendering-pipeline": { x: 500, y: 322, width: 190, height: 92 },
  graphics: { x: 146, y: 322, width: 162, height: 78 },
  shader: { x: 502, y: 122, width: 146, height: 66 },
  pbr: { x: 300, y: 546, width: 126, height: 62 },
  rasterization: { x: 836, y: 546, width: 168, height: 62 },
};

const mobileNodeLayout = {
  "rendering-pipeline": { x: 112, y: 230, width: 150, height: 72 },
  graphics: { x: 116, y: 82, width: 142, height: 62 },
  shader: { x: 30, y: 368, width: 118, height: 58 },
  pbr: { x: 224, y: 368, width: 104, height: 58 },
  rasterization: { x: 224, y: 94, width: 126, height: 58 },
};

const scopeLayouts = {
  root: offsetLayout(rootNodeLayout, desktopOffset),
  graphics: offsetLayout(graphicsNodeLayout, desktopOffset),
  "rendering-pipeline": offsetLayout(focusNodeLayout, desktopOffset),
};

const traceRoutes = {
  root: offsetRoutes({
    "root-graphics-ml": [
      [288, 166],
      [392, 166],
      [392, 166],
      [688, 166],
    ],
    "root-graphics-simulation": [
      [210, 212],
      [210, 252],
      [210, 252],
      [210, 292],
    ],
    "root-web-career": [
      [916, 335],
      [640, 335],
      [640, 563],
      [554, 563],
    ],
  }, desktopOffset),
  graphics: offsetRoutes({
    "graphics-rendering-pipeline": [
      [500, 348],
      [416, 348],
      [416, 161],
      [330, 161],
    ],
    "graphics-shader": [
      [500, 374],
      [392, 374],
      [392, 355],
      [286, 355],
    ],
    "graphics-pbr": [
      [545, 426],
      [545, 579],
      [296, 579],
    ],
    "graphics-rasterization": [
      [680, 348],
      [760, 348],
      [760, 161],
      [850, 161],
    ],
    "graphics-post-process": [
      [680, 374],
      [780, 374],
      [780, 355],
      [880, 355],
    ],
    "graphics-material-system": [
      [635, 426],
      [635, 579],
      [840, 579],
    ],
  }, desktopOffset),
  "rendering-pipeline": offsetRoutes({
    "graphics-rendering-pipeline": [
      [308, 361],
      [404, 361],
      [404, 368],
      [500, 368],
    ],
    e1: [
      [595, 322],
      [595, 262],
      [575, 262],
      [575, 188],
    ],
    e2: [
      [548, 414],
      [548, 577],
      [426, 577],
    ],
    e3: [
      [690, 368],
      [756, 368],
      [756, 577],
      [836, 577],
    ],
  }, desktopOffset),
  mobile: offsetRoutes({
    "graphics-rendering-pipeline": [
      [187, 144],
      [187, 188],
      [187, 188],
      [187, 230],
    ],
    e1: [
      [152, 302],
      [152, 340],
      [89, 340],
      [89, 368],
    ],
    e2: [
      [224, 302],
      [224, 340],
      [276, 340],
      [276, 368],
    ],
    e3: [
      [262, 252],
      [320, 252],
      [320, 152],
    ],
  }, mobileOffset),
};

export function getNodeLayout(id, scopeId = "graphics", size = "desktop") {
  const board = getActiveVault().layouts?.boards?.[scopeId];
  if (size !== "mobile" && board?.nodes?.[id]) return board.nodes[id];
  if (size === "mobile") {
    return (
      offsetLayout(mobileNodeLayout, mobileOffset)[id] ||
      getGeneratedLayout(id, scopeId, graphBoardSize.mobile)
    );
  }
  return (
    scopeLayouts[scopeId]?.[id] ||
    rootNodeLayout[id] ||
    graphicsNodeLayout[id] ||
    getGeneratedLayout(id, scopeId, graphBoardSize.desktop)
  );
}

export function getStageLayout(stage = {}) {
  const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    ...stage,
    x: finiteOr(stage.x, 0),
    y: finiteOr(stage.y, 0),
    width: finiteOr(stage.width ?? stage.w, 360),
    height: finiteOr(stage.height ?? stage.h, 220),
  };
}

export function getBoardStages(scopeId = "root", boardOverride = null) {
  const board = boardOverride || getActiveVault().layouts?.boards?.[scopeId];
  return Array.isArray(board?.stages) ? board.stages.map(getStageLayout) : [];
}

export function isPointInsideStage(point, stage) {
  const box = getStageLayout(stage);
  return (
    Number(point?.x) >= box.x &&
    Number(point?.x) <= box.x + box.width &&
    Number(point?.y) >= box.y &&
    Number(point?.y) <= box.y + box.height
  );
}

export function getStageForNode(nodeId, scopeId = "root", boardOverride = null) {
  const nodeBox = boardOverride?.nodes?.[nodeId] || getNodeLayout(nodeId, scopeId);
  if (!nodeBox) return null;
  const center = {
    x: nodeBox.x + nodeBox.width / 2,
    y: nodeBox.y + nodeBox.height / 2,
  };
  return getBoardStages(scopeId, boardOverride)
    .map((stage, index) => ({ stage, index }))
    .filter(({ stage }) => isPointInsideStage(center, stage))
    .sort((left, right) => {
      const orderDelta = Number(left.stage.order || 0) - Number(right.stage.order || 0);
      if (orderDelta) return orderDelta;
      const areaDelta = left.stage.width * left.stage.height - right.stage.width * right.stage.height;
      return areaDelta || right.index - left.index;
    })[0]?.stage || null;
}

export function getManualTracePoints(edgeId, scopeId = "graphics") {
  const route = getActiveVault().layouts?.boards?.[scopeId]?.routes?.[edgeId];
  return route?.points?.length ? route.points : undefined;
}

export function getTracePoints(edgeId, scopeId = "graphics", size = "desktop") {
  const activeVault = getActiveVault();
  const manualRoute = size !== "mobile" ? getManualTracePoints(edgeId, scopeId) : null;
  if (manualRoute) return manualRoute;
  const routeScope = size === "mobile" ? "mobile" : scopeId;
  if (traceRoutes[routeScope]?.[edgeId]) return traceRoutes[routeScope][edgeId];

  const scope = activeVault.scopes?.[scopeId];
  const edge = scope?.edges?.find((item) => item.id === edgeId);
  if (!edge) return undefined;

  const sourceBox = getNodeLayout(edge.source, scopeId, size);
  const targetBox = getNodeLayout(edge.target, scopeId, size);
  if (!sourceBox || !targetBox) return undefined;

  const routeIndex = Math.max(0, scope.edges.findIndex((item) => item.id === edgeId));
  return generateOrthogonalRoute(sourceBox, targetBox, { routeIndex });
}

export function getGraphBoardSize(scopeId = "root", size = "desktop") {
  if (size === "mobile") return graphBoardSize.mobile;
  const board = getActiveVault().layouts?.boards?.[scopeId];
  return board
    ? { width: board.width || graphBoardSize.desktop.width, height: board.height || graphBoardSize.desktop.height }
    : graphBoardSize.desktop;
}

export function getScopeLayoutMode(scopeId = "root") {
  const board = getActiveVault().layouts?.boards?.[scopeId];
  if (!board || board.source === "generated") return "generated-board";
  return board.missingRouteEdgeIds?.length ? "mixed-board" : "manual-board";
}

function getGeneratedLayout(id, scopeId, board) {
  const scope = getActiveVault().scopes?.[scopeId];
  const index = Math.max(0, scope?.nodes?.findIndex((node) => node.id === id) ?? 0);
  const count = Math.max(1, scope?.nodes?.length || 1);
  const centerX = board.width / 2;
  const centerY = board.height / 2;
  if (index === 0) return { x: centerX - 90, y: centerY - 44, width: 180, height: 88 };
  const angle = ((index - 1) / Math.max(1, count - 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = Math.min(board.width, board.height) * 0.32;
  return {
    x: Math.round(centerX + Math.cos(angle) * radius - 80),
    y: Math.round(centerY + Math.sin(angle) * radius - 36),
    width: 160,
    height: 72,
  };
}

export function pointsToPath(points) {
  if (!points?.length) return "";
  const [start, ...rest] = points;
  return `M ${start[0]} ${start[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(" ")}`;
}
