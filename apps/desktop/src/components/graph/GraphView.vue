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
import { getActiveVault } from "../../graph/graph-data-store.js";
import AppIcon from "../ui/AppIcon.vue";

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

function getVisualTracePoints(edge) {
  return getResolvedTracePoints(edge);
}

const COMPARE_TRACE_TRIM = 10;

function movePointToward(from, to, amount) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);

  if (!length) return [...from];

  const ratio = Math.min(amount / length, 0.48);
  return [from[0] + dx * ratio, from[1] + dy * ratio];
}

function trimCompareTracePoints(points) {
  if (!points || points.length < 2) return points;

  const nextPoints = points.map((point) => [...point]);
  const lastIndex = nextPoints.length - 1;

  nextPoints[0] = movePointToward(points[0], points[1], COMPARE_TRACE_TRIM);
  nextPoints[lastIndex] = movePointToward(points[lastIndex], points[lastIndex - 1], COMPARE_TRACE_TRIM);

  return nextPoints;
}

function compareBodyPath(edge) {
  return pointsToPath(trimCompareTracePoints(getVisualTracePoints(edge)));
}

function nodeHierarchyMarkerCount(node) {
  if (isDomainNode(node.id)) return 3;
  if (hasContainsChildren(node.id)) return 2;
  return 1;
}

function hasNodeNote(node) {
  const note = getActiveVault().notes?.[node.id];
  return Boolean(note?.markdown?.trim());
}

function traceMarkerStart(edge) {
  return relationTheme[edge.relation]?.direction === "both" ? `url(#trace-arrow-start-${edge.relation})` : "";
}

function traceMarkerEnd(edge) {
  const direction = relationTheme[edge.relation]?.direction;
  return direction === "forward" || direction === "both" ? `url(#trace-arrow-end-${edge.relation})` : "";
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
    <div ref="viewportRef" class="graph-viewport" :class="{ 'is-panning': isPanning }" @pointercancel="stopPanning"
      @pointerdown="handlePointerDown" @pointermove="handlePointerMove" @pointerup="stopPanning" @wheel="handleWheel">
      <div class="graph-board" :style="{
        width: `${board.width}px`,
        height: `${board.height}px`,
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
      }">
        <svg class="trace-layer" :height="board.height" :viewBox="`0 0 ${board.width} ${board.height}`"
          :width="board.width" aria-hidden="true">
          <defs>
            <marker v-for="relationKey in ['used-in', 'compares-with']" :id="`trace-arrow-end-${relationKey}`"
              :key="relationKey" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
              <path d="M 0 0 L 8 4 L 0 8 z" :fill="relationTheme[relationKey].color" />
            </marker>
            <marker id="trace-arrow-start-compares-with" markerHeight="8" markerWidth="8" orient="auto" refX="1"
              refY="4" viewBox="0 0 8 8">
              <path d="M 8 0 L 0 4 L 8 8 z" :fill="relationTheme['compares-with'].color" />
            </marker>
          </defs>

          <g v-for="edge in currentScope.edges" :key="edge.id">
            <path v-if="edge.relation !== 'compares-with' && getVisualTracePoints(edge)" class="trace" :class="[
              `trace--${edge.relation}`,
              {
                'is-active': isConnectedEdge(edge, focusNodeId),
                'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
              },
            ]" :d="pointsToPath(getVisualTracePoints(edge))" :marker-start="traceMarkerStart(edge)"
              :marker-end="traceMarkerEnd(edge)" :stroke="relationTheme[edge.relation].color"
              :stroke-dasharray="relationTheme[edge.relation].dash" />
            <path v-if="edge.relation === 'compares-with' && getVisualTracePoints(edge)"
              class="trace trace--compares-with trace--compare-outer" :class="{
                'is-active': isConnectedEdge(edge, focusNodeId),
                'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
              }" :d="compareBodyPath(edge)" :stroke="relationTheme[edge.relation].color" />
            <path v-if="edge.relation === 'compares-with' && getVisualTracePoints(edge)"
              class="trace trace--compare-cut" :class="{
                'is-active': isConnectedEdge(edge, focusNodeId),
                'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
              }" :d="compareBodyPath(edge)" />
            <path v-if="edge.relation === 'compares-with' && getVisualTracePoints(edge)"
              class="trace trace--compare-marker-carrier" :class="{
                'is-active': isConnectedEdge(edge, focusNodeId),
                'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
              }" :d="pointsToPath(getVisualTracePoints(edge))" marker-start="url(#trace-arrow-start-compares-with)"
              marker-end="url(#trace-arrow-end-compares-with)" />
          </g>
        </svg>

        <div class="node-layer">
          <button v-for="node in currentScope.nodes" :key="node.id" :class="[nodeClass(node.type), nodeState(node)]"
            :style="{
              '--node-color': getDomainColor(node.domain),
              left: `${getResolvedNodeLayout(node.id).x}px`,
              top: `${getResolvedNodeLayout(node.id).y}px`,
              width: `${getResolvedNodeLayout(node.id).width}px`,
              height: `${getResolvedNodeLayout(node.id).height}px`,
            }" @click="handleNodeClick(node)" @contextmenu="handleNodeContextMenu($event, node)"
            @dblclick="handleNodeOpen(node)" @mouseenter="hoveredNodeId = node.id" @mouseleave="hoveredNodeId = ''"
            @pointercancel="stopNodeDrag" @pointerdown="handleNodePointerDown($event, node)"
            @pointermove="handleNodePointerMove" @pointerup="stopNodeDrag">
            <span v-if="hasNodeNote(node)" class="node-note-badge" title="This node has a note"
              aria-label="This node has a note">
              <AppIcon name="file-text" :size="11" />
            </span>

            <span class="node-corner-markers" aria-hidden="true">
              <span v-for="index in nodeHierarchyMarkerCount(node)" :key="index" class="node-corner-marker"></span>
            </span>

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

.trace--compares-with {
  stroke-width: 6;
}

.trace--compare-cut {
  stroke: var(--background-main);
  stroke-width: 2;
  opacity: 1;
}

.trace--compare-cut.is-faded {
  opacity: 1;
}

.trace--compare-marker-carrier {
  stroke: transparent;
  stroke-width: 1;
  opacity: 1;
}

.trace--compare-marker-carrier.is-faded {
  opacity: 0.18;
}

.trace.is-active {
  opacity: 1;
  stroke-width: 3;
}

.trace--compare-outer.is-active {
  stroke-width: 7;
}

.trace--compare-cut.is-active {
  stroke-width: 2.4;
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

.node-corner-markers {
  position: absolute;
  right: 8px;
  top: 8px;
  display: flex;
  gap: 4px;
  align-items: center;
}

.node-corner-marker {
  width: 6px;
  height: 6px;
  background: var(--node-color);
}

.node-note-badge {
  position: absolute;
  left: 8px;
  top: 7px;
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border: 1px solid var(--node-color);
  background: var(--background-main);
  color: var(--node-color);
  line-height: 0;
}

.node-title {
  display: -webkit-box;
  overflow: hidden;
  max-width: 100%;
  color: var(--text-primary);
  font-size: var(--font-size-node-title);
  font-weight: 800;
  line-height: 1.16;
  text-align: center;
  text-transform: uppercase;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pcb-node--root .node-title {
  font-size: var(--font-size-node-title-root);
}

.node-meta {
  overflow: hidden;
  max-width: 100%;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-node-meta);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pcb-node.is-selected {
  z-index: 2;
  border: 2px solid var(--border-primary);
  outline: 1px solid var(--node-color);
  border-left-width: 5px;
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
