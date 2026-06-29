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
});

const emit = defineEmits(["go-back", "open-domain", "open-scope", "show-graph", "show-view"]);

const accent = computed(() => getDomainColor(props.currentDomain));
const scope = computed(() => getGraphScope(props.graphScopeId));
const tabLabels = {
  "ai-import": "Import",
  "context-export": "Export Context",
  tools: "Tools",
  "source-snapshot": "Capture",
  "vault-package-export": "Export Package",
  exercises: "Exercises",
  "vault-settings": "Vault Settings",
  "vault-setup": "Vault Setup",
  "vault-git": "Vault Git",
};

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

const crumbItems = computed(() => {
  const items = [{ id: "root", kind: "root", label: "Global Graph" }];

  const targetId = props.currentView === "graph"
    ? graphCenterNodeId.value
    : props.currentView === "note"
      ? props.currentNoteId
      : props.currentView === "exercises"
        ? props.currentExerciseNodeId
        : graphCenterNodeId.value;
  if (targetId) containsPathIds(targetId).forEach((id) => items.push(crumbForId(id)));

  const tabLabel = tabLabels[props.currentView];
  if (props.currentView !== "graph" && props.currentView !== "note" && tabLabel) {
    items.push({ id: props.currentView, kind: "view", label: tabLabel, isTab: true });
  }
  return items;
});

function separatorBefore(index) {
  return crumbItems.value[index]?.isTab ? "+" : "/";
}

function openCrumb(crumb) {
  if (crumb.kind === "root") {
    emit("show-graph", "root");
    return;
  }
  if (crumb.kind === "domain") {
    emit("open-domain", crumb.id);
    return;
  }
  if (crumb.kind === "view") return;
  if (crumb.kind === "view-link") {
    emit("show-view", crumb.id);
    return;
  }
  if (hasGraphScope(crumb.id)) {
    emit("open-scope", crumb.id, crumb.id);
  }
}
</script>

<template>
  <div class="breadcrumb-bar" :style="{ '--crumb-color': accent }">
    <div class="crumb-list">
      <span class="crumb-dot"></span>
      <template v-for="(crumb, index) in crumbItems" :key="`${crumb.kind}:${crumb.id}`">
        <span v-if="index > 0" class="crumb-separator" :class="{ 'is-tab-separator': crumb.isTab }">
          {{ separatorBefore(index) }}
        </span>
        <button class="bread-button" :class="{ 'is-tab': crumb.isTab }" @click="openCrumb(crumb)">
          {{ crumb.label }}
        </button>
      </template>
    </div>
    <button v-if="canGoBack" class="bread-back button-with-icon" type="button" title="Back" @click="$emit('go-back')">
      <AppIcon name="back" :size="14" />
      <span>Back</span>
    </button>
  </div>
</template>

<style scoped>
.breadcrumb-bar {
  display: flex;
  align-items: center;
  height: 46px;
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

.crumb-separator.is-tab-separator {
  color: var(--crumb-color);
  font-size: calc(var(--font-size-label) + 2px);
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

.bread-button.is-tab {
  color: var(--text-primary);
}

.bread-button:hover {
  color: var(--text-primary);
  text-decoration: underline;
  text-decoration-color: var(--crumb-color);
  text-underline-offset: 5px;
}

.bread-back {
  margin-left: auto;
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

.bread-back:hover {
  background: var(--background-elevated);
}
</style>
