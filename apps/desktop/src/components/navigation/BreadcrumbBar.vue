<script setup>
import { computed } from "vue";
import { findGraphNode } from "../../graph/graph-data-store.js";
import { getGraphScope } from "../../graph/graph-scope.js";
import { getDomainColor } from "../../graph/graph-theme.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  currentDomain: {
    type: String,
    required: true,
  },
  currentNoteId: {
    type: String,
    required: true,
  },
  currentView: {
    type: String,
    required: true,
  },
  graphScopeId: {
    type: String,
    required: true,
  },
});

defineEmits(["open-domain", "show-graph"]);

const currentNode = computed(() => findGraphNode(props.currentNoteId));
const accent = computed(() => getDomainColor(props.currentDomain));
const scope = computed(() => getGraphScope(props.graphScopeId));
const graphCrumbs = computed(() => scope.value.breadcrumb);
</script>

<template>
  <div class="breadcrumb-bar" :style="{ '--crumb-color': accent }">
    <span class="crumb-dot"></span>
    <template v-if="currentView === 'graph'">
      <template v-for="(crumb, index) in graphCrumbs" :key="crumb">
        <button v-if="index === 0" @click="$emit('show-graph', 'root')">
          {{ crumb }}
        </button>
        <button v-else @click="$emit('open-domain', currentDomain)">
          {{ crumb }}
        </button>
        <span v-if="index < graphCrumbs.length - 1">/</span>
      </template>
    </template>
    <template v-else>
      <button class="bread-button" @click="$emit('show-graph', 'root')">Global Graph</button>
      <span>/</span>
      <button class="bread-button" @click="$emit('open-domain', currentDomain)">{{ currentDomain }}</button>
      <template v-if="currentNode">
        <span>/</span>
        <button class="bread-button">{{ currentNode.title }}</button>
      </template>
    </template>
    <button v-if="currentView === 'note'" class="show-graph button-with-icon" @click="$emit('show-graph', currentNoteId, currentNoteId)">
      <AppIcon name="graph" />
      <span class="button-icon-label">Show in Graph</span>
    </button>
  </div>
</template>

<style scoped>
.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-main);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.crumb-dot {
  width: 8px;
  height: 8px;
  background: var(--crumb-color);
}

button {
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  text-transform: inherit;
}

.bread-button:hover {
  color: var(--text-primary);
  text-decoration: underline;
  text-decoration-color: var(--crumb-color);
  text-underline-offset: 5px;
}

.show-graph {
  margin-left: auto;
  padding: 7px 12px;
  border: 1px solid var(--crumb-color);
  background: var(--background-panel);
  color: var(--text-primary);
}
</style>
