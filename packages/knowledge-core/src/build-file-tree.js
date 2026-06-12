function displayTitle(entity = {}) {
  return entity.titleLocale || entity.title || entity.id || "";
}

function sortTreeItems(a, b) {
  return (
    (a.order ?? 999) - (b.order ?? 999) ||
    displayTitle(a).localeCompare(displayTitle(b)) ||
    String(a.id || "").localeCompare(String(b.id || ""))
  );
}

function nodeHasNote(node = {}, notes = {}) {
  const note = notes[node.id];
  return Boolean(note?.markdown || note?.html || node.contentFormat === "markdown" || node.contentFormat === "html");
}

function makeNodeTreeItem(node, notes, children = []) {
  return {
    id: node.id,
    title: node.title,
    titleLocale: node.titleLocale || "",
    displayTitle: displayTitle(node),
    path: `vault/content/${node.domain}/${node.id}`,
    domain: node.domain,
    type: node.type,
    status: node.status,
    contentFormat: node.contentFormat,
    hasNote: nodeHasNote(node, notes),
    children,
  };
}

export function buildFileTree(domains = [], nodes = [], edges = [], notes = {}) {
  const conceptNodes = nodes.filter((node) => node.type !== "domain");
  const nodeById = new Map(conceptNodes.map((node) => [node.id, node]));
  const domainIds = new Set(domains.map((domain) => domain.id));
  const containsEdges = edges.filter((edge) => edge.relation === "contains");
  const childIdsByParent = new Map();
  const childIdsWithParent = new Set();

  containsEdges.forEach((edge) => {
    const parentId = edge.source || edge.from;
    const childId = edge.target || edge.to;
    if (!nodeById.has(childId)) return;
    const child = nodeById.get(childId);
    if (!domainIds.has(parentId) && !nodeById.has(parentId)) return;
    if (domainIds.has(parentId) && child.domain !== parentId) return;
    if (nodeById.has(parentId) && nodeById.get(parentId)?.domain !== child.domain) return;
    childIdsWithParent.add(childId);
    childIdsByParent.set(parentId, [...(childIdsByParent.get(parentId) || []), childId]);
  });

  function buildChildren(parentId, domainId, visited = new Set()) {
    const childIds = childIdsByParent.get(parentId) || [];
    return childIds
      .map((childId) => nodeById.get(childId))
      .filter((node) => node && node.domain === domainId && !visited.has(node.id))
      .sort(sortTreeItems)
      .map((node) => {
        const nextVisited = new Set(visited);
        nextVisited.add(node.id);
        return makeNodeTreeItem(node, notes, buildChildren(node.id, domainId, nextVisited));
      });
  }

  return domains
    .slice()
    .sort(sortTreeItems)
    .map((domain) => {
      const explicitChildren = buildChildren(domain.id, domain.id, new Set([domain.id]));
      const explicitChildIdSet = new Set(explicitChildren.map((node) => node.id));
      const fallbackChildren = conceptNodes
        .filter((node) => node.domain === domain.id && !childIdsWithParent.has(node.id) && !explicitChildIdSet.has(node.id))
        .sort(sortTreeItems)
        .map((node) => makeNodeTreeItem(node, notes, buildChildren(node.id, domain.id, new Set([domain.id, node.id]))));

      return {
        id: domain.id,
        title: domain.title,
        titleLocale: domain.titleLocale || "",
        displayTitle: displayTitle(domain),
        path: `vault/content/${domain.id}`,
        type: "domain",
        color: domain.color,
        children: [...explicitChildren, ...fallbackChildren].sort(sortTreeItems),
      };
    });
}
