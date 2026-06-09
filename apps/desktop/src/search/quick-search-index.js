import { findGraphNode, getActiveVault, getGraphEdges, getGraphNodes } from "../graph/graph-data-store.js";
import { scoreQuickSearchItem } from "./quick-search-score.js";

const GROUP_LIMITS = {
  nodes: 8,
  relations: 6,
  domains: 4,
};

const TOTAL_LIMIT = 18;

function compactList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(" ");
  return value || "";
}

function nodeSummary(node) {
  return node.summary || node.description || node.definition || "";
}

function domainTitle(domain) {
  return domain.title || domain.name || domain.id;
}

function nodeTitle(node) {
  return node?.title || node?.name || node?.id || "";
}

function relationTitle(edge) {
  const source = findGraphNode(edge.source);
  const target = findGraphNode(edge.target);
  return `${nodeTitle(source) || edge.source} ${edge.relation} ${nodeTitle(target) || edge.target}`;
}

function scoreNode(query, node) {
  return scoreQuickSearchItem(query, [
    { value: node.id, weights: { exact: 110, prefix: 78, includes: 48 } },
    { value: nodeTitle(node), weights: { exact: 100, prefix: 74, includes: 44 }, boost: 8 },
    { value: node.domain, weights: { exact: 58, prefix: 42, includes: 24 } },
    { value: node.type, weights: { exact: 48, prefix: 34, includes: 18 } },
    { value: node.status, weights: { exact: 36, prefix: 24, includes: 14 } },
    { value: nodeSummary(node), weights: { exact: 42, prefix: 30, includes: 18 } },
    { value: compactList(node.tags), weights: { exact: 42, prefix: 30, includes: 18 } },
    { value: compactList(node.aliases), weights: { exact: 72, prefix: 54, includes: 30 } },
  ]);
}

function scoreDomain(query, domain) {
  return scoreQuickSearchItem(query, [
    { value: domain.id, weights: { exact: 108, prefix: 76, includes: 46 } },
    { value: domainTitle(domain), weights: { exact: 100, prefix: 72, includes: 42 }, boost: 6 },
    { value: domain.description || domain.summary, weights: { exact: 42, prefix: 30, includes: 18 } },
  ]);
}

function scoreRelation(query, edge) {
  const source = findGraphNode(edge.source);
  const target = findGraphNode(edge.target);
  return scoreQuickSearchItem(query, [
    { value: edge.id, weights: { exact: 74, prefix: 50, includes: 24 } },
    { value: edge.relation, weights: { exact: 58, prefix: 38, includes: 22 } },
    { value: edge.source, weights: { exact: 74, prefix: 50, includes: 30 } },
    { value: edge.target, weights: { exact: 74, prefix: 50, includes: 30 } },
    { value: nodeTitle(source), weights: { exact: 80, prefix: 58, includes: 34 } },
    { value: nodeTitle(target), weights: { exact: 80, prefix: 58, includes: 34 } },
    { value: relationTitle(edge), weights: { exact: 84, prefix: 58, includes: 34 } },
  ]);
}

function sortByScoreAndTitle(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.title.localeCompare(b.title);
}

function limitResults(items, limit) {
  return items
    .filter((item) => item.score > 0)
    .sort(sortByScoreAndTitle)
    .slice(0, limit);
}

export function buildQuickSearchResults(query) {
  const vault = getActiveVault();
  const nodes = getGraphNodes();
  const domains = vault.domains || [];
  const edges = getGraphEdges();

  const nodeResults = limitResults(
    nodes.map((node) => ({
      group: "NODES",
      kind: "node",
      id: `node:${node.id}`,
      targetId: node.id,
      title: nodeTitle(node),
      subtitle: `${node.id} / ${node.type || "node"} / ${node.domain || "unknown"}`,
      summary: nodeSummary(node),
      score: scoreNode(query, node),
    })),
    GROUP_LIMITS.nodes,
  );

  const relationResults = limitResults(
    edges.map((edge) => {
      const source = findGraphNode(edge.source);
      const target = findGraphNode(edge.target);
      return {
        group: "RELATIONS",
        kind: "relation",
        id: `relation:${edge.id || `${edge.source}-${edge.relation}-${edge.target}`}`,
        sourceId: edge.source,
        targetId: edge.target,
        relation: edge.relation,
        title: relationTitle(edge),
        subtitle: `${edge.source} -> ${edge.target}`,
        summary: `${nodeTitle(source) || edge.source} / ${edge.relation} / ${nodeTitle(target) || edge.target}`,
        score: scoreRelation(query, edge),
      };
    }),
    GROUP_LIMITS.relations,
  );

  const domainResults = limitResults(
    domains.map((domain) => ({
      group: "DOMAINS",
      kind: "domain",
      id: `domain:${domain.id}`,
      targetId: domain.id,
      title: domainTitle(domain),
      subtitle: domain.id,
      summary: domain.description || domain.summary || "",
      score: scoreDomain(query, domain),
    })),
    GROUP_LIMITS.domains,
  );

  const grouped = {
    nodes: nodeResults,
    relations: relationResults,
    domains: domainResults,
  };

  let remaining = TOTAL_LIMIT;
  return Object.fromEntries(
    Object.entries(grouped).map(([group, items]) => {
      const limited = items.slice(0, Math.max(0, remaining));
      remaining -= limited.length;
      return [group, limited];
    }),
  );
}

export function flattenQuickSearchResults(groups) {
  return ["nodes", "relations", "domains"].flatMap((group) => groups[group] || []);
}
