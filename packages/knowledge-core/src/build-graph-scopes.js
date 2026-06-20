function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function unique(items) {
  return [...new Set(items)];
}

function pickNodes(nodeMap, ids) {
  return ids.map((id) => nodeMap.get(id)).filter(Boolean);
}

function titleFor(nodeMap, id) {
  const node = nodeMap.get(id);
  return node?.titleLocale || node?.title || id;
}

function edgeTouches(edge, nodeId) {
  return edge.source === nodeId || edge.target === nodeId;
}

const LINK_RELATIONS = new Set(["depends-on", "used-in", "compares-with"]);

export function buildGraphScopes({ domains = [], nodes = [], edges = [] }) {
  const nodeMap = byId(nodes);
  const domainIds = domains.map((domain) => domain.id);
  const scopes = {
    root: {
      id: "root",
      type: "root",
      breadcrumb: ["Global Graph"],
      selectedNodeId: "",
      nodes: pickNodes(nodeMap, domainIds),
      edges: edges.filter((edge) => domainIds.includes(edge.source) && domainIds.includes(edge.target)),
    },
  };

  domains.forEach((domain) => {
    const directChildIds = edges
      .filter((edge) => edge.relation === "contains" && edge.source === domain.id)
      .map((edge) => edge.target);
    const directChildIdSet = new Set(directChildIds);
    const semanticEdges = edges.filter(
      (edge) => LINK_RELATIONS.has(edge.relation) &&
        (directChildIdSet.has(edge.source) || directChildIdSet.has(edge.target)),
    );
    const externalNeighborIds = unique(
      semanticEdges
        .flatMap((edge) => [edge.source, edge.target])
        .filter((id) => id !== domain.id && !directChildIdSet.has(id)),
    );
    const scopeNodeIds = unique([domain.id, ...directChildIds, ...externalNeighborIds]);
    const containsEdges = edges.filter(
      (edge) => edge.source === domain.id && edge.relation === "contains" && directChildIdSet.has(edge.target),
    );

    scopes[domain.id] = {
      id: domain.id,
      type: "domain",
      breadcrumb: ["Global Graph", domain.titleLocale || domain.title || domain.id],
      centerNodeId: domain.id,
      selectedNodeId: domain.id,
      directChildIds,
      externalNodeIds: externalNeighborIds,
      nodes: pickNodes(nodeMap, scopeNodeIds),
      edges: [...containsEdges, ...semanticEdges],
    };
  });

  nodes
    .filter((node) => node.type !== "domain")
    .forEach((node) => {
      const connectedEdges = edges.filter(
        (edge) => edgeTouches(edge, node.id) && !(edge.relation === "contains" && edge.target === node.id),
      );
      const neighborIds = connectedEdges.flatMap((edge) => [edge.source, edge.target]);
      const scopeNodeIds = unique([node.id, ...neighborIds]);

      scopes[node.id] = {
        id: node.id,
        type: "focus",
        breadcrumb: ["Global Graph", titleFor(nodeMap, node.domain), node.titleLocale || node.title || node.id],
        centerNodeId: node.id,
        selectedNodeId: node.id,
        nodes: pickNodes(nodeMap, scopeNodeIds),
        edges: connectedEdges,
      };
    });

  return scopes;
}
