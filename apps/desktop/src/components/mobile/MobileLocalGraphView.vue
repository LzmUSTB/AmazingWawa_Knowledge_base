<script setup>
import { computed } from "vue";
import { getConnectedNodeIds } from "../../graph/graph-interactions.js";
import {
  getGraphBoardSize,
  getNodeLayout,
  getTracePoints,
  pointsToPath,
} from "../../graph/graph-layout.js";
import { findGraphNode, getGraphNodes } from "../../graph/graph-data-store.js";
import { getGraphScope } from "../../graph/graph-scope.js";
import { getDomainColor, relationTheme } from "../../graph/graph-theme.js";

const props = defineProps({
  selectedNodeId: {
    type: String,
    required: true,
  },
});

defineEmits(["open-note"]);

const activeNode = computed(() => findGraphNode(props.selectedNodeId) || getGraphNodes()[0]);
const currentScope = computed(() => getGraphScope(activeNode.value?.id || "root"));
const nodes = computed(() => currentScope.value.nodes);
const edges = computed(() => currentScope.value.edges);
const selectedNode = computed(
  () => activeNode.value || currentScope.value.nodes[0],
);
const connectedIds = computed(() => getConnectedNodeIds(selectedNode.value.id, edges.value));
const board = computed(() => getGraphBoardSize(currentScope.value.id, "mobile"));
</script>

<template>
  <main class="mobile-screen" :style="{ '--mobile-color': getDomainColor(selectedNode.domain) }">
    <header class="mobile-top">
      <strong>Local Graph</strong>
      <button class="hud-button" @click="$emit('open-note', selectedNode.id)">Note</button>
    </header>
    <nav class="mobile-crumb">
      <span></span>
      current node + direct relations
    </nav>
    <section class="mobile-graph technical-grid">
      <div
        class="mobile-board"
        :style="{
          width: `${board.width}px`,
          height: `${board.height}px`,
        }"
      >
        <svg
          :height="board.height"
          :viewBox="`0 0 ${board.width} ${board.height}`"
          :width="board.width"
          class="mobile-traces"
          aria-hidden="true"
        >
          <path
            v-for="edge in edges"
            :key="edge.id"
            class="mobile-trace"
            :d="pointsToPath(getTracePoints(edge.id, currentScope.id, 'mobile'))"
            :stroke="relationTheme[edge.relation].color"
            :stroke-dasharray="relationTheme[edge.relation].dash"
          />
        </svg>

        <div class="mobile-node-layer">
          <button
            v-for="node in nodes"
            :key="node.id"
            class="mobile-node"
            :class="{
              'is-selected': node.id === selectedNode.id,
              'is-faded': !connectedIds.has(node.id),
            }"
            :style="{
              '--node-color': getDomainColor(node.domain),
              left: `${getNodeLayout(node.id, currentScope.id, 'mobile').x}px`,
              top: `${getNodeLayout(node.id, currentScope.id, 'mobile').y}px`,
              width: `${getNodeLayout(node.id, currentScope.id, 'mobile').width}px`,
              height: `${getNodeLayout(node.id, currentScope.id, 'mobile').height}px`,
            }"
            @click="$emit('open-note', node.id)"
          >
            <i class="mobile-port mobile-port--top"></i>
            <i class="mobile-port mobile-port--right"></i>
            <i class="mobile-port mobile-port--bottom"></i>
            <i class="mobile-port mobile-port--left"></i>
            <span>{{ node.title }}</span>
          </button>
        </div>
      </div>
    </section>
    <aside class="bottom-card">
      <div class="card-accent"></div>
      <h2>{{ selectedNode.title }}</h2>
      <p>{{ selectedNode.summary }}</p>
      <div>
        <button class="hud-button" style="--button-color: var(--mobile-color)" @click="$emit('open-note', selectedNode.id)">
          Open Note
        </button>
        <!-- <button class="hud-button" style="--button-color: var(--career)">Review</button> -->
      </div>
    </aside>
  </main>
</template>

<style scoped>
.mobile-screen {
  min-height: 100vh;
  background: var(--background-main);
}

.mobile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
  text-transform: uppercase;
}

.mobile-top strong {
  font-size: 12px;
}

.mobile-crumb {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-muted);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.mobile-crumb span {
  width: 8px;
  height: 8px;
  background: var(--mobile-color);
}

.mobile-graph {
  position: relative;
  height: calc(100vh - 296px);
  min-height: 500px;
  overflow: hidden;
}

.mobile-board {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-255px, -326px);
  transform-origin: 0 0;
}

.mobile-traces,
.mobile-node-layer {
  position: absolute;
  left: 0;
  top: 0;
}

.mobile-node-layer {
  width: 100%;
  height: 100%;
}

.mobile-trace {
  fill: none;
  opacity: 0.78;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 2;
}

.mobile-node {
  position: absolute;
  display: grid;
  place-items: center;
  border: 1px solid var(--node-color);
  border-left-width: 4px;
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px 10px 8px 14px;
  text-align: center;
}

.mobile-node span {
  display: -webkit-box;
  overflow: hidden;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.16;
  text-transform: uppercase;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mobile-port {
  position: absolute;
  background: var(--node-color);
}

.mobile-port--left,
.mobile-port--right {
  top: 50%;
  width: 10px;
  height: 3px;
}

.mobile-port--left {
  left: -10px;
}

.mobile-port--right {
  right: -10px;
}

.mobile-port--top,
.mobile-port--bottom {
  left: 50%;
  width: 3px;
  height: 10px;
}

.mobile-port--top {
  top: -10px;
}

.mobile-port--bottom {
  bottom: -10px;
}

.mobile-node.is-selected {
  border: 2px solid var(--border-primary);
  outline: 1px solid var(--node-color);
  outline-offset: 4px;
}

.mobile-node.is-faded {
  opacity: 0.35;
}

.bottom-card {
  display: grid;
  grid-template-columns: 5px 1fr;
  margin: 0 16px 16px;
  border: 1px solid var(--border-primary);
  background: var(--background-panel);
}

.card-accent {
  grid-row: 1 / span 3;
  background: var(--mobile-color);
}

.bottom-card h2,
.bottom-card p,
.bottom-card div:last-child {
  margin-inline: 16px;
}

.bottom-card h2 {
  margin-block: 16px 8px;
  font-size: 18px;
}

.bottom-card p {
  margin-block: 0 14px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.bottom-card div:last-child {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
</style>
