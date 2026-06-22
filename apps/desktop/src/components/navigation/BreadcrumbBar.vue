<script setup>
import { computed } from "vue";
import { findGraphNode, getGraphEdges } from "../../graph/graph-data-store.js";
import { getGraphScope, hasGraphScope, isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor } from "../../graph/graph-theme.js";

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
});

const emit = defineEmits(["open-domain", "open-scope", "show-graph", "show-view"]);

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

const crumbItems = computed(() => {
  const items = [{ id: "root", kind: "root", label: "Global Graph" }];
  if (props.currentView === "ai-import") {
    items.push({ id: "ai-import", kind: "view", label: "Import" });
    return items;
  }
  if (props.currentView === "context-export") {
    items.push({ id: "context-export", kind: "view", label: "Export Context" });
    return items;
  }
  if (props.currentView === "tools") {
    items.push({ id: "tools", kind: "view", label: "Tools" });
    return items;
  }
  if (props.currentView === "source-snapshot") {
    items.push({ id: "tools", kind: "view-link", label: "Tools" });
    items.push({ id: "source-snapshot", kind: "view", label: "Capture" });
    return items;
  }
  if (props.currentView === "exercises" && !props.currentExerciseNodeId) {
    items.push({ id: "exercises", kind: "view", label: "Exercises" });
    return items;
  }

  const targetId = props.currentView === "graph"
    ? graphCenterNodeId.value
    : props.currentView === "note"
      ? props.currentNoteId
      : props.currentView === "exercises"
        ? props.currentExerciseNodeId
        : "";
  if (!targetId) return items;
  containsPathIds(targetId).forEach((id) => items.push(crumbForId(id)));
  if (props.currentView === "exercises") items.push({ id: "exercises", kind: "view", label: "Exercises" });
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
    <span class="crumb-dot"></span>
    <template v-for="(crumb, index) in crumbItems" :key="crumb.id">
      <button class="bread-button" @click="openCrumb(crumb)">
        {{ crumb.label }}
      </button>
      <span v-if="index < crumbItems.length - 1">/</span>
    </template>
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
  font-size: var(--font-size-label);
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
