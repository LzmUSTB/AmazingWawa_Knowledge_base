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
  return nodeMap.get(id)?.title || id;
}

function edgeTouches(edge, nodeId) {
  return edge.source === nodeId || edge.target === nodeId;
}

export function buildGraphScopes({ domains = [], nodes = [], edges = [] }) {
  const nodeMap = byId(nodes);
  const domainIds = domains.map((domain) => domain.id);
  const scopes = {
    root: {
      id: "root",
      type: "root",
      breadcrumb: ["Global Graph"],
      selectedNodeId: domainIds[0] || "",
      nodes: pickNodes(nodeMap, domainIds),
      edges: edges.filter((edge) => domainIds.includes(edge.source) && domainIds.includes(edge.target)),
    },
  };

  domains.forEach((domain) => {
    const childIds = edges
      .filter((edge) => edge.relation === "contains" && edge.source === domain.id)
      .map((edge) => edge.target);
    const scopeNodeIds = unique([domain.id, ...childIds]);

    scopes[domain.id] = {
      id: domain.id,
      type: "domain",
      breadcrumb: ["Global Graph", domain.title || domain.id],
      centerNodeId: domain.id,
      selectedNodeId: domain.id,
      nodes: pickNodes(nodeMap, scopeNodeIds),
      edges: edges.filter(
        (edge) =>
          edge.source === domain.id &&
          edge.relation === "contains" &&
          scopeNodeIds.includes(edge.target),
      ),
    };
  });

  nodes
    .filter((node) => node.type !== "domain")
    .forEach((node) => {
      const connectedEdges = edges.filter((edge) => edgeTouches(edge, node.id));
      const neighborIds = connectedEdges.flatMap((edge) => [edge.source, edge.target]);
      const scopeNodeIds = unique([node.id, ...neighborIds]);

      scopes[node.id] = {
        id: node.id,
        type: "focus",
        breadcrumb: ["Global Graph", titleFor(nodeMap, node.domain), node.title || node.id],
        centerNodeId: node.id,
        selectedNodeId: node.id,
        nodes: pickNodes(nodeMap, scopeNodeIds),
        edges: connectedEdges,
      };
    });

  return scopes;
}
