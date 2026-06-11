<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  searchQuery: { type: String, default: "" },
});

const FLOW_NODE_WIDTH = 190;
const FLOW_NODE_HEIGHT = 70;
const FLOW_X_GAP = 110;
const FLOW_Y_GAP = 46;
const FLOW_PADDING = 52;

const selectedNodeId = ref("");
const markerId = `flow-arrow-${Math.random().toString(36).slice(2)}`;
const layout = computed(() => flowLayout(props.data || {}));
const selectedFlowNodeId = computed(() => selectedNodeId.value || layout.value.nodes[0]?.id || "");
const selectedFlowNode = computed(() => layout.value.nodesById.get(selectedFlowNodeId.value) || layout.value.nodes[0] || fallbackNode("No step"));
const matchingFlowNodeIds = computed(() => {
  const query = props.searchQuery.trim().toLowerCase();
  if (!query) return new Set();
  return new Set(layout.value.nodes.filter((node) => [node.id, node.label, node.description, node.lane, node.kind, node.detail].some((value) => String(value || "").toLowerCase().includes(query))).map((node) => node.id));
});
const flowLanes = computed(() => {
  const rows = new Map();
  layout.value.nodes.filter((node) => node.lane).forEach((node) => {
    if (!rows.has(node.lane)) rows.set(node.lane, node.y);
  });
  return [...rows.entries()].map(([label, y]) => ({ label, y }));
});

watch(() => props.searchQuery, () => {
  const firstMatch = layout.value.nodes.find((node) => matchingFlowNodeIds.value.has(node.id));
  if (firstMatch) selectedNodeId.value = firstMatch.id;
}, { immediate: true });

function entries(value = {}) { return Object.entries(value || {}); }
function asArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function conceptTitle(data, fallback) { return data.title || data.name || fallback; }
function processTitle(data) { return conceptTitle(data, "Process"); }
function numberOrNull(value) { const numberValue = Number(value); return Number.isFinite(numberValue) ? numberValue : null; }

function normalizeFlowNodes(data) {
  const nodeEntries = entries(data.nodes);
  if (nodeEntries.length) return nodeEntries.map(([id, node]) => normalizeNodeObject(id, node));
  const steps = Array.isArray(data.steps) ? data.steps : [];
  return steps.map((step, index) => {
    if (typeof step === "string") return normalizeNodeObject(`step-${index + 1}`, { label: step });
    const id = step.id || step.key || step.name || `step-${index + 1}`;
    return normalizeNodeObject(id, step);
  });
}

function normalizeNodeObject(id, node) {
  const value = node && typeof node === "object" ? node : { label: node };
  return {
    id: String(id),
    label: String(value.label || value.title || value.name || id),
    description: String(value.description || value.text || value.summary || value.detail || ""),
    detail: String(value.detail || value.notes || ""),
    kind: String(value.kind || value.type || ""),
    lane: String(value.lane || value.group || value.stage || ""),
    x: numberOrNull(value.x),
    y: numberOrNull(value.y),
    width: numberOrNull(value.width) || FLOW_NODE_WIDTH,
    height: numberOrNull(value.height) || FLOW_NODE_HEIGHT,
  };
}

function dependencySources(step) {
  if (!step || typeof step === "string") return [];
  const raw = step.depends_on || step.dependsOn || step.depends || step.after || step.requires || [];
  return asArray(raw).flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);
}

function normalizeStepDependencyEdges(data) {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  return steps.flatMap((step, index) => {
    if (!step || typeof step === "string") return [];
    const target = String(step.id || step.key || step.name || `step-${index + 1}`);
    return dependencySources(step).map((source) => ({ source, target, label: String(step.dependency_label || step.dependencyLabel || "") }));
  });
}

function normalizeParallelGroups(data) {
  const raw = data.parallel;
  if (!raw) return [];
  const groups = Array.isArray(raw) ? raw : [raw];
  return groups.map((group) => Array.isArray(group) ? group : String(group).replace(/^\[/, "").replace(/\]$/, "").split(",").map((item) => item.trim()).filter(Boolean)).filter((group) => group.length);
}

function normalizeFlowEdges(data) {
  const dependencyEdges = normalizeStepDependencyEdges(data);
  if (dependencyEdges.length) return dependencyEdges;
  const rawEdges = Array.isArray(data.edges) ? data.edges : typeof data.edges === "string" ? [data.edges] : entries(data.edges).map(([source, target]) => ({ source, target }));
  const parsed = rawEdges.map((edge) => {
    if (Array.isArray(edge)) return { source: String(edge[0] || "").trim(), target: String(edge[1] || "").trim() };
    if (edge && typeof edge === "object") return { source: String(edge.source || edge.from || "").trim(), target: String(edge.target || edge.to || "").trim(), label: String(edge.label || edge.text || "") };
    const match = String(edge).match(/^\s*(.+?)\s*(?:->|=>|→)\s*(.+?)\s*$/);
    return match ? { source: match[1].trim(), target: match[2].trim() } : null;
  }).filter((edge) => edge?.source && edge?.target);
  if (parsed.length) return parsed;
  const steps = normalizeFlowNodes(data);
  return steps.slice(1).map((node, index) => ({ source: steps[index].id, target: node.id }));
}

function flowParallelLaneMap(data) {
  const laneMap = new Map();
  normalizeParallelGroups(data).forEach((group) => group.forEach((id, index) => laneMap.set(id, index)));
  return laneMap;
}

function flowNodeLevels(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id));
  edges.forEach((edge) => { ids.add(edge.source); ids.add(edge.target); });
  const levels = new Map([...ids].map((id) => [id, 0]));
  for (let pass = 0; pass < ids.size + 2; pass += 1) {
    let changed = false;
    edges.forEach((edge) => {
      const nextLevel = (levels.get(edge.source) || 0) + 1;
      if (nextLevel > (levels.get(edge.target) || 0)) { levels.set(edge.target, nextLevel); changed = true; }
    });
    if (!changed) break;
  }
  return levels;
}

function flowLayout(data) {
  const baseNodes = normalizeFlowNodes(data);
  const edges = normalizeFlowEdges(data);
  const nodesById = new Map(baseNodes.map((node) => [node.id, node]));
  edges.forEach((edge) => { if (!nodesById.has(edge.source)) nodesById.set(edge.source, fallbackNode(edge.source)); if (!nodesById.has(edge.target)) nodesById.set(edge.target, fallbackNode(edge.target)); });
  const nodes = [...nodesById.values()];
  const explicitPlacement = nodes.every((node) => node.x !== null && node.y !== null);
  if (explicitPlacement) {
    const placed = nodes.map((node) => ({ ...node, x: node.x, y: node.y, width: node.width || FLOW_NODE_WIDTH, height: node.height || FLOW_NODE_HEIGHT, isParallel: Boolean(node.lane) || node.kind === "parallel", isOutput: node.kind === "output" || !edges.some((edge) => edge.source === node.id) }));
    const width = Math.max(760, Math.max(...placed.map((node) => node.x + node.width + FLOW_PADDING)));
    const height = Math.max(390, Math.max(...placed.map((node) => node.y + node.height + FLOW_PADDING)));
    return { width, height, nodes: placed, edges, nodesById: new Map(placed.map((node) => [node.id, node])) };
  }
  const levels = flowNodeLevels(nodes, edges);
  const maxLevel = Math.max(1, ...[...levels.values()]);
  const laneMap = flowParallelLaneMap(data);
  const outgoing = new Map();
  edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]));
  const nodesByLevel = new Map();
  nodes.forEach((node) => { const level = levels.get(node.id) || 0; nodesByLevel.set(level, [...(nodesByLevel.get(level) || []), node]); });
  const placed = [];
  let maxRows = 1;
  [...nodesByLevel.entries()].forEach(([level, levelNodes]) => {
    const sorted = [...levelNodes].sort((a, b) => {
      const aLane = laneMap.has(a.id) ? laneMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bLane = laneMap.has(b.id) ? laneMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (aLane !== bLane) return aLane - bLane;
      if (a.lane && b.lane && a.lane !== b.lane) return a.lane.localeCompare(b.lane);
      return a.id.localeCompare(b.id);
    });
    maxRows = Math.max(maxRows, sorted.length);
    sorted.forEach((node, rowIndex) => placed.push({ ...node, x: FLOW_PADDING + level * (FLOW_NODE_WIDTH + FLOW_X_GAP), y: FLOW_PADDING + rowIndex * (FLOW_NODE_HEIGHT + FLOW_Y_GAP), width: node.width || FLOW_NODE_WIDTH, height: node.height || FLOW_NODE_HEIGHT, isParallel: laneMap.has(node.id) || node.kind === "parallel" || Boolean(node.lane), isOutput: node.kind === "output" || !(outgoing.get(node.id) || []).length }));
  });
  const width = FLOW_PADDING * 2 + (maxLevel + 1) * FLOW_NODE_WIDTH + maxLevel * FLOW_X_GAP;
  const height = FLOW_PADDING * 2 + maxRows * FLOW_NODE_HEIGHT + Math.max(0, maxRows - 1) * FLOW_Y_GAP;
  return { width, height, nodes: placed, edges, nodesById: new Map(placed.map((node) => [node.id, node])) };
}

function fallbackNode(id) { return { id, label: id, description: "", detail: "", kind: "", lane: "", x: null, y: null, width: FLOW_NODE_WIDTH, height: FLOW_NODE_HEIGHT }; }
function flowBoardStyle() { return { width: `${layout.value.width}px`, height: `${layout.value.height}px` }; }
function flowNodeStyle(node) { return { left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` }; }
function flowEdgePath(edge) { const source = layout.value.nodesById.get(edge.source); const target = layout.value.nodesById.get(edge.target); if (!source || !target) return ""; const sourceRight = source.x + source.width; const sourceCenterY = source.y + source.height / 2; const targetLeft = target.x; const targetCenterY = target.y + target.height / 2; const midX = Math.round((sourceRight + targetLeft) / 2); return `M ${sourceRight} ${sourceCenterY} L ${midX} ${sourceCenterY} L ${midX} ${targetCenterY} L ${targetLeft} ${targetCenterY}`; }
function isSelectedFlowNode(nodeId) { return selectedFlowNodeId.value === nodeId; }
function isSelectedFlowEdge(edge) { return edge.source === selectedFlowNodeId.value || edge.target === selectedFlowNodeId.value; }
function flowNodeClass(node) { return { "is-active": isSelectedFlowNode(node.id), "is-search-match": matchingFlowNodeIds.value.has(node.id), "is-parallel": node.isParallel, "is-output": node.isOutput }; }
function flowLaneStyle(lane) { return { top: `${lane.y - 24}px` }; }
function normalizeEdgeLabel(edge) { return `${edge.source} -> ${edge.target}`; }
function flowNodeAriaLabel(node) { return node.description ? `${node.label}: ${node.description}` : node.label; }
</script>

<template>
  <section class="content-block process-flow">
    <div class="block-kicker">Process Flow</div>
    <h3>{{ processTitle(data) }}</h3>
    <div class="flow-layout">
      <div class="flow-canvas-scroll">
        <div class="flow-canvas-board" :style="flowBoardStyle()">
          <svg class="flow-lines" :height="layout.height" :viewBox="`0 0 ${layout.width} ${layout.height}`" :width="layout.width" aria-hidden="true">
            <defs><marker :id="markerId" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M 0 0 L 7 3.5 L 0 7 z" fill="currentColor" /></marker></defs>
            <path v-for="edge in layout.edges" :key="normalizeEdgeLabel(edge)" class="flow-line" :class="{ 'is-muted': !isSelectedFlowEdge(edge) }" :d="flowEdgePath(edge)" :marker-end="`url(#${markerId})`" />
          </svg>
          <div v-for="lane in flowLanes" :key="lane.label" class="flow-lane-label" :style="flowLaneStyle(lane)">{{ lane.label }}</div>
          <button v-for="flowNode in layout.nodes" :key="flowNode.id" class="flow-node" :class="flowNodeClass(flowNode)" :style="flowNodeStyle(flowNode)" type="button" :aria-label="flowNodeAriaLabel(flowNode)" :aria-selected="isSelectedFlowNode(flowNode.id)" @click="selectedNodeId = flowNode.id"><strong>{{ flowNode.label }}</strong></button>
        </div>
      </div>
      <aside class="flow-detail">
        <div class="flow-detail-meta"><span>{{ selectedFlowNode.lane || selectedFlowNode.kind || "flow node" }}</span><span>click node to inspect</span></div>
        <h4>{{ selectedFlowNode.label }}</h4>
        <p>{{ selectedFlowNode.description || "No description was provided for this step." }}</p>
        <p v-if="selectedFlowNode.detail" class="flow-detail-extra">{{ selectedFlowNode.detail }}</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.content-block { display: grid; gap: 12px; border: 1px solid var(--border-muted); border-left: 5px solid var(--note-color, var(--graphics)); background: var(--background-panel); padding: 16px; }
.block-kicker { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.content-block h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-title); line-height: 1.2; }
.content-block p { margin: 0; color: var(--text-secondary); font-size: calc(14px * var(--ui-font-scale)); line-height: 1.65; }
.flow-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 320px); gap: 18px; }
.flow-canvas-scroll { max-width: 100%; min-height: 390px; overflow: auto; border: 1px solid var(--border-primary); background: var(--background-main); }
.flow-canvas-board { position: relative; min-width: 100%; min-height: 390px; background: var(--background-main); }
.flow-canvas-board::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(237,237,237,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(237,237,237,.08) 1px, transparent 1px); background-size: 32px 32px; pointer-events: none; }
.flow-lines { position: absolute; left: 0; top: 0; color: var(--note-color, var(--career)); pointer-events: none; }
.flow-line { fill: none; stroke: currentColor; stroke-linecap: square; stroke-linejoin: miter; stroke-width: 1.7; opacity: .82; vector-effect: non-scaling-stroke; }
.flow-line.is-muted { stroke: rgba(237,237,237,.32); }
.flow-lane-label { position: absolute; left: 14px; z-index: 1; color: var(--text-muted); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.flow-node { position: absolute; z-index: 2; border: 1px solid var(--border-muted); border-left: 5px solid var(--note-color, var(--career)); background: var(--background-panel); color: var(--text-secondary); cursor: pointer; display: grid; place-items: center; font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 900; line-height: 1.25; padding: 8px 10px; text-align: center; text-transform: uppercase; }
.flow-node:hover, .flow-node.is-active { border-color: var(--border-primary); color: var(--text-primary); }
.flow-node.is-search-match { border-color: var(--career); box-shadow: inset 0 0 0 1px var(--career); color: var(--text-primary); }
.flow-node.is-parallel { border-left-color: var(--career); }
.flow-node.is-output { border-left-color: var(--quiz); }
.flow-node strong { font-size: var(--font-size-small); }
.flow-detail { display: grid; align-content: start; gap: 12px; border: 1px solid var(--border-primary); background: var(--background-main); padding: 18px; }
.flow-detail h4 { margin: 0; color: var(--text-primary); font-size: calc(20px * var(--ui-font-scale)); line-height: 1.15; text-transform: uppercase; }
.flow-detail-meta { display: grid; gap: 6px; color: var(--text-muted); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.flow-detail-extra { border-top: 1px solid var(--border-muted); padding-top: 10px; }
@media (max-width: 900px) { .flow-layout { grid-template-columns: 1fr; } .flow-canvas-scroll, .flow-canvas-board { min-height: 340px; } }
</style>
