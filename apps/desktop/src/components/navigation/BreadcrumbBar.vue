<script setup>
import { computed } from "vue";
import { findGraphNode, getGraphEdges } from "../../graph/graph-data-store.js";
import { getGraphScope, hasGraphScope, isDomainNode } from "../../graph/graph-scope.js";
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
  currentExerciseNodeId: {
    type: String,
    default: "",
  },
  currentConceptMapFocusNodeId: {
    type: String,
    default: "",
  },
  currentView: {
    type: String,
    required: true,
  },
  graphScopeId: {
    type: String,
    required: true,
  },
  canGoBack: {
    type: Boolean,
    default: false,
  },
  sessionTabs: {
    type: Array,
    default: () => [],
  },
  activeSessionTabId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "activate-session-tab",
  "close-session-tab",
  "go-back",
  "open-domain",
  "open-note",
  "open-scope",
  "show-graph",
]);

const accent = computed(() => getDomainColor(props.currentDomain));
const scope = computed(() => getGraphScope(props.graphScopeId));

function displayTitle(entity, fallback = "") {
  return entity?.titleLocale || entity?.title || entity?.id || fallback;
}

function containsParentMap() {
  const parents = new Map();
  getGraphEdges()
    .filter((edge) => edge.relation === "contains")
    .forEach((edge) => {
      if (!parents.has(edge.target)) parents.set(edge.target, edge.source);
    });
  return parents;
}

function containsPathIds(nodeId) {
  const node = findGraphNode(nodeId);
  if (!node) return [];

  const parents = containsParentMap();
  const path = [];
  const seen = new Set([nodeId]);
  let cursor = nodeId;
  let parentId = parents.get(cursor);

  while (parentId && !seen.has(parentId)) {
    path.unshift(parentId);
    seen.add(parentId);
    cursor = parentId;
    parentId = parents.get(cursor);
  }

  if (node.domain && !path.includes(node.domain)) path.unshift(node.domain);
  if (!path.includes(nodeId)) path.push(nodeId);

  return path;
}

function crumbForId(id) {
  const node = findGraphNode(id);
  return {
    id,
    kind: isDomainNode(id) ? "domain" : "node",
    label: displayTitle(node, id),
  };
}

const graphCenterNodeId = computed(() => {
  if (scope.value.type === "root") return "";
  return scope.value.centerNodeId || scope.value.id;
});

const breadcrumbTargetId = computed(() => {
  if (props.currentView === "graph") return graphCenterNodeId.value;
  if (props.currentView === "note") return props.currentNoteId;
  if (props.currentView === "exercises") return props.currentExerciseNodeId;
  if (props.currentView === "concept-map") return props.currentConceptMapFocusNodeId || graphCenterNodeId.value;
  return graphCenterNodeId.value;
});

const crumbItems = computed(() => {
  const items = [{ id: "root", kind: "root", label: "Global Graph" }];
  if (breadcrumbTargetId.value) {
    containsPathIds(breadcrumbTargetId.value).forEach((id) => items.push(crumbForId(id)));
  }
  return items;
});

function openCrumb(crumb) {
  if (crumb.kind === "root") {
    emit("show-graph", "root");
    return;
  }
  if (crumb.kind === "domain") {
    emit("open-domain", crumb.id);
    return;
  }
  if (crumb.id === breadcrumbTargetId.value) {
    if (props.currentView === "note") return;
    if (["exercises", "concept-map"].includes(props.currentView)) {
      emit("open-note", crumb.id);
      return;
    }
  }
  if (hasGraphScope(crumb.id)) {
    emit("open-scope", crumb.id, crumb.id);
    return;
  }
}
</script>

<template>
  <div class="breadcrumb-bar" :style="{ '--crumb-color': accent }">
    <div class="crumb-list">
      <span class="crumb-dot"></span>
      <template v-for="(crumb, index) in crumbItems" :key="`${crumb.kind}:${crumb.id}`">
        <span v-if="index > 0" class="crumb-separator">/</span>
        <button class="bread-button" @click="openCrumb(crumb)">
          {{ crumb.label }}
        </button>
      </template>
    </div>
    <div v-if="sessionTabs.length" class="session-tabs" aria-label="Open workspace tabs">
      <div v-for="tab in sessionTabs" :key="tab.id" class="session-tab"
        :class="{ 'is-active': tab.id === activeSessionTabId }" :title="tab.label">
        <button class="session-tab__label" type="button" @click="$emit('activate-session-tab', tab)">
          {{ tab.label }}
        </button>
        <button class="session-tab__close" type="button" :title="`Close ${tab.label}`"
          @click.stop="$emit('close-session-tab', tab.id)">
          <AppIcon name="x" :size="11" />
        </button>
      </div>
    </div>
    <button v-if="canGoBack" class="bread-back button-with-icon" type="button" title="Back" @click="$emit('go-back')">
      <AppIcon name="back" :size="14" />
      <span>Back</span>
    </button>
  </div>
</template>

<style scoped>
.breadcrumb-bar {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 46px;
  align-items: center;
  height: 46px;
  min-height: 46px;
  max-height: 46px;
  overflow: hidden;
  padding: 0 18px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-main);
  color: var(--text-muted);
  font-size: var(--font-size-label);
  font-weight: 800;
  text-transform: uppercase;
}

.crumb-list {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.crumb-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  background: var(--crumb-color);
}

.crumb-separator {
  flex: 0 0 auto;
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

.bread-button {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bread-button:hover {
  color: var(--text-primary);
  text-decoration: underline;
  text-decoration-color: var(--crumb-color);
  text-underline-offset: 5px;
}

.bread-back {
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--crumb-color);
  background: var(--background-panel);
  color: var(--text-primary);
  flex: 0 0 auto;
}

.crumb-list + .bread-back {
  margin-left: auto;
}

.bread-back:hover {
  background: var(--background-elevated);
}

.session-tabs {
  display: flex;
  min-width: 80px;
  margin-left: auto;
  align-self: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  border-left: 1px solid var(--border-muted);
  scrollbar-width: none;
}

.session-tabs::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.session-tab {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  min-width: 90px;
  max-width: 210px;
  align-items: center;
  border-right: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.session-tab::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: transparent;
  content: "";
}

.session-tab.is-active {
  background: var(--background-elevated);
}

.session-tab.is-active::after {
  background: var(--crumb-color);
}

.session-tab__label {
  min-width: 0;
  flex: 1;
  padding: 0 8px 0 12px;
  overflow: hidden;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-tab.is-active .session-tab__label,
.session-tab:hover .session-tab__label {
  color: var(--text-primary);
}

.session-tab__close {
  display: grid;
  width: 26px;
  height: 100%;
  flex: 0 0 26px;
  padding: 0;
  place-items: center;
  color: var(--text-muted);
}

.session-tab__close:hover {
  background: var(--background-main);
  color: var(--game-dev);
}
</style>
