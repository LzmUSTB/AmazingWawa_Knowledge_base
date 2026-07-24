<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import cytoscape from "cytoscape";
import { findGraphNode, useActiveVault } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  canSave: { type: Boolean, default: false },
  focusNodeId: { type: String, default: "" },
  mapId: { type: String, default: "" },
  selectedElement: { type: Object, default: () => ({ kind: "", id: "" }) },
});

const emit = defineEmits(["open-scope", "save-layout", "select-element"]);

const activeVault = useActiveVault();
const graphRoot = ref(null);
const query = ref("");
const layerFilter = ref("");
const relationFilter = ref("");
let cy = null;
let resizeObserver = null;
let rebuildTimer = 0;

const conceptMap = computed(() => activeVault.value.conceptMaps?.byId?.[props.mapId] || null);
const ownerNode = computed(() => findGraphNode(conceptMap.value?.ownerNodeId));
const accent = computed(() => getDomainColor(conceptMap.value?.domain || ownerNode.value?.domain) || "#00e5d4");
const relationTypes = computed(() => Object.fromEntries(
  (conceptMap.value?.relationTypes || []).map((type) => [type.id, type]),
));
const layers = computed(() => [...(conceptMap.value?.layers || [])]
  .sort((left, right) => (left.order || 0) - (right.order || 0)));

const relationLocaleFallback = {
  requires: "依赖",
  "equivalent-if": "条件等价",
  characterizes: "刻画",
  decomposes: "分解",
  specializes: "特化",
  theorem: "定理",
  implies: "推出",
  "related-to": "相关",
};

function displayTitle(entity, fallback = "") {
  return String(entity?.titleLocale || entity?.title || entity?.id || fallback).trim();
}

function relationLabel(relation) {
  const type = relationTypes.value[relation.type] || {};
  return String(
    relation.labelLocale
    || relation.label_locale
    || type.labelLocale
    || type.label_locale
    || relationLocaleFallback[relation.type]
    || relation.label
    || type.label
    || relation.type,
  ).trim();
}

function readableFormula(value = "") {
  return String(value || "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\\operatorname\{([^}]+)\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\Longleftrightarrow/g, "⇔")
    .replace(/\\Leftrightarrow/g, "⇔")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\mapsto/g, "↦")
    .replace(/\\lambda/g, "λ")
    .replace(/\\Lambda/g, "Λ")
    .replace(/\\Sigma/g, "Σ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\sum/g, "Σ")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\proj/g, "proj")
    .replace(/\\col/g, "col")
    .replace(/\\dim/g, "dim")
    .replace(/\\ker/g, "ker")
    .replace(/\\det/g, "det")
    .replace(/\\langle/g, "⟨")
    .replace(/\\rangle/g, "⟩")
    .replace(/\\forall/g, "∀")
    .replace(/\\in/g, "∈")
    .replace(/\\ne/g, "≠")
    .replace(/\\perp/g, "⊥")
    .replace(/\\succ/g, "≻")
    .replace(/\\\|/g, "‖")
    .replace(/\\quad/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/\\\\/g, "\\")
    .replace(/\{([^{}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function nodeLabel(node) {
  const title = displayTitle(node);
  const formula = readableFormula(node.formula || node.expression);
  if (node.kind === "formula" || node.type === "formula") {
    return title && title !== node.id && formula ? `${title}\n${formula}` : formula || title;
  }
  return formula ? `${title}  ${formula}` : title;
}

function matchesQuery(node, normalizedQuery) {
  if (!normalizedQuery) return true;
  return [
    node.id,
    node.title,
    node.titleLocale,
    node.summary,
    node.formula,
    node.expression,
    node.theorem,
  ].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedQuery));
}

const filteredGraph = computed(() => {
  const allNodes = conceptMap.value?.nodes || [];
  const allRelations = conceptMap.value?.relations || [];
  const normalizedQuery = query.value.trim().toLocaleLowerCase();
  let nodes = allNodes.filter((node) => (
    (!layerFilter.value || node.layer === layerFilter.value)
    && matchesQuery(node, normalizedQuery)
  ));

  if (relationFilter.value) {
    const connectedIds = new Set();
    allRelations.forEach((relation) => {
      if (relation.type !== relationFilter.value) return;
      connectedIds.add(relation.from);
      connectedIds.add(relation.to);
    });
    nodes = nodes.filter((node) => connectedIds.has(node.id));
  }

  const visibleIds = new Set(nodes.map((node) => node.id));
  const relations = allRelations.filter((relation) => (
    visibleIds.has(relation.from)
    && visibleIds.has(relation.to)
    && (!relationFilter.value || relation.type === relationFilter.value)
  ));
  return { nodes, relations };
});

function relationDirection(relation) {
  return relation.direction || relationTypes.value[relation.type]?.direction || "forward";
}

function relationColor(relation) {
  return relation.color || relationTypes.value[relation.type]?.color || accent.value;
}

function relationLineStyle(relation) {
  const lineStyle = relation.lineStyle || relation.line_style || relationTypes.value[relation.type]?.lineStyle || "solid";
  return lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
}

function relationArrows(relation) {
  const direction = relationDirection(relation);
  return {
    sourceArrow: ["reverse", "backward", "bidirectional", "both"].includes(direction) ? "triangle" : "none",
    targetArrow: ["none", "reverse", "backward"].includes(direction) ? "none" : "triangle",
  };
}

function cyElements() {
  const nodes = filteredGraph.value.nodes.map((node) => ({
    group: "nodes",
    data: {
      id: `node:${node.id}`,
      entityId: node.id,
      kind: node.kind || node.type || "concept",
      label: nodeLabel(node),
      color: node.color || accent.value,
    },
  }));
  const edges = filteredGraph.value.relations.map((relation) => ({
    group: "edges",
    data: {
      id: `relation:${relation.id}`,
      entityId: relation.id,
      kind: "relation",
      source: `node:${relation.from}`,
      target: `node:${relation.to}`,
      label: relationLabel(relation),
      color: relationColor(relation),
      lineStyle: relationLineStyle(relation),
      ...relationArrows(relation),
    },
  }));
  return [...nodes, ...edges];
}

function cyStyles() {
  return [
    {
      selector: "node",
      style: {
        width: "label",
        height: "label",
        padding: "10px",
        shape: "round-rectangle",
        "background-color": "#111111",
        "background-opacity": 0.96,
        "border-color": "data(color)",
        "border-width": 1.5,
        color: "#ededed",
        label: "data(label)",
        "font-family": "Fira Code, Cascadia Mono, Consolas, monospace",
        "font-size": 15,
        "font-weight": 700,
        "line-height": 1.45,
        "text-halign": "center",
        "text-valign": "center",
        "text-wrap": "wrap",
        "text-max-width": 300,
      },
    },
    {
      selector: "node[kind = 'formula']",
      style: {
        "background-color": "#080808",
        "border-style": "double",
        "border-width": 3,
        "font-size": 16,
        "font-weight": 500,
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "overlay-color": "data(color)",
        "overlay-opacity": 0.12,
        "overlay-padding": 8,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.8,
        "curve-style": "straight",
        "line-color": "data(color)",
        "line-style": "data(lineStyle)",
        "source-arrow-color": "data(color)",
        "source-arrow-shape": "data(sourceArrow)",
        "target-arrow-color": "data(color)",
        "target-arrow-shape": "data(targetArrow)",
        "arrow-scale": 1.05,
        label: "data(label)",
        color: "#d8d8d8",
        "font-family": "Fira Code, Cascadia Mono, Consolas, monospace",
        "font-size": 11,
        "font-weight": 700,
        "text-rotation": "autorotate",
        "text-background-color": "#080808",
        "text-background-opacity": 0.92,
        "text-background-padding": 4,
        "text-border-color": "#3b3b3b",
        "text-border-opacity": 0.65,
        "text-border-width": 1,
        "text-margin-y": -10,
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: 3.5,
        "text-background-opacity": 1,
        "text-border-color": "data(color)",
        "text-border-opacity": 1,
      },
    },
  ];
}

function applySelection(center = false) {
  if (!cy) return;
  cy.elements().unselect();
  const kind = props.selectedElement?.kind;
  const id = props.selectedElement?.id;
  if (!kind || !id) return;
  const element = cy.getElementById(`${kind === "relation" ? "relation" : "node"}:${id}`);
  if (!element.length) return;
  element.select();
  if (center && kind !== "relation") {
    cy.animate({ center: { eles: element } }, { duration: 220 });
  }
}

function savedPosition(nodeId) {
  const saved = conceptMap.value?.layout?.nodes?.[nodeId];
  if (!saved || !Number.isFinite(Number(saved.x)) || !Number.isFinite(Number(saved.y))) return null;
  return { x: Number(saved.x), y: Number(saved.y) };
}

function allVisibleNodesHaveSavedPositions() {
  return Boolean(filteredGraph.value.nodes.length)
    && filteredGraph.value.nodes.every((node) => savedPosition(node.id));
}

function saveCurrentPositions() {
  if (!props.canSave || !cy?.nodes().length || !conceptMap.value?.id) return;
  const nodes = { ...(conceptMap.value.layout?.nodes || {}) };
  cy.nodes().forEach((node) => {
    const entityId = node.data("entityId");
    const position = node.position();
    nodes[entityId] = {
      ...(nodes[entityId] || {}),
      x: Math.round(position.x * 100) / 100,
      y: Math.round(position.y * 100) / 100,
    };
  });
  emit("save-layout", { mapId: conceptMap.value.id, layout: { nodes } });
}

function runAutomaticLayout() {
  if (!cy || !cy.nodes().length) return;
  const layout = cy.layout({
    name: "cose",
    animate: false,
    randomize: true,
    fit: true,
    padding: 46,
    nodeRepulsion: 190000,
    nodeOverlap: 34,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: (edge) => 120 + Math.min(120, String(edge.data("label") || "").length * 5),
    edgeElasticity: 80,
    nestingFactor: 1.2,
    gravity: 0.16,
    numIter: 1400,
    initialTemp: 240,
    coolingFactor: 0.96,
    minTemp: 1,
    componentSpacing: 110,
  });
  cy.one("layoutstop", () => {
    applySelection(true);
    if (!query.value && !layerFilter.value && !relationFilter.value) saveCurrentPositions();
  });
  layout.run();
}

function runSavedLayout() {
  if (!cy || !cy.nodes().length) return;
  cy.layout({
    name: "preset",
    positions: (node) => savedPosition(node.data("entityId")),
    fit: true,
    padding: 46,
    animate: false,
  }).run();
  applySelection(true);
}

function buildGraph() {
  if (!graphRoot.value) return;
  cy?.destroy();
  cy = cytoscape({
    container: graphRoot.value,
    elements: cyElements(),
    style: cyStyles(),
    minZoom: 0.2,
    maxZoom: 5,
    wheelSensitivity: 0.7,
    pixelRatio: Math.max(2, Number(window.devicePixelRatio) || 1),
    motionBlur: false,
    textureOnViewport: false,
    boxSelectionEnabled: false,
    autoungrabify: false,
    selectionType: "single",
  });
  cy.on("tap", "node", (event) => {
    emit("select-element", { kind: "node", id: event.target.data("entityId") });
  });
  cy.on("tap", "edge", (event) => {
    emit("select-element", { kind: "relation", id: event.target.data("entityId") });
  });
  cy.on("tap", (event) => {
    if (event.target === cy) emit("select-element", { kind: "", id: "" });
  });
  cy.on("dragfree", "node", saveCurrentPositions);
  if (allVisibleNodesHaveSavedPositions()) runSavedLayout();
  else runAutomaticLayout();
}

function scheduleBuild() {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => nextTick(buildGraph), 80);
}

function fitGraph() {
  if (!cy?.elements().length) return;
  cy.animate({ fit: { eles: cy.elements(), padding: 40 } }, { duration: 220 });
}

function resetFilters() {
  query.value = "";
  layerFilter.value = "";
  relationFilter.value = "";
}

watch(
  () => [props.mapId, conceptMap.value, query.value, layerFilter.value, relationFilter.value],
  scheduleBuild,
  { immediate: true, flush: "post" },
);
watch(() => props.selectedElement, () => applySelection(false), { deep: true });

watch(graphRoot, (element) => {
  resizeObserver?.disconnect();
  if (!element) return;
  resizeObserver = new ResizeObserver(() => cy?.resize());
  resizeObserver.observe(element);
});

onBeforeUnmount(() => {
  window.clearTimeout(rebuildTimer);
  resizeObserver?.disconnect();
  cy?.destroy();
});
</script>

<template>
  <section class="concept-map-view technical-grid" :style="{ '--concept-map-color': accent }">
    <header class="concept-map-header">
      <div class="concept-map-heading">
        <AppIcon name="graph" :size="20" />
        <div>
          <div class="panel-label" :style="{ '--label-color': accent }">概念关系网</div>
          <h1>{{ displayTitle(conceptMap, "概念关系网") }}</h1>
        </div>
      </div>

      <div class="concept-map-filters">
        <label class="search-field">
          <AppIcon name="search" :size="13" />
          <input v-model="query" type="search" placeholder="检索概念或公式" aria-label="检索概念或公式" />
        </label>
        <select v-model="layerFilter" aria-label="筛选分组">
          <option value="">全部分组</option>
          <option v-for="layer in layers" :key="layer.id" :value="layer.id">
            {{ layer.titleLocale || layer.title || layer.id }}
          </option>
        </select>
        <select v-model="relationFilter" aria-label="筛选关系">
          <option value="">全部关系</option>
          <option v-for="type in conceptMap?.relationTypes || []" :key="type.id" :value="type.id">
            {{ type.labelLocale || type.label_locale || relationLocaleFallback[type.id] || type.label || type.id }}
          </option>
        </select>
        <button v-if="query || layerFilter || relationFilter" class="hud-button button-icon-only" type="button"
          title="清除筛选" aria-label="清除筛选" @click="resetFilters">
          <AppIcon name="x" />
        </button>
      </div>

      <div class="concept-map-actions">
        <span class="result-count">{{ filteredGraph.nodes.length }} 节点 / {{ filteredGraph.relations.length }} 关系</span>
        <button class="hud-button button-with-icon" type="button" :style="{ '--button-color': accent }"
          @click="fitGraph">
          <AppIcon name="fit-screen" /><span class="button-icon-label">适应窗口</span>
        </button>
        <button v-if="ownerNode" class="hud-button button-with-icon" type="button"
          :style="{ '--button-color': accent }" @click="$emit('open-scope', ownerNode.id, ownerNode.id)">
          <AppIcon name="graph" /><span class="button-icon-label">返回所属图谱</span>
        </button>
      </div>
    </header>

    <div v-if="conceptMap && filteredGraph.nodes.length" ref="graphRoot" class="concept-map-canvas"></div>
    <div v-else-if="conceptMap" class="concept-map-empty">
      <h2>没有符合筛选条件的节点</h2>
      <button class="hud-button" type="button" @click="resetFilters">清除筛选</button>
    </div>
    <div v-else class="concept-map-empty">
      <h2>未找到概念关系网</h2>
      <p>该关系网可能已从当前 Vault 中移除。</p>
    </div>
  </section>
</template>

<style scoped>
.concept-map-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--background-main);
}

.concept-map-header {
  display: grid;
  grid-template-columns: minmax(210px, auto) minmax(320px, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 66px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 10px 14px;
}

.concept-map-heading,
.concept-map-actions,
.concept-map-filters,
.search-field {
  display: flex;
  align-items: center;
}

.concept-map-heading {
  min-width: 0;
  gap: 10px;
  color: var(--concept-map-color);
}

.concept-map-heading h1 {
  overflow: hidden;
  max-width: 320px;
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.concept-map-filters {
  min-width: 0;
  gap: 8px;
}

.search-field {
  flex: 1 1 220px;
  min-width: 130px;
  height: 34px;
  gap: 8px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--concept-map-color);
  background: var(--background-main);
  color: var(--text-muted);
  padding: 0 9px;
}

.search-field:focus-within {
  border-color: var(--concept-map-color);
}

.search-field input,
.concept-map-filters select {
  min-width: 0;
  height: 32px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  background: var(--background-main);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-small);
}

.search-field input {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
}

.concept-map-filters select {
  flex: 0 1 150px;
  padding: 0 8px;
}

.concept-map-actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
}

.result-count {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  white-space: nowrap;
}

.concept-map-canvas {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  cursor: grab;
  background-color: var(--background-main);
  background-image:
    linear-gradient(rgba(237, 237, 237, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(237, 237, 237, 0.055) 1px, transparent 1px);
  background-size: 44px 44px;
}

.concept-map-canvas:active {
  cursor: grabbing;
}

.concept-map-empty {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--text-muted);
}

.concept-map-empty h2,
.concept-map-empty p {
  margin: 0;
}

@media (max-width: 1250px) {
  .concept-map-header {
    grid-template-columns: minmax(190px, auto) minmax(260px, 1fr);
  }

  .concept-map-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
