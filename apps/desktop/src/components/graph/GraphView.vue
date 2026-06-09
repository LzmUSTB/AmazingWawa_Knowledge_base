<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  clamp,
  fitCameraToBounds,
  getScopeBounds,
  GRAPH_CAMERA_LIMITS,
  zoomCameraAt,
} from "../../graph/graph-camera.js";
import { getConnectedNodeIds, isConnectedEdge } from "../../graph/graph-interactions.js";
import {
  getManualTracePoints,
  getNodeLayout,
  getGraphBoardSize,
  getTracePoints,
  pointsToPath,
} from "../../graph/graph-layout.js";
import { generateOrthogonalRoute } from "../../graph/graph-route-generator.js";
import { getGraphScope, hasContainsChildren, isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor, nodeClass, relationTheme } from "../../graph/graph-theme.js";

const props = defineProps({
  draftBoard: {
    type: Object,
    default: null,
  },
  draftMovedNodeIds: {
    type: Array,
    default: () => [],
  },
  isLayoutEditing: {
    type: Boolean,
    default: false,
  },
  selectedNodeId: {
    type: String,
    required: true,
  },
  scopeId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  "ensure-layout-draft",
  "layout-node-dragged",
  "open-note",
  "open-scope",
  "select-node",
]);

const viewportRef = ref(null);
const hoveredNodeId = ref("");
const isPanning = ref(false);
const panStart = ref({ pointerId: 0, x: 0, y: 0, cameraX: 0, cameraY: 0 });
const nodeDrag = ref(null);
const suppressNodeOpen = ref(false);
const camera = ref({ x: 0, y: 0, zoom: 1 });
let resizeObserver;
let resizeFitTimer = 0;
const currentScope = computed(() => getGraphScope(props.scopeId));
const board = computed(() => props.draftBoard || getGraphBoardSize(currentScope.value.id));
const boardGrid = computed(() => props.draftBoard?.grid || 32);
const movedNodeIds = computed(() => new Set(props.draftMovedNodeIds));
const scopeLabel = computed(() => {
  if (currentScope.value.type === "root") return "ROOT / DOMAIN LEVEL ONLY";
  if (currentScope.value.type === "domain") return "DOMAIN / DIRECT CHILDREN ONLY";
  return "FOCUS / ONE-HOP RELATIONS";
});
const focusNodeId = computed(() => hoveredNodeId.value || props.selectedNodeId);
const connectedIds = computed(() => getConnectedNodeIds(focusNodeId.value, currentScope.value.edges));
function nodeState(node) {
  return {
    "is-selected": node.id === props.selectedNodeId,
    "is-hovered": node.id === hoveredNodeId.value,
    "is-connected": connectedIds.value.has(node.id),
    "is-faded": focusNodeId.value && !connectedIds.value.has(node.id),
  };
}

function snapToGrid(value) {
  const grid = boardGrid.value || 32;
  return Math.round(value / grid) * grid;
}

function getResolvedNodeLayout(id) {
  return props.draftBoard?.nodes?.[id] || getNodeLayout(id, currentScope.value.id);
}

function getResolvedTracePoints(edge) {
  if (!props.draftBoard) return getTracePoints(edge.id, currentScope.value.id);

  const endpointMoved = movedNodeIds.value.has(edge.source) || movedNodeIds.value.has(edge.target);
  const manualRoute = endpointMoved ? null : getManualTracePoints(edge.id, currentScope.value.id);
  if (manualRoute) return manualRoute;

  const sourceBox = getResolvedNodeLayout(edge.source);
  const targetBox = getResolvedNodeLayout(edge.target);
  if (!sourceBox || !targetBox) return undefined;
  const routeIndex = Math.max(0, currentScope.value.edges.findIndex((item) => item.id === edge.id));
  return generateOrthogonalRoute(sourceBox, targetBox, { routeIndex });
}

function handleNodeClick(node) {
  if (suppressNodeOpen.value) {
    suppressNodeOpen.value = false;
    return;
  }
  emit("select-node", node.id);
}

function handleNodeOpen(node) {
  if (suppressNodeOpen.value) return;
  if (isDomainNode(node.id)) {
    emit("open-scope", node.id);
    return;
  }
  if (currentScope.value.type === "focus" && currentScope.value.centerNodeId === node.id) {
    emit("open-note", node.id);
    return;
  }
  if (hasContainsChildren(node.id)) {
    emit("open-scope", node.id);
    return;
  }
  emit("open-note", node.id);
}

function handleNodeContextMenu(event, node) {
  event.preventDefault();
  emit("select-node", node.id);
}

function handleNodePointerDown(event, node) {
  if (!(props.isLayoutEditing || (event.ctrlKey && event.button === 0))) return;
  event.preventDefault();
  event.stopPropagation();
  emit("ensure-layout-draft", currentScope.value.id);
  const startBox = getResolvedNodeLayout(node.id);
  nodeDrag.value = {
    pointerId: event.pointerId,
    nodeId: node.id,
    clientX: event.clientX,
    clientY: event.clientY,
    startX: startBox.x,
    startY: startBox.y,
    width: startBox.width,
    height: startBox.height,
  };
  suppressNodeOpen.value = true;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleNodePointerMove(event) {
  const drag = nodeDrag.value;
  if (!drag || event.pointerId !== drag.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  const deltaBoardX = (event.clientX - drag.clientX) / camera.value.zoom;
  const deltaBoardY = (event.clientY - drag.clientY) / camera.value.zoom;
  emit("layout-node-dragged", {
    nodeId: drag.nodeId,
    layout: {
      x: snapToGrid(drag.startX + deltaBoardX),
      y: snapToGrid(drag.startY + deltaBoardY),
      width: drag.width,
      height: drag.height,
    },
  });
}

function stopNodeDrag(event) {
  if (!nodeDrag.value || event.pointerId !== nodeDrag.value.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  nodeDrag.value = null;
}

function isInteractiveTarget(event) {
  return Boolean(event.target.closest("button, a, input, textarea, select"));
}

function fitCurrentScope() {
  if (!viewportRef.value) return;
  const bounds = getScopeBounds(currentScope.value.nodes, getResolvedNodeLayout);
  camera.value = fitCameraToBounds(viewportRef.value, bounds, {
    margin: 160,
    minZoom: GRAPH_CAMERA_LIMITS.minZoom,
    maxZoom: 1.4,
  });
}

function scheduleFitCurrentScope(delay = 150) {
  window.clearTimeout(resizeFitTimer);
  resizeFitTimer = window.setTimeout(() => {
    if (!isPanning.value) fitCurrentScope();
  }, delay);
}

function handlePointerDown(event) {
  if (isInteractiveTarget(event)) return;
  isPanning.value = true;
  panStart.value = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    cameraX: camera.value.x,
    cameraY: camera.value.y,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!isPanning.value || event.pointerId !== panStart.value.pointerId) return;
  camera.value = {
    ...camera.value,
    x: panStart.value.cameraX + event.clientX - panStart.value.x,
    y: panStart.value.cameraY + event.clientY - panStart.value.y,
  };
}

function stopPanning(event) {
  if (event?.pointerId && event.pointerId !== panStart.value.pointerId) return;
  isPanning.value = false;
}

function handleWheel(event) {
  if (event.ctrlKey) return;
  event.preventDefault();
  if (!viewportRef.value) return;
  const factor = event.deltaY > 0 ? 1 / 1.12 : 1.12;
  const nextZoom = clamp(
    camera.value.zoom * factor,
    GRAPH_CAMERA_LIMITS.minZoom,
    GRAPH_CAMERA_LIMITS.maxZoom,
  );
  camera.value = zoomCameraAt(
    camera.value,
    event.clientX,
    event.clientY,
    viewportRef.value,
    nextZoom,
  );
}

onMounted(() => {
  nextTick(fitCurrentScope);
  requestAnimationFrame(() => requestAnimationFrame(fitCurrentScope));
  window.setTimeout(fitCurrentScope, 250);
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => scheduleFitCurrentScope());
    resizeObserver.observe(viewportRef.value);
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(resizeFitTimer);
  resizeObserver?.disconnect();
});

watch(
  () => props.scopeId,
  () => nextTick(fitCurrentScope),
);

defineExpose({ fitCurrentScope, scheduleFitCurrentScope });
</script>

<template>
  <section class="graph-view technical-grid">
    <div
      ref="viewportRef"
      class="graph-viewport"
      :class="{ 'is-panning': isPanning }"
      @pointercancel="stopPanning"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="stopPanning"
      @wheel="handleWheel"
    >
      <div
        class="graph-board"
        :style="{
          width: `${board.width}px`,
          height: `${board.height}px`,
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }"
      >
        <svg
          class="trace-layer"
          :height="board.height"
          :viewBox="`0 0 ${board.width} ${board.height}`"
          :width="board.width"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="trace-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
            </marker>
          </defs>

          <g v-for="edge in currentScope.edges" :key="edge.id">
            <path
              v-if="getResolvedTracePoints(edge)"
              class="trace"
              :class="[
                `trace--${edge.relation}`,
                {
                  'is-active': isConnectedEdge(edge, focusNodeId),
                  'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
                },
              ]"
              :d="pointsToPath(getResolvedTracePoints(edge))"
              :marker-end="edge.relation === 'depends-on' ? 'url(#trace-arrow)' : ''"
              :stroke="relationTheme[edge.relation].color"
              :stroke-dasharray="relationTheme[edge.relation].dash"
            />
            <path
              v-if="edge.relation === 'compares-with' && getResolvedTracePoints(edge)"
              class="trace trace--paired"
              :class="{ 'is-active': isConnectedEdge(edge, focusNodeId) }"
              :d="pointsToPath(getResolvedTracePoints(edge).map(([x, y]) => [x + 7, y + 7]))"
              :stroke="relationTheme[edge.relation].color"
              stroke-dasharray="3 5"
            />
          </g>
        </svg>

        <div class="node-layer">
          <button
            v-for="node in currentScope.nodes"
            :key="node.id"
            :class="[nodeClass(node.type), nodeState(node)]"
            :style="{
              '--node-color': getDomainColor(node.domain),
              left: `${getResolvedNodeLayout(node.id).x}px`,
              top: `${getResolvedNodeLayout(node.id).y}px`,
              width: `${getResolvedNodeLayout(node.id).width}px`,
              height: `${getResolvedNodeLayout(node.id).height}px`,
            }"
            @click="handleNodeClick(node)"
            @contextmenu="handleNodeContextMenu($event, node)"
            @dblclick="handleNodeOpen(node)"
            @mouseenter="hoveredNodeId = node.id"
            @mouseleave="hoveredNodeId = ''"
            @pointercancel="stopNodeDrag"
            @pointerdown="handleNodePointerDown($event, node)"
            @pointermove="handleNodePointerMove"
            @pointerup="stopNodeDrag"
          >
            <span class="node-port node-port--top"></span>
            <span class="node-port node-port--right"></span>
            <span class="node-port node-port--bottom"></span>
            <span class="node-port node-port--left"></span>
            <span class="node-pin"></span>
            <span class="node-title">{{ node.title }}</span>
            <span class="node-meta">{{ node.type }} / {{ node.domain }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="routing-label routing-label--a">
      {{ isLayoutEditing ? "LAYOUT EDIT / GRID SNAP" : scopeLabel }}
    </div>
  </section>
</template>

<style scoped>
.graph-view {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border-primary);
}

.graph-viewport {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  overflow: hidden;
  touch-action: none;
}

.graph-viewport.is-panning {
  cursor: grabbing;
}

.graph-board {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}

.trace-layer,
.node-layer {
  position: absolute;
  left: 0;
  top: 0;
}

.node-layer {
  width: 100%;
  height: 100%;
}

.trace-layer {
  color: var(--relation-depends-on);
}

.trace {
  fill: none;
  opacity: 0.72;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.trace--contains {
  stroke-width: 1.5;
}

.trace--depends-on {
  stroke-width: 2.4;
}

.trace--used-in {
  stroke-width: 1.8;
}

.trace--compares-with,
.trace--paired {
  stroke-width: 1.6;
}

.trace.is-active {
  opacity: 1;
  stroke-width: 3;
}

.trace.is-faded {
  opacity: 0.18;
}

.pcb-node {
  position: absolute;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: center;
  justify-items: center;
  border: 1px solid var(--node-color);
  border-left-width: 5px;
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  opacity: 1;
  padding: 10px 12px 8px 17px;
  transition:
    border-color 150ms ease,
    opacity 150ms ease,
    outline-color 150ms ease,
    transform 150ms ease;
}

.node-port {
  position: absolute;
  background: var(--node-color);
}

.node-port--left,
.node-port--right {
  width: 12px;
  height: 3px;
}

.node-port--left {
  left: -12px;
  top: 50%;
}

.node-port--right {
  right: -12px;
  top: 50%;
}

.node-port--top,
.node-port--bottom {
  left: 50%;
  width: 3px;
  height: 12px;
}

.node-port--top {
  top: -12px;
}

.node-port--bottom {
  bottom: -12px;
}

.pcb-node--root {
  border-color: var(--border-primary);
  outline: 1px solid var(--node-color);
  outline-offset: -5px;
}

.pcb-node--domain {
  min-width: 150px;
}

.pcb-node--concept {
  padding-inline: 13px;
}

.node-pin {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 6px;
  height: 6px;
  background: var(--node-color);
}

.node-title {
  display: -webkit-box;
  overflow: hidden;
  max-width: 100%;
  color: var(--text-primary);
  font-size: var(--font-size-mono);
  font-weight: 800;
  line-height: 1.16;
  text-align: center;
  text-transform: uppercase;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pcb-node--root .node-title {
  font-size: calc(16px * var(--ui-font-scale));
}

.node-meta {
  overflow: hidden;
  max-width: 100%;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pcb-node.is-selected {
  z-index: 2;
  border: 2px solid var(--border-primary);
  outline: 1px solid var(--node-color);
  outline-offset: 5px;
  transform: translateY(-1px);
}

.pcb-node.is-hovered {
  border-color: var(--border-primary);
}

.pcb-node.is-faded {
  opacity: 0.28;
}

.routing-label {
  position: absolute;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.routing-label--a {
  left: 24px;
  bottom: 24px;
}
</style>
