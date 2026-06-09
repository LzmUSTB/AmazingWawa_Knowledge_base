import { findGraphNode } from "../graph/graph-data-store.js";

export const PINNED_KEY = "amazingwawa.pinnedNodeIds";
export const RECENT_KEY = "amazingwawa.recentNodeIds";
const RECENT_LIMIT = 20;

function readJsonArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeEntries(items, timeKey) {
  const now = Date.now();
  const byId = new Map();
  items.forEach((item, index) => {
    const id = typeof item === "string" ? item : item?.id;
    if (!id || typeof id !== "string") return;
    const timestamp = Number(typeof item === "string" ? now - index : item?.[timeKey]);
    const entry = { id, [timeKey]: Number.isFinite(timestamp) ? timestamp : now - index };
    const previous = byId.get(id);
    if (!previous || previous[timeKey] < entry[timeKey]) byId.set(id, entry);
  });
  return [...byId.values()].sort((a, b) => b[timeKey] - a[timeKey]);
}

function writeEntries(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

export function loadPinnedNodes() {
  const entries = normalizeEntries(readJsonArray(PINNED_KEY), "pinnedAt");
  writeEntries(PINNED_KEY, entries);
  return entries;
}

export function loadRecentNodes() {
  const entries = normalizeEntries(readJsonArray(RECENT_KEY), "openedAt").slice(0, RECENT_LIMIT);
  writeEntries(RECENT_KEY, entries);
  return entries;
}

export function togglePinnedNode(entries, nodeId) {
  if (!nodeId) return entries;
  const existing = entries.some((entry) => entry.id === nodeId);
  const nextEntries = existing
    ? entries.filter((entry) => entry.id !== nodeId)
    : [{ id: nodeId, pinnedAt: Date.now() }, ...entries.filter((entry) => entry.id !== nodeId)];
  writeEntries(PINNED_KEY, nextEntries);
  return nextEntries;
}

export function addRecentNode(entries, nodeId) {
  if (!nodeId) return entries;
  const nextEntries = [{ id: nodeId, openedAt: Date.now() }, ...entries.filter((entry) => entry.id !== nodeId)].slice(0, RECENT_LIMIT);
  writeEntries(RECENT_KEY, nextEntries);
  return nextEntries;
}

function nodeSummary(node) {
  return node?.summary || node?.description || node?.definition || "";
}

function nodeTitle(node) {
  return node?.title || node?.name || node?.id || "";
}

export function entriesToShortcutResults(entries, kind, { limit = 8, excludeIds = new Set() } = {}) {
  return entries
    .filter((entry) => !excludeIds.has(entry.id))
    .map((entry) => findGraphNode(entry.id))
    .filter(Boolean)
    .slice(0, limit)
    .map((node) => ({
      id: `${kind}:${node.id}`,
      kind,
      originalKind: "node",
      targetId: node.id,
      title: nodeTitle(node),
      subtitle: `${node.id} / ${node.domain || "unknown"} / ${node.type || "node"}`,
      summary: nodeSummary(node),
    }));
}
