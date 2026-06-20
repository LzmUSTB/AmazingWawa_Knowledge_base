<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  clamp,
  fitCameraToBounds,
  getScopeBounds,
  GRAPH_CAMERA_LIMITS,
  screenToWorld,
  zoomCameraAt,
} from "../../graph/graph-camera.js";
import { getConnectedNodeIds, isConnectedEdge } from "../../graph/graph-interactions.js";
import {
  getManualTracePoints,
  getBoardStages,
  getNodeLayout,
  getGraphBoardSize,
  getStageLayout,
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
  stageCreateMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "ensure-layout-draft",
  "layout-node-dragged",
  "open-note",
  "open-scope",
  "select-node",
  "stage-created",
  "stage-deleted",
  "stage-layout-changed",
  "stage-meta-changed",
  "stop-stage-create",
]);

const viewportRef = ref(null);
const hoveredNodeId = ref("");
const isPanning = ref(false);
const panStart = ref({ pointerId: 0, x: 0, y: 0, cameraX: 0, cameraY: 0 });
const nodeDrag = ref(null);
const stageInteraction = ref(null);
const stageCreate = ref(null);
const suppressNodeOpen = ref(false);
const camera = ref({ x: 0, y: 0, zoom: 1 });
let resizeObserver;
let resizeFitTimer = 0;
const currentScope = computed(() => getGraphScope(props.scopeId));
const board = computed(() => props.draftBoard || getGraphBoardSize(currentScope.value.id));
const boardGrid = computed(() => props.draftBoard?.grid || 32);
const stages = computed(() => getBoardStages(currentScope.value.id, props.draftBoard));
const movedNodeIds = computed(() => new Set(props.draftMovedNodeIds));
const externalNodeIds = computed(() => new Set(currentScope.value.externalNodeIds || []));
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
    "is-external": externalNodeIds.value.has(node.id),
  };
}

function snapToGrid(value) {
  const grid = boardGrid.value || 32;
  return Math.round(value / grid) * grid;
}

function boardPoint(event) {
  if (!viewportRef.value) return { x: 0, y: 0 };
  const point = screenToWorld(event.clientX, event.clientY, viewportRef.value, camera.value);
  return {
    x: clamp(point.x, 0, board.value.width),
    y: clamp(point.y, 0, board.value.height),
  };
}

function stageStyle(stage) {
  const box = getStageLayout(stage);
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}

function stageOrderLabel(stage) {
  return String(Number(stage.order) || 0).padStart(2, "0");
}

function normalizedStageRect(start, end) {
  const left = snapToGrid(Math.min(start.x, end.x));
  const top = snapToGrid(Math.min(start.y, end.y));
  const right = snapToGrid(Math.max(start.x, end.x));
  const bottom = snapToGrid(Math.max(start.y, end.y));
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

const stageCreateRect = computed(() => {
  if (!stageCreate.value) return null;
  return normalizedStageRect(stageCreate.value.start, stageCreate.value.current);
});

function beginStageCreate(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  emit("ensure-layout-draft", currentScope.value.id);
  const point = boardPoint(event);
  stageCreate.value = {
    pointerId: event.pointerId,
    start: point,
    current: point,
    toolbarMode: props.stageCreateMode,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function nextStageIdentity() {
  const usedIds = new Set(stages.value.map((stage) => stage.id));
  const order = Math.max(0, ...stages.value.map((stage) => Number(stage.order) || 0)) + 1;
  const prefix = `${currentScope.value.id}-stage`;
  let sequence = order;
  let id = `${prefix}-${String(sequence).padStart(2, "0")}`;
  while (usedIds.has(id)) {
    sequence += 1;
    id = `${prefix}-${String(sequence).padStart(2, "0")}`;
  }
  return { id, order };
}

function finishStageCreate(event) {
  const creation = stageCreate.value;
  if (!creation || event.pointerId !== creation.pointerId) return false;
  event.preventDefault();
  event.stopPropagation();
  const rect = normalizedStageRect(creation.start, creation.current);
  stageCreate.value = null;
  if (creation.toolbarMode) emit("stop-stage-create");
  if (rect.width < 120 || rect.height < 80) return true;
  const identity = nextStageIdentity();
  emit("stage-created", {
    stage: {
      ...identity,
      title: `Stage ${stageOrderLabel(identity)}`,
      comment: "",
      ...rect,
      flow: "free",
    },
  });
  return true;
}

function beginStageMove(event, stage) {
  if (!props.isLayoutEditing || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const box = getStageLayout(stage);
  stageInteraction.value = {
    mode: "move",
    pointerId: event.pointerId,
    stageId: stage.id,
    clientX: event.clientX,
    clientY: event.clientY,
    startBox: box,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function beginStageResize(event, stage) {
  if (!props.isLayoutEditing || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  stageInteraction.value = {
    mode: "resize",
    pointerId: event.pointerId,
    stageId: stage.id,
    clientX: event.clientX,
    clientY: event.clientY,
    startBox: getStageLayout(stage),
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function updateStageInteraction(event) {
  const interaction = stageInteraction.value;
  if (!interaction || event.pointerId !== interaction.pointerId) return false;
  event.preventDefault();
  event.stopPropagation();
  const deltaX = (event.clientX - interaction.clientX) / camera.value.zoom;
  const deltaY = (event.clientY - interaction.clientY) / camera.value.zoom;
  const start = interaction.startBox;
  let layout;
  if (interaction.mode === "resize") {
    layout = {
      x: start.x,
      y: start.y,
      width: clamp(snapToGrid(start.width + deltaX), 120, Math.max(120, board.value.width - start.x)),
      height: clamp(snapToGrid(start.height + deltaY), 80, Math.max(80, board.value.height - start.y)),
    };
  } else {
    const visibleGrip = Math.max(16, boardGrid.value || 32);
    layout = {
      x: clamp(snapToGrid(start.x + deltaX), -start.width + visibleGrip, board.value.width - visibleGrip),
      y: clamp(snapToGrid(start.y + deltaY), -start.height + visibleGrip, board.value.height - visibleGrip),
      width: start.width,
      height: start.height,
    };
  }
  emit("stage-layout-changed", { stageId: interaction.stageId, layout });
  return true;
}

function stopStageInteraction(event) {
  if (!stageInteraction.value || event.pointerId !== stageInteraction.value.pointerId) return false;
  event.preventDefault();
  event.stopPropagation();
  stageInteraction.value = null;
  return true;
}

function editStage(stage) {
  if (!props.isLayoutEditing) return;
  const title = window.prompt("Stage title", stage.title || "");
  if (title === null) return;
  const comment = window.prompt("Stage comment", stage.comment || "");
  if (comment === null) return;
  const orderInput = window.prompt("Stage order", String(Number(stage.order) || 1));
  if (orderInput === null) return;
  const order = Number(orderInput);
  emit("stage-meta-changed", {
    stageId: stage.id,
    patch: {
      title: title.trim() || stage.title || "Stage",
      comment: comment.trim(),
      order: Number.isFinite(order) ? order : Number(stage.order) || 1,
    },
  });
}

function deleteStage(stage) {
  if (!props.isLayoutEditing) return;
  if (!window.confirm(`Delete stage "${stage.title || stage.id}"?`)) return;
  emit("stage-deleted", stage.id);
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

const COMPARE_TRACE_TRIM = 10;
const TRACE_NODE_GAP = 0;
const TRACE_ARROW_GAP = 0;

function expandedBox(box, margin) {
  return {
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  };
}

function pointInsideBox(point, box) {
  return (
    point[0] >= box.x &&
    point[0] <= box.x + box.width &&
    point[1] >= box.y &&
    point[1] <= box.y + box.height
  );
}

function lerpPoint(from, to, ratio) {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
  ];
}

function findBoxExitPoint(from, to, box) {
  let low = 0;
  let high = 1;

  for (let index = 0; index < 18; index += 1) {
    const middle = (low + high) / 2;
    if (pointInsideBox(lerpPoint(from, to, middle), box)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return lerpPoint(from, to, high).map((value) => Number(value.toFixed(2)));
}

function trimStartFromBox(points, box, margin) {
  if (!box || !points || points.length < 2) return points;
  const clippingBox = expandedBox(box, margin);
  if (!pointInsideBox(points[0], clippingBox)) return points;

  for (let index = 1; index < points.length; index += 1) {
    if (!pointInsideBox(points[index], clippingBox)) {
      return [
        findBoxExitPoint(points[index - 1], points[index], clippingBox),
        ...points.slice(index),
      ];
    }
  }

  return [movePointToward(points[0], points[1], margin), ...points.slice(1)];
}

function trimEndFromBox(points, box, margin) {
  if (!box || !points || points.length < 2) return points;
  const clippingBox = expandedBox(box, margin);
  const lastIndex = points.length - 1;
  if (!pointInsideBox(points[lastIndex], clippingBox)) return points;

  for (let index = lastIndex - 1; index >= 0; index -= 1) {
    if (!pointInsideBox(points[index], clippingBox)) {
      return [
        ...points.slice(0, index + 1),
        findBoxExitPoint(points[index + 1], points[index], clippingBox),
      ];
    }
  }

  return [...points.slice(0, lastIndex), movePointToward(points[lastIndex], points[lastIndex - 1], margin)];
}

function removeAdjacentDuplicatePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return point[0] !== previous[0] || point[1] !== previous[1];
  });
}

function endpointGap(edge, endpoint) {
  const direction = relationTheme[edge.relation]?.direction;
  if (endpoint === "source" && direction === "both") return TRACE_ARROW_GAP;
  if (endpoint === "target" && (direction === "forward" || direction === "both")) return TRACE_ARROW_GAP;
  return TRACE_NODE_GAP;
}

function getVisualTracePoints(edge) {
  const points = getResolvedTracePoints(edge);
  if (!points?.length) return points;

  const sourceBox = getResolvedNodeLayout(edge.source);
  const targetBox = getResolvedNodeLayout(edge.target);
  const trimmedStart = trimStartFromBox(points, sourceBox, endpointGap(edge, "source"));
  const trimmedEnd = trimEndFromBox(trimmedStart, targetBox, endpointGap(edge, "target"));

  return removeAdjacentDuplicatePoints(trimmedEnd);
}

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
  return Boolean(note?.markdown?.trim() || note?.html?.trim());
}

function nodeDisplayTitle(node) {
  return node?.titleLocale || node?.title || node?.id || "";
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
  return Boolean(event.target.closest("button, a, input, textarea, select, .learning-stage"));
}

function fitCurrentScope() {
  if (!viewportRef.value) return;
  const nodeBounds = getScopeBounds(currentScope.value.nodes, getResolvedNodeLayout);
  const stageBoxes = stages.value.map(getStageLayout);
  const bounds = stageBoxes.length
    ? {
        x: Math.min(nodeBounds.x, ...stageBoxes.map((stage) => stage.x)),
        y: Math.min(nodeBounds.y, ...stageBoxes.map((stage) => stage.y)),
        width: Math.max(nodeBounds.x + nodeBounds.width, ...stageBoxes.map((stage) => stage.x + stage.width)) -
          Math.min(nodeBounds.x, ...stageBoxes.map((stage) => stage.x)),
        height: Math.max(nodeBounds.y + nodeBounds.height, ...stageBoxes.map((stage) => stage.y + stage.height)) -
          Math.min(nodeBounds.y, ...stageBoxes.map((stage) => stage.y)),
      }
    : nodeBounds;
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
  if ((props.stageCreateMode || event.shiftKey) && event.button === 0) {
    beginStageCreate(event);
    return;
  }
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
  if (stageCreate.value && event.pointerId === stageCreate.value.pointerId) {
    event.preventDefault();
    event.stopPropagation();
    stageCreate.value = { ...stageCreate.value, current: boardPoint(event) };
    return;
  }
  if (updateStageInteraction(event)) return;
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

function handlePointerUp(event) {
  if (finishStageCreate(event)) return;
  if (stopStageInteraction(event)) return;
  stopPanning(event);
}

function handlePointerCancel(event) {
  if (stageCreate.value?.pointerId === event.pointerId) {
    const toolbarMode = stageCreate.value.toolbarMode;
    stageCreate.value = null;
    if (toolbarMode) emit("stop-stage-create");
  }
  if (stageInteraction.value?.pointerId === event.pointerId) stageInteraction.value = null;
  stopPanning(event);
}

function handleStageKeydown(event) {
  if (event.key !== "Escape" || (!stageCreate.value && !props.stageCreateMode)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  stageCreate.value = null;
  emit("stop-stage-create");
}

function handleWheel(event) {
  if (event.ctrlKey) return;
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
  window.addEventListener("keydown", handleStageKeydown);
  nextTick(fitCurrentScope);
  requestAnimationFrame(() => requestAnimationFrame(fitCurrentScope));
  window.setTimeout(fitCurrentScope, 250);
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => scheduleFitCurrentScope());
    resizeObserver.observe(viewportRef.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleStageKeydown);
  window.clearTimeout(resizeFitTimer);
  resizeObserver?.disconnect();
});

watch(
  () => props.scopeId,
  () => {
    stageCreate.value = null;
    stageInteraction.value = null;
    emit("stop-stage-create");
    nextTick(fitCurrentScope);
  },
);

defineExpose({ fitCurrentScope, scheduleFitCurrentScope });
</script>

<template>
  <section class="graph-view technical-grid">
    <div ref="viewportRef" class="graph-viewport" :class="{
      'is-panning': isPanning,
      'is-stage-creating': stageCreateMode || stageCreate,
    }" @pointercancel="handlePointerCancel"
      @pointerdown="handlePointerDown" @pointermove="handlePointerMove" @pointerup="handlePointerUp" @wheel.passive="handleWheel">
      <div v-if="!currentScope.nodes.length" class="graph-empty-state">
        <h2>No domains yet.</h2>
        <p>Import a .wawapkg package or create a domain.</p>
      </div>
      <div class="graph-board" :class="{ 'is-layout-editing': isLayoutEditing }" :style="{
        width: `${board.width}px`,
        height: `${board.height}px`,
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
      }">
        <div class="stage-layer">
          <div v-for="stage in stages" :key="stage.id" class="learning-stage" :style="stageStyle(stage)">
            <div class="learning-stage__header" title="Double-click to edit stage"
              @dblclick.stop="editStage(stage)" @pointerdown="beginStageMove($event, stage)">
              <span class="learning-stage__order">{{ stageOrderLabel(stage) }}</span>
              <strong class="learning-stage__title">{{ stage.title }}</strong>
              <button v-if="isLayoutEditing" class="learning-stage__delete" type="button" title="Delete stage"
                aria-label="Delete stage" @pointerdown.stop @click.stop="deleteStage(stage)">
                <AppIcon name="x" :size="16" />
              </button>
            </div>
            <p v-if="stage.comment" class="learning-stage__comment">{{ stage.comment }}</p>
            <button v-if="isLayoutEditing" class="learning-stage__resize" type="button" title="Resize stage"
              aria-label="Resize stage" @pointerdown.stop.prevent="beginStageResize($event, stage)">
              <AppIcon name="resize" :size="16" />
            </button>
          </div>
          <div v-if="stageCreateRect" class="learning-stage learning-stage--draft" :style="stageStyle(stageCreateRect)">
            <div class="learning-stage__header">
              <span class="learning-stage__order">NEW</span>
              <strong class="learning-stage__title">Draw Stage</strong>
            </div>
          </div>
        </div>

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

            <span class="node-title">{{ nodeDisplayTitle(node) }}</span>
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

.graph-viewport.is-stage-creating {
  cursor: crosshair;
}

.graph-empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 10px;
  color: var(--text-secondary);
  text-align: center;
  pointer-events: none;
}

.graph-empty-state h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.graph-empty-state p {
  margin: 0;
  font-size: var(--font-size-ui);
}

.graph-board {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}

.stage-layer {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
}

.learning-stage {
  position: absolute;
  overflow: hidden;
  border: 1px solid rgba(237, 237, 237, 0.35);
  background: rgba(237, 237, 237, 0.035);
  color: var(--text-secondary);
  pointer-events: auto;
}

.learning-stage__header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  border-bottom: 1px solid rgba(237, 237, 237, 0.18);
  background: rgba(0, 0, 0, 0.58);
  cursor: default;
  padding: 4px 8px;
  user-select: none;
}

.is-layout-editing .learning-stage__header {
  cursor: move;
  padding-right: 32px;
}

.learning-stage__order {
  flex: 0 0 auto;
  color: var(--graphics);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
}

.learning-stage__title {
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-small);
  line-height: 1.2;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.learning-stage__comment {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-small);
  line-height: 1.5;
  padding: 8px;
}

.learning-stage__delete,
.learning-stage__resize {
  position: absolute;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 0;
  color: var(--text-primary);
  padding: 0;
}

.learning-stage__delete {
  top: 3px;
  right: 4px;
  border: 1px solid rgba(237, 237, 237, 0.28);
  background: rgba(0, 0, 0, 0.72);
  cursor: pointer;
}

.learning-stage__delete:hover {
  border-color: rgba(237, 237, 237, 0.65);
}

.learning-stage__resize {
  right: 4px;
  bottom: 4px;
  border: 1px solid rgba(237, 237, 237, 0.22);
  background: rgba(0, 0, 0, 0.62);
  cursor: nwse-resize;
}

.learning-stage__resize:hover {
  border-color: rgba(237, 237, 237, 0.6);
}

.learning-stage__delete :deep(.app-icon),
.learning-stage__resize :deep(.app-icon) {
  display: block;
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.learning-stage--draft {
  border-style: dashed;
  background: rgba(0, 183, 255, 0.045);
  pointer-events: none;
}

.trace-layer,
.node-layer {
  position: absolute;
  left: 0;
  top: 0;
}

.node-layer {
  z-index: 2;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.trace-layer {
  z-index: 1;
  color: var(--relation-depends-on);
  pointer-events: none;
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
  opacity: 0.12;
  stroke-width: 1;
  pointer-events: none;
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

.trace--contains.is-active {
  opacity: 0.28;
  stroke-width: 1.5;
}

.trace--contains.is-faded {
  opacity: 0.06;
  stroke-width: 1;
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
  pointer-events: auto;
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

.pcb-node.is-external:not(.is-faded):not(.is-selected) {
  opacity: 0.62;
}

.pcb-node.is-external {
  border-style: dashed;
}

.pcb-node.is-external .node-meta::after {
  content: " / EXTERNAL";
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
