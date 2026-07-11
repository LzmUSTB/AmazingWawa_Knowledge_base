const VALID_PORTS = new Set(["top", "right", "bottom", "left"]);
const VALID_STAGE_FLOWS = new Set(["free", "left-to-right", "top-to-bottom"]);

function isOrthogonal(points = []) {
  return points.every((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return previous[0] === point[0] || previous[1] === point[1];
  });
}

export function validateLayout(normalizedVault) {
  const warnings = [];
  const nodeIds = new Set(normalizedVault.nodes.map((node) => node.id));
  const edgeById = new Map(normalizedVault.edges.map((edge) => [edge.id, edge]));

  Object.entries(normalizedVault.layouts?.boards || {}).forEach(([scopeId, board]) => {
    Object.keys(board.nodes || {}).forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) {
        warnings.push(`board "${scopeId}" references unknown node "${nodeId}"`);
      }
    });

    Object.entries(board.routes || {}).forEach(([routeId, route]) => {
      const edgeId = route.edge || routeId;
      const edge = edgeById.get(edgeId);

      if (!edge) {
        warnings.push(`board "${scopeId}" route "${routeId}" references unknown edge "${edgeId}"`);
        return;
      }

      if (!board.nodes?.[edge.source] || !board.nodes?.[edge.target]) {
        warnings.push(
          `board "${scopeId}" route "${routeId}" references edge "${edgeId}" whose source or target node is missing from the board`,
        );
      }

      if (!VALID_PORTS.has(route.fromPort)) {
        warnings.push(`board "${scopeId}" route "${routeId}" has invalid fromPort "${route.fromPort}"`);
      }
      if (!VALID_PORTS.has(route.toPort)) {
        warnings.push(`board "${scopeId}" route "${routeId}" has invalid toPort "${route.toPort}"`);
      }
      if (!Array.isArray(route.points) || route.points.length < 2) {
        warnings.push(`board "${scopeId}" route "${routeId}" should have at least two route points`);
      } else if (!isOrthogonal(route.points)) {
        warnings.push(`board "${scopeId}" route "${routeId}" contains diagonal segments`);
      }
    });

    const stageIds = new Set();
    (board.stages || []).forEach((stage, index) => {
      const label = `board "${scopeId}" stage ${index + 1}`;
      if (typeof stage.id !== "string" || !stage.id.trim()) {
        warnings.push(`${label} must have a string id`);
      } else if (stageIds.has(stage.id)) {
        warnings.push(`${label} duplicates stage id "${stage.id}"`);
      } else {
        stageIds.add(stage.id);
      }
      ["x", "y", "width", "height"].forEach((field) => {
        if (!Number.isFinite(Number(stage[field]))) {
          warnings.push(`${label} has invalid ${field}`);
        }
      });
      if (Number(stage.width) < 120) warnings.push(`${label} width should be at least 120`);
      if (Number(stage.height) < 80) warnings.push(`${label} height should be at least 80`);
      if (!VALID_STAGE_FLOWS.has(stage.flow)) warnings.push(`${label} has invalid flow "${stage.flow}"`);
    });
  });

  Object.values(normalizedVault.scopes || {}).forEach((scope) => {
    const board = normalizedVault.layouts?.boards?.[scope.id];
    scope.edges.forEach((edge) => {
      if (!board?.routes?.[edge.id]) {
        warnings.push(
          `scope "${scope.id}" edge "${edge.id}" has no handwritten route; generated route will be used`,
        );
      }
    });
  });

  return warnings;
}
