export function buildFileTree(domains = [], nodes = []) {
  const conceptNodes = nodes.filter((node) => node.type !== "domain");

  return domains
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id))
    .map((domain) => ({
      id: domain.id,
      title: domain.title,
      path: `vault/content/${domain.id}`,
      type: "domain",
      color: domain.color,
      children: conceptNodes
        .filter((node) => node.domain === domain.id)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((node) => ({
          id: node.id,
          title: node.title,
          path: `vault/content/${node.domain}/${node.id}`,
          type: node.type,
          status: node.status,
        })),
    }));
}
