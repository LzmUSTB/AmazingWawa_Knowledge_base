<script setup>
import { computed, ref, watch } from "vue";

const ALLOWED_LAYOUT_TYPES = new Set(["split-panel", "stack", "grid"]);
const ALLOWED_PANEL_TYPES = new Set(["svg-scene", "inspector"]);
const ALLOWED_ELEMENT_TYPES = new Set(["node", "edge", "arrow", "label", "badge", "formula-callout", "rect", "line", "text", "circle"]);
const ALLOWED_INTERACTIONS = new Set(["select", "highlight-related"]);

const props = defineProps({ block: { type: Object, required: true } });

const selectedId = ref("");
const definition = computed(() => props.block.definition || {});
const data = computed(() => props.block.data || {});
const layout = computed(() => definition.value.renderer?.layout || { type: "split-panel" });
const scenes = computed(() => definition.value.visualGrammar?.scenes || {});
const scene = computed(() => {
  const sceneName = layout.value.scene || layout.value.left?.scene || Object.keys(scenes.value)[0];
  return scenes.value[sceneName] || Object.values(scenes.value)[0] || fallbackScene();
});
const sceneElements = computed(() => expandElements(scene.value.elements || []));
const supportedElements = computed(() => sceneElements.value.filter((element) => ALLOWED_ELEMENT_TYPES.has(element.type)));
const unsupportedElements = computed(() => sceneElements.value.filter((element) => !ALLOWED_ELEMENT_TYPES.has(element.type)));
const nodesById = computed(() => new Map(supportedElements.value.filter((item) => item.type === "node").map((item) => [item.id, item])));
const selectedElement = computed(() => supportedElements.value.find((element) => element.id === selectedId.value) || null);
const interactions = computed(() => asArray(definition.value.interactions).map((interaction) => (typeof interaction === "string" ? interaction : interaction?.type)).filter(Boolean));
const selectable = computed(() => interactions.value.includes("select"));
const panelList = computed(() => Array.isArray(layout.value.panels) ? layout.value.panels : layout.value.type === "stack" ? [layout.value.panel || { type: "svg-scene" }] : [layout.value.left || { type: "svg-scene" }, layout.value.right || { type: "inspector" }]);
const warnings = computed(() => {
  const messages = [];
  if (!ALLOWED_LAYOUT_TYPES.has(layout.value.type)) messages.push("Unsupported declarative layout.");
  panelList.value.forEach((panel) => { if (panel.type && !ALLOWED_PANEL_TYPES.has(panel.type)) messages.push(`Unsupported panel type: ${panel.type}`); });
  if (scene.value.coordinateSystem && scene.value.coordinateSystem !== "normalized-2d") messages.push(`Unsupported coordinate system: ${scene.value.coordinateSystem}`);
  unsupportedElements.value.forEach((element) => messages.push(`Unsupported element ignored: ${element.type || "unknown"}`));
  interactions.value.filter((interaction) => !ALLOWED_INTERACTIONS.has(interaction)).forEach((interaction) => messages.push(`Unsupported interaction ignored: ${interaction}`));
  return [...new Set([...(definition.value.warnings || []), ...messages])];
});
const markerId = computed(() => `generic-arrow-${props.block.sourceType || props.block.type}`);

watch(supportedElements, (elements) => {
  if (!selectable.value || selectedId.value) return;
  selectedId.value = elements.find((element) => element.type === "node")?.id || "";
}, { immediate: true });

function fallbackScene() { return { coordinateSystem: "normalized-2d", elements: [{ type: "label", id: "empty", text: "No visual scene", x: 0.5, y: 0.5 }] }; }
function asArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function resolvePath(path, scope = data.value) { if (typeof path !== "string" || !path.startsWith("$.")) return path; return path.slice(2).split(".").filter(Boolean).reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), scope); }
function displayValue(value, scope) { const resolved = resolvePath(value, scope); if (resolved === null || resolved === undefined) return ""; if (Array.isArray(resolved)) return resolved.map((item) => displayValue(item, scope)).filter(Boolean).join(", "); if (typeof resolved === "object") return resolved.label || resolved.title || resolved.name || resolved.id || ""; return String(resolved); }
function numericValue(value, scope, fallback = 0) { const resolved = resolvePath(value, scope); const numberValue = Number(resolved); return Number.isFinite(numberValue) ? numberValue : fallback; }
function expandElements(elements) { return asArray(elements).flatMap((element, index) => { const collection = resolvePath(element.each || element.dataPath || element.repeat); if (!Array.isArray(collection)) return [normalizeElement(element, data.value, index)]; return collection.map((item, itemIndex) => normalizeElement(element.template || element, item, itemIndex)); }); }
function normalizeElement(element, scope, index) { const id = displayValue(element.id || element.key || `element-${index}`, scope); return { ...element, id, type: element.type || "label", label: displayValue(element.label || element.title || id, scope), description: displayValue(element.description || element.summary || element.detail || "", scope), from: displayValue(element.from, scope), to: displayValue(element.to, scope), text: displayValue(element.text || element.formula || element.value || element.label || "", scope), x: numericValue(element.x ?? element.position?.x, scope, 0.5), y: numericValue(element.y ?? element.position?.y, scope, 0.5), x1: numericValue(element.x1 ?? element.fromX, scope, 0), y1: numericValue(element.y1 ?? element.fromY, scope, 0), x2: numericValue(element.x2 ?? element.toX, scope, 1), y2: numericValue(element.y2 ?? element.toY, scope, 1), width: numericValue(element.width ?? element.w, scope, 0.18), height: numericValue(element.height ?? element.h, scope, 0.1), radius: numericValue(element.radius ?? element.r, scope, 0.04), tone: displayValue(element.tone || element.color || "", scope) }; }
function svgX(value) { return Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 1000); }
function svgY(value) { return Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 560); }
function elementWidth(element, min = 1) { return Math.max(min, Math.round((Number(element.width) || 0.18) * 1000)); }
function elementHeight(element, min = 1) { return Math.max(min, Math.round((Number(element.height) || 0.1) * 560)); }
function rectBox(element, centered = false) { const width = elementWidth(element, element.type === "rect" ? 1 : 84); const height = elementHeight(element, element.type === "rect" ? 1 : 42); const x = svgX(element.x); const y = svgY(element.y); return { x: centered ? x - width / 2 : x, y: centered ? y - height / 2 : y, width, height }; }
function nodeBox(node) { return rectBox(node, true); }
function edgePoint(id, side = "center") { const node = nodesById.value.get(id); if (!node) return { x: 0, y: 0 }; const box = nodeBox(node); if (side === "left") return { x: box.x, y: box.y + box.height / 2 }; if (side === "right") return { x: box.x + box.width, y: box.y + box.height / 2 }; if (side === "top") return { x: box.x + box.width / 2, y: box.y }; if (side === "bottom") return { x: box.x + box.width / 2, y: box.y + box.height }; return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; }
function explicitPoint(element, prefix) { return prefix === "from" ? { x: svgX(element.x1), y: svgY(element.y1) } : { x: svgX(element.x2), y: svgY(element.y2) }; }
function edgePath(element) { const hasNodes = element.from && element.to; const from = hasNodes ? edgePoint(element.from, element.fromSide || "right") : explicitPoint(element, "from"); const to = hasNodes ? edgePoint(element.to, element.toSide || "left") : explicitPoint(element, "to"); if (!Number.isFinite(from.x) || !Number.isFinite(from.y) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return ""; if (element.curve === "straight" || !hasNodes) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`; const midX = Math.round((from.x + to.x) / 2); return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`; }
function selectElement(element) { if (!selectable.value || element.type !== "node") return; selectedId.value = element.id; }
function toneClass(element) { return element.tone ? `tone-${String(element.tone).replace(/[^a-z0-9_-]/gi, "")}` : ""; }
</script>

<template>
  <section class="content-block generic-visual-block">
    <div class="generic-header"><div><div class="block-kicker">{{ block.sourceType }}</div><h3>{{ definition.title || definition.name || block.sourceType }}</h3></div><span class="block-kind">declarative visual</span></div>
    <div v-if="!ALLOWED_LAYOUT_TYPES.has(layout.type)" class="unsupported-panel">Unsupported declarative layout</div>
    <div v-else class="generic-layout" :class="`generic-layout--${layout.type}`">
      <div class="scene-panel">
        <svg class="scene-svg" viewBox="0 0 1000 560" role="img" :aria-label="definition.title || block.sourceType">
          <defs><marker :id="markerId" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" class="marker-fill" /></marker></defs>
          <template v-for="element in supportedElements" :key="element.id || `${element.type}-${element.label}`">
            <path v-if="element.type === 'edge' || element.type === 'arrow'" class="scene-edge" :class="[{ 'scene-edge--arrow': element.type === 'arrow' }, toneClass(element)]" :d="edgePath(element)" :marker-end="element.type === 'arrow' ? `url(#${markerId})` : undefined" />
            <line v-else-if="element.type === 'line'" class="scene-line" :class="toneClass(element)" :x1="svgX(element.x1)" :y1="svgY(element.y1)" :x2="svgX(element.x2)" :y2="svgY(element.y2)" />
            <rect v-else-if="element.type === 'rect'" class="scene-rect" :class="toneClass(element)" :x="rectBox(element).x" :y="rectBox(element).y" :width="rectBox(element).width" :height="rectBox(element).height" />
            <circle v-else-if="element.type === 'circle'" class="scene-circle" :class="toneClass(element)" :cx="svgX(element.x)" :cy="svgY(element.y)" :r="Math.max(4, element.radius * 560)" />
            <g v-else-if="element.type === 'node'" class="scene-node" :class="[{ 'is-selected': selectedId === element.id }, toneClass(element)]" tabindex="0" role="button" @click="selectElement(element)" @keydown.enter.prevent="selectElement(element)"><rect :x="nodeBox(element).x" :y="nodeBox(element).y" :width="nodeBox(element).width" :height="nodeBox(element).height" /><text :x="svgX(element.x)" :y="svgY(element.y)" text-anchor="middle" dominant-baseline="middle">{{ element.label }}</text></g>
            <text v-else-if="element.type === 'label' || element.type === 'text'" class="scene-label" :class="toneClass(element)" :x="svgX(element.x)" :y="svgY(element.y)">{{ element.text || element.label }}</text>
            <g v-else-if="element.type === 'badge' || element.type === 'formula-callout'" class="scene-badge" :class="toneClass(element)"><rect :x="svgX(element.x) - elementWidth(element, 160) / 2" :y="svgY(element.y) - elementHeight(element, 40) / 2" :width="elementWidth(element, 160)" :height="elementHeight(element, 40)" /><text :x="svgX(element.x)" :y="svgY(element.y)" text-anchor="middle" dominant-baseline="middle">{{ element.text || element.label }}</text></g>
          </template>
        </svg>
      </div>
      <aside class="inspector-panel"><template v-if="selectedElement"><div class="block-kicker">Inspector</div><h4>{{ selectedElement.label }}</h4><p>{{ selectedElement.description || "No description provided." }}</p><dl><div><dt>ID</dt><dd>{{ selectedElement.id }}</dd></div><div><dt>Type</dt><dd>{{ selectedElement.type }}</dd></div></dl></template><template v-else><div class="block-kicker">Inspector</div><p>Select an item</p></template></aside>
    </div>
    <div v-if="warnings.length" class="warning-panel"><strong>Warnings</strong><ul><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul></div>
  </section>
</template>

<style scoped>
.generic-visual-block { gap: 14px; }
.generic-header { display: flex; align-items: start; justify-content: space-between; gap: 14px; }
.block-kind { border: 1px solid var(--border-muted); color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; padding: 5px 8px; text-transform: uppercase; }
.generic-layout { display: grid; gap: 12px; }
.generic-layout--split-panel { grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr); }
.generic-layout--grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.scene-panel, .inspector-panel, .unsupported-panel, .warning-panel { border: 1px solid var(--border-muted); background: var(--background-main); }
.scene-panel { overflow-x: auto; }
.scene-svg { display: block; width: max(100%, 720px); min-height: 320px; }
.scene-edge, .scene-line { fill: none; stroke: var(--text-secondary); stroke-width: 3; vector-effect: non-scaling-stroke; }
.scene-edge--arrow, .scene-line.tone-accent, .scene-edge.tone-accent { stroke: var(--note-color, var(--graphics)); }
.marker-fill { fill: var(--note-color, var(--graphics)); }
.scene-rect, .scene-circle { fill: rgba(237, 237, 237, 0.04); stroke: var(--border-muted); stroke-width: 2; }
.scene-rect.tone-accent, .scene-circle.tone-accent { stroke: var(--note-color, var(--graphics)); }
.scene-node rect, .scene-badge rect { fill: var(--background-panel); stroke: var(--border-primary); stroke-width: 2; }
.scene-node.is-selected rect { stroke: var(--note-color, var(--graphics)); stroke-width: 4; }
.scene-node { cursor: pointer; }
.scene-node text, .scene-label, .scene-badge text { fill: var(--text-primary); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: calc(17px * var(--ui-font-scale)); font-weight: 800; pointer-events: none; }
.scene-label { fill: var(--text-secondary); font-size: calc(15px * var(--ui-font-scale)); }
.scene-label.tone-muted { fill: var(--text-muted); }
.inspector-panel, .unsupported-panel, .warning-panel { display: grid; align-content: start; gap: 10px; color: var(--text-secondary); font-size: var(--font-size-ui); line-height: 1.55; padding: 14px; }
.inspector-panel h4, .warning-panel strong { margin: 0; color: var(--text-primary); font-size: var(--font-size-ui); text-transform: uppercase; }
.inspector-panel p, .warning-panel ul { margin: 0; }
.inspector-panel dl { display: grid; gap: 8px; margin: 0; }
.inspector-panel dl > div { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px; }
.inspector-panel dt { color: var(--text-muted); font-weight: 800; text-transform: uppercase; }
.inspector-panel dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.warning-panel { border-color: var(--career); }
@media (max-width: 900px) { .generic-layout--split-panel { grid-template-columns: 1fr; } }
</style>
