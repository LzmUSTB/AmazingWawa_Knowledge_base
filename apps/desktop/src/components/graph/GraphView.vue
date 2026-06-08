<script setup>
import { computed, ref } from "vue";
import NodeContextMenu from "./NodeContextMenu.vue";
import { getConnectedNodeIds, isConnectedEdge } from "../../graph/graph-interactions.js";
import { getNodeLayout, getTracePoints, pointsToPath } from "../../graph/graph-layout.js";
import { getGraphScope, isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor, nodeClass, relationTheme } from "../../graph/graph-theme.js";

const props = defineProps({
  selectedNodeId: {
    type: String,
    required: true,
  },
  scopeId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["open-dialog", "open-note", "open-scope", "select-node", "show-local"]);

const hoveredNodeId = ref("");
const currentScope = computed(() => getGraphScope(props.scopeId));
const focusNodeId = computed(() => hoveredNodeId.value || props.selectedNodeId);
const connectedIds = computed(() => getConnectedNodeIds(focusNodeId.value, currentScope.value.edges));
const selectedNode = computed(
  () =>
    currentScope.value.nodes.find((node) => node.id === props.selectedNodeId) ||
    currentScope.value.nodes.find((node) => node.id === currentScope.value.selectedNodeId) ||
    currentScope.value.nodes[0],
);

function nodeState(node) {
  return {
    "is-selected": node.id === props.selectedNodeId,
    "is-hovered": node.id === hoveredNodeId.value,
    "is-connected": connectedIds.value.has(node.id),
    "is-faded": focusNodeId.value && !connectedIds.value.has(node.id),
  };
}

function handleNodeClick(node) {
  if (currentScope.value.type === "root" && isDomainNode(node.id)) {
    emit("open-scope", node.id);
    return;
  }
  emit("select-node", node.id);
}

function handleNodeOpen(node) {
  if (isDomainNode(node.id)) {
    emit("open-scope", node.id);
    return;
  }
  emit("open-note", node.id);
}

function handleShowLocal(nodeId) {
  if (isDomainNode(nodeId)) {
    emit("open-scope", nodeId);
    return;
  }
  if (nodeId === "rendering-pipeline") {
    emit("open-scope", nodeId);
    return;
  }
  emit("show-local", nodeId);
}
</script>

<template>
  <section class="graph-view technical-grid">
    <svg class="trace-layer" viewBox="0 0 1180 780" aria-hidden="true">
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
          v-if="getTracePoints(edge.id, currentScope.id)"
          class="trace"
          :class="[
            `trace--${edge.relation}`,
            {
              'is-active': isConnectedEdge(edge, focusNodeId),
              'is-faded': focusNodeId && !isConnectedEdge(edge, focusNodeId),
            },
          ]"
          :d="pointsToPath(getTracePoints(edge.id, currentScope.id))"
          :marker-end="edge.relation === 'depends-on' ? 'url(#trace-arrow)' : ''"
          :stroke="relationTheme[edge.relation].color"
          :stroke-dasharray="relationTheme[edge.relation].dash"
        />
        <path
          v-if="edge.relation === 'compares-with' && getTracePoints(edge.id, currentScope.id)"
          class="trace trace--paired"
          :class="{ 'is-active': isConnectedEdge(edge, focusNodeId) }"
          :d="pointsToPath(getTracePoints(edge.id, currentScope.id).map(([x, y]) => [x + 7, y + 7]))"
          :stroke="relationTheme[edge.relation].color"
          stroke-dasharray="3 5"
        />
      </g>
    </svg>

    <button
      v-for="node in currentScope.nodes"
      :key="node.id"
      :class="[nodeClass(node.type), nodeState(node)]"
      :style="{
        '--node-color': getDomainColor(node.domain),
        left: `${getNodeLayout(node.id, currentScope.id).x}px`,
        top: `${getNodeLayout(node.id, currentScope.id).y}px`,
        width: `${getNodeLayout(node.id, currentScope.id).width}px`,
        height: `${getNodeLayout(node.id, currentScope.id).height}px`,
      }"
      @click="handleNodeClick(node)"
      @dblclick="handleNodeOpen(node)"
      @mouseenter="hoveredNodeId = node.id"
      @mouseleave="hoveredNodeId = ''"
    >
      <span class="node-port node-port--top"></span>
      <span class="node-port node-port--right"></span>
      <span class="node-port node-port--bottom"></span>
      <span class="node-port node-port--left"></span>
      <span class="node-pin"></span>
      <span class="node-title">{{ node.title }}</span>
      <span class="node-meta">{{ node.type }} / {{ node.domain }}</span>
    </button>

    <div class="routing-label routing-label--a">
      SCOPE: {{ currentScope.type }} / SAME-LEVEL ONLY
    </div>
    <div class="routing-label routing-label--b">PORT ROUTED / STATIC BOARD</div>

    <NodeContextMenu
      :node="selectedNode"
      @open-dialog="$emit('open-dialog', $event)"
      @open-note="$emit('open-note', $event)"
      @show-local="handleShowLocal"
    />
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

.trace-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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
  font-size: 13px;
  font-weight: 800;
  line-height: 1.16;
  text-align: center;
  text-transform: uppercase;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pcb-node--root .node-title {
  font-size: 16px;
}

.node-meta {
  overflow: hidden;
  max-width: 100%;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
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
  font-size: 10px;
  text-transform: uppercase;
}

.routing-label--a {
  left: 24px;
  bottom: 24px;
}

.routing-label--b {
  right: 24px;
  bottom: 24px;
}
</style>
