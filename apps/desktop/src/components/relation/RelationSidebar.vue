<script setup>
import { computed, ref, watch } from "vue";
import NodeFilterList from "../common/NodeFilterList.vue";
import AppIcon from "../ui/AppIcon.vue";
import RelationContextMenu from "./RelationContextMenu.vue";
import { findGraphNode, useActiveVault } from "../../graph/graph-data-store.js";
import { getStageForNode } from "../../graph/graph-layout.js";
import {
  getDirectRelationsForNode,
  getHierarchyForNode,
  getNodeTitleOrId,
  getOtherNodeId,
} from "../../graph/graph-relations.js";
import { getGraphScope, isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor, relationTheme } from "../../graph/graph-theme.js";

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
  canSaveNote: {
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
  currentNodePinned: {
    type: Boolean,
    default: false,
  },
  currentView: {
    type: String,
    required: true,
  },
  graphScopeId: {
    type: String,
    default: "root",
  },
  layoutBoard: {
    type: Object,
    default: null,
  },
  nodeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "add-link",
  "add-exercises",
  "open-domain",
  "open-note",
  "open-exercises",
  "open-scope",
  "request-add-link",
  "request-delete-note",
  "request-delete-relation",
  "request-edit-relation",
  "toggle-collapse",
  "toggle-pin-node",
]);

const formOpen = ref(false);
const direction = ref("out");
const relation = ref("depends-on");
const targetId = ref("");
const contextMenu = ref({ edge: null, x: 0, y: 0 });
const activeVault = useActiveVault();

const node = computed(() => findGraphNode(props.nodeId));
const nodeColor = computed(() => getDomainColor(node.value?.domain));
const nodeIsExternal = computed(() => (
  getGraphScope(props.graphScopeId).externalNodeIds || []
).includes(props.nodeId));
const nodeStage = computed(() => {
  if (!node.value || nodeIsExternal.value) return null;
  return getStageForNode(node.value.id, props.graphScopeId, props.layoutBoard);
});
const domainSelected = computed(() => Boolean(node.value && isDomainNode(node.value.id)));
const nodeHasNote = computed(() => {
  if (!node.value || domainSelected.value) return false;
  const note = activeVault.value.notes?.[node.value.id] || null;
  return Boolean(note?.markdown || note?.html);
});
const nodeHasExerciseSet = computed(() => Boolean(
  node.value && !domainSelected.value && activeVault.value.exercises?.byNodeId?.[node.value.id],
));
const hierarchy = computed(() => (node.value ? getHierarchyForNode(node.value.id) : { parentEdges: [], childEdges: [] }));
const directRelations = computed(() => (node.value ? getDirectRelationsForNode(node.value.id) : []));

const selectedTarget = computed(() => findGraphNode(targetId.value));
const directionLeftLabel = computed(() => {
  if (direction.value === "out") return getNodeTitleOrId(node.value?.id) || "Current Node";
  return getNodeTitleOrId(selectedTarget.value?.id) || "Target";
});
const directionRightLabel = computed(() => {
  if (direction.value === "out") return getNodeTitleOrId(selectedTarget.value?.id) || "Target";
  return getNodeTitleOrId(node.value?.id) || "Current Node";
});
const directionTitle = computed(() => (direction.value === "out" ? "Current node points to target" : "Target points to current node"));

function toggleDirection() {
  direction.value = direction.value === "out" ? "in" : "out";
}

function selectTarget(id) {
  targetId.value = id;
}

function relationStyle(edge) {
  return { "--relation-row-color": relationTheme[edge.relation]?.color || relationColor(edge.relation) };
}

function relationColor(relationName) {
  if (relationName === "depends-on") return relationTheme["depends-on"].color;
  if (relationName === "used-in") return relationTheme["used-in"].color;
  if (relationName === "compares-with") return relationTheme["compares-with"].color;
  return "var(--graphics)";
}

function relationMiddleClass(edge) {
  return {
    "relation-middle--depends-on": edge.relation === "depends-on",
    "relation-middle--used-in": edge.relation === "used-in",
    "relation-middle--compares-with": edge.relation === "compares-with",
  };
}

function relationLabel(edge) {
  return relationTheme[edge.relation]?.label || edge.relation.toUpperCase();
}

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
  () => {
    closeForm();
    closeContextMenu();
  },
);

watch(
  () => props.currentView,
  () => closeContextMenu(),
);

function closeForm() {
  formOpen.value = false;
  targetId.value = "";
  relation.value = "depends-on";
  direction.value = "out";
}

function openNodeGraph(nodeId) {
  closeContextMenu();
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

function openContextMenu(event, edge) {
  event.preventDefault();
  contextMenu.value = {
    edge,
    x: Math.min(event.clientX, window.innerWidth - 220),
    y: Math.min(event.clientY, window.innerHeight - 130),
  };
}

function closeContextMenu() {
  contextMenu.value = { edge: null, x: 0, y: 0 };
}

function requestEditRelation(edgeId) {
  closeContextMenu();
  emit("request-edit-relation", edgeId);
}

function requestDeleteRelation(edgeId) {
  closeContextMenu();
  emit("request-delete-relation", edgeId);
}

function requestDeleteNote() {
  closeContextMenu();
  emit("request-delete-note", node.value?.id || "");
}
</script>

<template>
  <aside class="relation-sidebar" :class="{ 'is-collapsed': collapsed }"
    :style="{ '--relation-node-color': nodeColor }">
    <button v-if="collapsed" class="relation-rail" @click="$emit('toggle-collapse')">
      Details
    </button>

    <template v-else>
      <header class="relation-header">
        <div>
          <div class="panel-label" :style="{ '--label-color': nodeColor || 'var(--graphics)' }">Details</div>
        </div>
        <button class="collapse-button hud-button button-icon-only" title="Collapse relations sidebar"
          aria-label="Collapse relations sidebar" @click="$emit('toggle-collapse')">
          <AppIcon name="chevron-right" :size="13" />
        </button>
      </header>

      <div v-if="!node" class="empty-state">
        <h2>No node selected</h2>
        <p>Select a graph node or open a note to inspect relationships.</p>
      </div>

      <div v-else class="relation-content" @scroll="closeContextMenu">
        <section class="sidebar-section selected-node">
          <div class="section-label">Selected Node</div>
          <h2>{{ getNodeTitleOrId(node.id) }}</h2>
          <p>{{ node.id }}</p>
          <p>{{ node.type }} / {{ node.domain }}</p>
          <div v-if="nodeIsExternal" class="stage-summary is-external">External node</div>
          <div v-else-if="nodeStage" class="stage-summary">
            <strong>Stage: {{ String(Number(nodeStage.order) || 0).padStart(2, "0") }} {{ nodeStage.title }}</strong>
            <span v-if="nodeStage.comment">Comment: {{ nodeStage.comment }}</span>
          </div>
          <button class="hud-button button-with-icon pin-action"
            :class="{ 'is-pinned': currentNodePinned, 'is-unpinned': !currentNodePinned }"
            style="--button-color: var(--career)" @click="$emit('toggle-pin-node')">
            <AppIcon class="pin-icon" name="pin" />
          </button>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Actions</div>
          <div class="action-grid">
            <button v-if="domainSelected" class="hud-button button-with-icon"
              style="--button-color: var(--relation-node-color)" @click="$emit('open-domain', node.id)">
              <AppIcon name="graph" />
              <span class="button-icon-label">Open Domain Graph</span>
            </button>
            <template v-else>
              <button class="hud-button button-with-icon" style="--button-color: var(--simulation)"
                @click="$emit('open-note', node.id)">
                <AppIcon name="file-text" />
                <span class="button-icon-label">Open Note</span>
              </button>
              <button class="hud-button button-with-icon" style="--button-color: var(--relation-node-color)"
                @click="$emit('open-scope', node.id, node.id)">
                <AppIcon name="graph" />
                <span class="button-icon-label">Show Local Graph</span>
              </button>
              <button class="hud-button button-with-icon" style="--button-color: var(--career)"
                :disabled="!nodeHasExerciseSet && !canSaveNote"
                @click="$emit(nodeHasExerciseSet ? 'open-exercises' : 'add-exercises', node.id)">
                <AppIcon name="exercise" />
                <span class="button-icon-label">{{ nodeHasExerciseSet ? "Open Exercises" : "Add Exercises" }}</span>
              </button>
              <button v-if="canSaveNote && nodeHasNote" class="hud-button button-with-icon"
                style="--button-color: var(--game-dev)" @click="requestDeleteNote">
                <AppIcon name="delete" />
                <span class="button-icon-label">Delete Note</span>
              </button>
            </template>
            <button class="hud-button button-with-icon" style="--button-color: var(--career)"
              @click="$emit('request-add-link')">
              <AppIcon name="link" />
              <span class="button-icon-label">Add Link</span>
            </button>
          </div>
        </section>

        <section v-if="formOpen" class="sidebar-section add-link-panel">
          <div class="section-label">Add Link</div>
          <div class="direction-field">
            <span>Direction</span>
            <div class="direction-composer" :title="directionTitle">
              <div class="direction-node">{{ directionLeftLabel }}</div>
              <button class="direction-arrow" title="Reverse direction" aria-label="Reverse direction" type="button"
                @click="toggleDirection">
                <AppIcon name="arrow-swap" :size="14" />
              </button>
              <div class="direction-node">{{ directionRightLabel }}</div>
            </div>
          </div>
          <label>
            <span>Relation</span>
            <select v-model="relation">
              <option value="depends-on">depends-on</option>
              <option value="used-in">used-in</option>
              <option value="compares-with">compares-with</option>
            </select>
          </label>
          <NodeFilterList v-model="targetId" label="Target" :exclude-ids="[props.nodeId]" include-domains />
          <div class="preview-line">{{ preview || "Choose a target to preview the link." }}</div>
          <div v-if="visibleFormError" class="form-error">{{ visibleFormError }}</div>
          <div class="form-actions">
            <button class="hud-button" :disabled="addLinkSaving" @click="closeForm">Cancel</button>
            <button class="hud-button" :disabled="!canSubmit" style="--button-color: var(--career)" @click="submitLink">
              {{ addLinkSaving ? "Adding..." : "Add Link" }}
            </button>
          </div>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Hierarchy</div>
          <div class="sub-label">Parent</div>
          <button v-for="edge in hierarchy.parentEdges" :key="edge.id" class="relation-row"
            @click="openNodeGraph(edge.source)">
            {{ getNodeTitleOrId(edge.source) }}
          </button>
          <p v-if="!hierarchy.parentEdges.length" class="empty-line">No parent edge</p>

          <div class="sub-label">Children</div>
          <button v-for="edge in hierarchy.childEdges" :key="edge.id" class="relation-row"
            @click="openNodeGraph(edge.target)">
            {{ getNodeTitleOrId(edge.target) }}
          </button>
          <p v-if="!hierarchy.childEdges.length" class="empty-line">No child edges</p>
        </section>

        <section class="sidebar-section">
          <div class="section-label">Relations</div>
          <button v-for="edge in directRelations" :key="edge.id" class="relation-row relation-row--direct"
            :style="relationStyle(edge)" @click="openNodeGraph(getOtherNodeId(edge, node.id))"
            @contextmenu="openContextMenu($event, edge)">
            <span class="relation-endpoint relation-endpoint--source" :title="getNodeTitleOrId(edge.source)">
              <strong>{{ getNodeTitleOrId(edge.source) }}</strong>
              <small>source</small>
            </span>
            <span class="relation-middle" :class="relationMiddleClass(edge)" :title="relationLabel(edge)">
              <strong>{{ relationLabel(edge) }}</strong>
              <span class="relation-trace" aria-hidden="true">
                <span class="relation-arrow relation-arrow--left"></span>
                <span class="relation-arrow relation-arrow--right"></span>
              </span>
            </span>
            <span class="relation-endpoint relation-endpoint--target" :title="getNodeTitleOrId(edge.target)">
              <strong>{{ getNodeTitleOrId(edge.target) }}</strong>
              <small>target</small>
            </span>
          </button>
          <p v-if="!directRelations.length" class="empty-line">No direct relations</p>
        </section>
      </div>

      <RelationContextMenu :edge="contextMenu.edge" :x="contextMenu.x" :y="contextMenu.y" @close="closeContextMenu"
        @delete="requestDeleteRelation" @edit="requestEditRelation" />
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

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid var(--button-color, var(--border-muted));
  border-left-width: 4px;
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-ui);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
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

.stage-summary {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 4px;
  border-left: 4px solid var(--relation-node-color, var(--graphics));
  background: var(--background-panel);
  padding: 8px 10px;
}

.stage-summary strong,
.stage-summary span {
  overflow: hidden;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.4;
  text-overflow: ellipsis;
}

.stage-summary strong {
  color: var(--text-primary);
}

.stage-summary span,
.stage-summary.is-external {
  color: var(--text-muted);
}

.sidebar-section {
  display: grid;
  gap: 10px;
  justify-items: start;
  border-bottom: 1px solid var(--border-muted);
  padding: 0 0 16px;
  margin-bottom: 16px;
}

.section-label,
.sub-label,
label span,
.direction-field>span {
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

.direction-field {
  display: grid;
  gap: 6px;
}

.direction-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
  align-items: stretch;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.direction-node,
.direction-arrow {
  min-width: 0;
  min-height: 38px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  line-height: 1.2;
}

.direction-node {
  display: grid;
  align-items: center;
  overflow: hidden;
  padding: 8px;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.direction-arrow {
  display: grid;
  place-items: center;
  border-left: 1px solid var(--border-muted);
  border-right: 1px solid var(--border-muted);
  color: var(--career);
  cursor: pointer;
}

.direction-arrow:hover {
  background: var(--background-main);
  color: var(--text-primary);
}

.target-tree {
  display: grid;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.target-domain-group {
  display: grid;
}

.target-domain-row,
.target-node-row {
  width: 100%;
  min-width: 0;
  border: 0;
  border-bottom: 1px solid var(--border-muted);
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  gap: 3px;
  padding: 8px;
  text-align: left;
}

.target-domain-row {
  border-left: 5px solid var(--target-domain-color, var(--graphics));
  background: var(--background-main);
}

.target-domain-row.is-static {
  cursor: default;
}

.target-domain-row:disabled {
  opacity: 1;
}

.target-node-row {
  border-left: 2px solid var(--target-domain-color, var(--graphics));
  padding-left: var(--target-indent, 24px);
}

.target-domain-row span,
.target-node-row span {
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.target-domain-row small,
.target-node-row small {
  overflow: hidden;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 700;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.target-domain-row:not(:disabled):hover,
.target-node-row:hover,
.target-domain-row.is-selected,
.target-node-row.is-selected {
  background: var(--background-main);
  outline: 1px solid var(--target-domain-color, var(--border-primary));
  outline-offset: -1px;
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

.pin-action.is-pinned {
  color: var(--text-primary);
}

.pin-action.is-pinned .pin-icon {
  color: var(--text-primary);
}

.pin-action.is-unpinned {
  color: var(--text-muted);
}

.pin-action.is-unpinned .pin-icon {
  color: var(--text-muted);
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
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) minmax(0, 2fr);
  gap: 8px;
  align-items: stretch;
  border-left-color: var(--border-muted);
}

.relation-endpoint,
.relation-middle {
  min-width: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 5px;
  min-height: 54px;
  text-align: center;
}

.relation-endpoint strong,
.relation-middle strong {
  display: block;
  max-width: 100%;
  overflow: hidden;
  font-size: var(--font-size-small);
  font-weight: 900;
  line-height: 1.2;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.relation-endpoint strong {
  color: var(--text-primary);
}

.relation-middle {
  color: var(--relation-row-color, var(--text-primary));
  text-align: center;
}

.relation-middle strong {
  color: var(--relation-row-color, var(--text-primary));
}

.relation-row small,
.relation-endpoint small {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 700;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.relation-trace {
  display: block;
  width: 100%;
  height: 12px;
  position: relative;
}

.relation-trace::before {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  transform: translateY(-50%);
}

.relation-middle--depends-on .relation-trace::before {
  border-top-style: dashed;
}

.relation-middle--used-in .relation-trace::before {
  border-top-style: solid;
}

.relation-middle--compares-with .relation-trace::before {
  border-top-style: double;
  border-top-width: 4px;
}

.relation-middle--compares-with .relation-trace::before {
  right: 12px;
  left: 12px;
}

.relation-arrow {
  display: none;
  content: "";
  position: absolute;
  top: 50%;
  width: 7px;
  height: 7px;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  border-right: 2px solid var(--relation-row-color, var(--border-primary));
}

.relation-arrow--right {
  right: 2px;
  transform: translateY(-50%) rotate(45deg);
}

.relation-arrow--left {
  left: 2px;
  transform: translateY(-50%) rotate(-135deg);
}

.relation-middle--used-in .relation-arrow--right,
.relation-middle--compares-with .relation-arrow--left,
.relation-middle--compares-with .relation-arrow--right {
  display: block;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
