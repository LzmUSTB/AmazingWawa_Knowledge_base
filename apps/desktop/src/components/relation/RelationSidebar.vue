<script setup>
import { computed, ref, watch } from "vue";
import { findGraphNode, getGraphNodes } from "../../graph/graph-data-store.js";
import {
  formatRelationLabel,
  getDirectRelationsForNode,
  getHierarchyForNode,
  getNodeTitleOrId,
  getOtherNodeId,
} from "../../graph/graph-relations.js";
import { isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const props = defineProps({
  addLinkCloseKey: {
    type: Number,
    default: 0,
  },
  addLinkError: {
    type: String,
    default: "",
  },
  addLinkOpenKey: {
    type: Number,
    default: 0,
  },
  addLinkSaving: {
    type: Boolean,
    default: false,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  currentNoteId: {
    type: String,
    default: "",
  },
  currentView: {
    type: String,
    required: true,
  },
  graphScopeId: {
    type: String,
    default: "root",
  },
  nodeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "add-link",
  "open-domain",
  "open-note",
  "open-scope",
  "request-add-link",
  "toggle-collapse",
]);

const formOpen = ref(false);
const direction = ref("out");
const relation = ref("depends-on");
const targetId = ref("");
const targetSearch = ref("");

const node = computed(() => findGraphNode(props.nodeId));
const nodeColor = computed(() => getDomainColor(node.value?.domain));
const domainSelected = computed(() => Boolean(node.value && isDomainNode(node.value.id)));
const hierarchy = computed(() => (node.value ? getHierarchyForNode(node.value.id) : { parentEdges: [], childEdges: [] }));
const directRelations = computed(() => (node.value ? getDirectRelationsForNode(node.value.id) : []));
const targetOptions = computed(() => {
  const query = targetSearch.value.trim().toLowerCase();
  return getGraphNodes()
    .filter((item) => item.id !== props.nodeId)
    .filter((item) => {
      if (!query) return true;
      return `${item.title} ${item.id} ${item.domain}`.toLowerCase().includes(query);
    });
});
const sourceId = computed(() => (direction.value === "out" ? props.nodeId : targetId.value));
const resolvedTargetId = computed(() => (direction.value === "out" ? targetId.value : props.nodeId));
const preview = computed(() => {
  if (!node.value || !targetId.value) return "";
  return `${getNodeTitleOrId(sourceId.value)} ${relation.value} ${getNodeTitleOrId(resolvedTargetId.value)}`;
});
const localFormError = computed(() => {
  if (!formOpen.value) return "";
  if (!node.value) return "No source node selected.";
  if (!targetId.value) return "Choose a target node.";
  if (targetId.value === props.nodeId) return "Target must be different from the current node.";
  if (!["depends-on", "used-in", "compares-with"].includes(relation.value)) return "Choose a supported relation.";
  return "";
});
const visibleFormError = computed(() => localFormError.value || props.addLinkError);
const canSubmit = computed(() => formOpen.value && !localFormError.value && !props.addLinkSaving);

watch(
  () => props.addLinkOpenKey,
  () => {
    if (!props.nodeId) return;
    formOpen.value = true;
    targetId.value = "";
    targetSearch.value = "";
    relation.value = "depends-on";
    direction.value = "out";
  },
);

watch(
  () => props.addLinkCloseKey,
  () => closeForm(),
);

watch(
  () => props.nodeId,
  () => closeForm(),
);

function closeForm() {
  formOpen.value = false;
  targetId.value = "";
  targetSearch.value = "";
  relation.value = "depends-on";
  direction.value = "out";
}

function openNodeGraph(nodeId) {
  if (!nodeId) return;
  if (isDomainNode(nodeId)) {
    emit("open-domain", nodeId);
    return;
  }
  emit("open-scope", nodeId, nodeId);
}

function submitLink() {
  if (!canSubmit.value) return;
  emit("add-link", {
    sourceId: sourceId.value,
    targetId: resolvedTargetId.value,
    relation: relation.value,
  });
}
</script>

<template>
  <aside class="relation-sidebar" :class="{ 'is-collapsed': collapsed }" :style="{ '--relation-node-color': nodeColor }">
    <button v-if="collapsed" class="relation-rail hud-button" @click="$emit('toggle-collapse')">
      Relations
    </button>

    <template v-else>
      <header class="relation-header">
        <div>
          <div class="panel-label" :style="{ '--label-color': nodeColor || 'var(--graphics)' }">Relations</div>
        </div>
        <button class="collapse-button hud-button" title="Collapse relations sidebar" @click="$emit('toggle-collapse')">
          &gt;
        </button>
      </header>

      <div v-if="!node" class="empty-state">
        <h2>No node selected</h2>
        <p>Select a graph node or open a note to inspect relationships.</p>
      </div>

      <div v-else class="relation-content">
        <section class="sidebar-section selected-node">
          <div class="section-label">Selected Node</div>
          <h2>{{ node.title }}</h2>
          <p>{{ node.id }}</p>
          <p>{{ node.type }} / {{ node.domain }}</p>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Actions</div>
          <div class="action-grid">
            <button
              v-if="domainSelected"
              class="hud-button"
              style="--button-color: var(--relation-node-color)"
              @click="$emit('open-domain', node.id)"
            >
              Open Domain Graph
            </button>
            <template v-else>
              <button class="hud-button" style="--button-color: var(--simulation)" @click="$emit('open-note', node.id)">
                Open Note
              </button>
              <button
                class="hud-button"
                style="--button-color: var(--relation-node-color)"
                @click="$emit('open-scope', node.id, node.id)"
              >
                Show Local Graph
              </button>
            </template>
            <button class="hud-button" style="--button-color: var(--career)" @click="$emit('request-add-link')">
              Add Link
            </button>
          </div>
        </section>

        <section v-if="formOpen" class="sidebar-section add-link-panel">
          <div class="section-label">Add Link</div>
          <label>
            <span>Direction</span>
            <select v-model="direction">
              <option value="out">{{ node.title }} -> Target</option>
              <option value="in">Target -> {{ node.title }}</option>
            </select>
          </label>
          <label>
            <span>Relation</span>
            <select v-model="relation">
              <option value="depends-on">depends-on</option>
              <option value="used-in">used-in</option>
              <option value="compares-with">compares-with</option>
            </select>
          </label>
          <label>
            <span>Target</span>
            <input v-model="targetSearch" placeholder="Filter nodes" spellcheck="false" />
          </label>
          <select v-model="targetId" class="target-select" size="5">
            <option v-for="target in targetOptions" :key="target.id" :value="target.id">
              {{ target.title }} / {{ target.id }}
            </option>
          </select>
          <div class="preview-line">{{ preview || "Choose a target to preview the link." }}</div>
          <div v-if="visibleFormError" class="form-error">{{ visibleFormError }}</div>
          <div class="form-actions">
            <button class="hud-button" :disabled="addLinkSaving" @click="closeForm">Cancel</button>
            <button
              class="hud-button"
              :disabled="!canSubmit"
              style="--button-color: var(--career)"
              @click="submitLink"
            >
              {{ addLinkSaving ? "Adding..." : "Add Link" }}
            </button>
          </div>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Hierarchy</div>
          <div class="sub-label">Parent</div>
          <button
            v-for="edge in hierarchy.parentEdges"
            :key="edge.id"
            class="relation-row"
            @click="openNodeGraph(edge.source)"
          >
            {{ getNodeTitleOrId(edge.source) }}
          </button>
          <p v-if="!hierarchy.parentEdges.length" class="empty-line">No parent edge</p>

          <div class="sub-label">Children</div>
          <button
            v-for="edge in hierarchy.childEdges"
            :key="edge.id"
            class="relation-row"
            @click="openNodeGraph(edge.target)"
          >
            {{ getNodeTitleOrId(edge.target) }}
          </button>
          <p v-if="!hierarchy.childEdges.length" class="empty-line">No child edges</p>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Relations</div>
          <button
            v-for="edge in directRelations"
            :key="edge.id"
            class="relation-row relation-row--direct"
            @click="openNodeGraph(getOtherNodeId(edge, node.id))"
          >
            <span>{{ formatRelationLabel(edge) }}</span>
            <small>{{ getNodeTitleOrId(getOtherNodeId(edge, node.id)) }}</small>
          </button>
          <p v-if="!directRelations.length" class="empty-line">No direct relations</p>
        </section>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.relation-sidebar {
  grid-column: 3;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--border-primary);
  background: var(--background-main);
}

.relation-sidebar.is-collapsed {
  display: grid;
}

.relation-rail {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
  writing-mode: vertical-rl;
}

.relation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.collapse-button {
  width: 28px;
  min-width: 28px;
  padding: 0;
}

.relation-content,
.empty-state {
  height: calc(100vh - 98px);
  overflow: auto;
  padding: 16px;
}

.empty-state {
  display: grid;
  align-content: start;
  gap: 10px;
}

.empty-state h2,
.selected-node h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.15;
}

.empty-state p,
.selected-node p,
.empty-line {
  margin: 0;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.45;
  text-transform: uppercase;
}

.sidebar-section {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid var(--border-muted);
  padding: 0 0 16px;
  margin-bottom: 16px;
}

.section-label,
.sub-label,
label span {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.sub-label {
  margin-top: 6px;
}

.action-grid,
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

label {
  display: grid;
  gap: 6px;
}

input,
select {
  width: 100%;
  min-height: 34px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  background: var(--background-panel);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 0 9px;
}

input:focus,
select:focus {
  border-color: var(--border-primary);
}

.target-select {
  min-height: 120px;
  padding-block: 6px;
}

.preview-line,
.form-error {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.45;
  padding: 8px;
}

.form-error {
  border-color: var(--game-dev);
  color: var(--game-dev);
}

.relation-row {
  width: 100%;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--relation-node-color, var(--border-primary));
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-small);
  font-weight: 700;
  line-height: 1.35;
  padding: 8px;
  text-align: left;
  text-transform: uppercase;
}

.relation-row:hover {
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.relation-row--direct {
  display: grid;
  gap: 4px;
}

.relation-row small {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 700;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
