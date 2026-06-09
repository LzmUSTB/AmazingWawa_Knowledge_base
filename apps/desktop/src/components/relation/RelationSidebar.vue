<script setup>
import { computed, ref, watch } from "vue";
import { findGraphNode, getActiveVault, getGraphEdges, getGraphNodes } from "../../graph/graph-data-store.js";
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
const queryText = computed(() => targetSearch.value.trim().toLowerCase());
const targetGroups = computed(() => {
  const nodes = getGraphNodes();
  const domains = getActiveVault().domains || [];
  const nodeById = new Map(nodes.map((item) => [item.id, item]));
  const childrenByParent = new Map();
  getGraphEdges()
    .filter((edge) => edge.relation === "contains")
    .forEach((edge) => {
      childrenByParent.set(edge.source, [...(childrenByParent.get(edge.source) || []), edge.target]);
    });
  const visited = new Set();
  const groups = domains.map((domain) => {
    const domainNode = nodeById.get(domain.id);
    const rows = buildTargetRows(domain.id, 1, new Set([domain.id]), visited, childrenByParent, nodeById);
    const domainMatches = matchesTarget(domainNode || domain);

    if (domainNode?.id) {
      visited.add(domainNode.id);
    }

    const ungrouped = nodes
      .filter((item) => item.domain === domain.id && item.id !== props.nodeId && !visited.has(item.id))
      .filter(matchesTarget)
      .map((item) => ({ node: item, depth: 1, kind: "ungrouped" }));

    return {
      domain,
      domainNode,
      domainSelectable: Boolean(domainNode && domainNode.id !== props.nodeId),
      domainVisible: !queryText.value || domainMatches,
      color: getDomainColor(domain.id),
      rows: [...rows, ...ungrouped],
    };
  });

  return groups.filter((group) => group.domainVisible || group.rows.length);
});

const selectedTarget = computed(() => findGraphNode(targetId.value));
const directionLeftLabel = computed(() => {
  if (direction.value === "out") return node.value?.title || "Current Node";
  return selectedTarget.value?.title || "Target";
});
const directionRightLabel = computed(() => {
  if (direction.value === "out") return selectedTarget.value?.title || "Target";
  return node.value?.title || "Current Node";
});
const directionTitle = computed(() => (direction.value === "out" ? "Current node points to target" : "Target points to current node"));

function matchesTarget(item) {
  if (!item) return false;
  const query = targetSearch.value.trim().toLowerCase();
  if (!query) return true;
  return `${item.title || ""} ${item.id || ""} ${item.domain || item.id || ""}`.toLowerCase().includes(query);
}

function buildTargetRows(parentId, depth, path, visited, childrenByParent, nodeById) {
  return (childrenByParent.get(parentId) || []).flatMap((childId) => {
    if (path.has(childId)) return [];
    const childNode = nodeById.get(childId);
    const childRows = buildTargetRows(childId, depth + 1, new Set([...path, childId]), visited, childrenByParent, nodeById);
    const includeSelf = childNode && childNode.id !== props.nodeId && (matchesTarget(childNode) || childRows.length);
    if (childNode?.id) {
      visited.add(childNode.id);
    }
    return includeSelf ? [{ node: childNode, depth, kind: "node" }, ...childRows] : childRows;
  });
}

function toggleDirection() {
  direction.value = direction.value === "out" ? "in" : "out";
}

function selectTarget(id) {
  targetId.value = id;
}

function relationStyle(edge) {
  return { "--relation-row-color": relationColor(edge.relation) };
}

function targetDepthStyle(row, group) {
  return {
    "--target-domain-color": group.color,
    "--target-indent": `${10 + row.depth * 14}px`,
  };
}

function relationColor(relationName) {
  if (relationName === "depends-on") return "var(--relation-depends-on)";
  if (relationName === "used-in") return "var(--relation-used-in)";
  if (relationName === "compares-with") return "var(--relation-compares-with)";
  return "var(--graphics)";
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
          <div class="direction-field">
            <span>Direction</span>
            <div class="direction-composer" :title="directionTitle">
              <div class="direction-node">{{ directionLeftLabel }}</div>
              <button class="direction-arrow" title="Reverse direction" type="button" @click="toggleDirection">
                -&gt;
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
          <label>
            <span>Target</span>
            <input v-model="targetSearch" placeholder="Filter nodes" spellcheck="false" />
          </label>
          <div class="target-tree">
            <section
              v-for="group in targetGroups"
              :key="group.domain.id"
              class="target-domain-group"
              :style="{ '--target-domain-color': group.color }"
            >
              <button
                class="target-domain-row"
                :class="{ 'is-selected': targetId === group.domainNode?.id, 'is-static': !group.domainSelectable }"
                type="button"
                :disabled="!group.domainSelectable"
                @click="group.domainSelectable && selectTarget(group.domainNode.id)"
              >
                <span>{{ group.domain.title || group.domain.id }}</span>
                <small>{{ group.domain.id }}</small>
              </button>
              <button
                v-for="row in group.rows"
                :key="row.node.id"
                class="target-node-row"
                :class="{ 'is-selected': targetId === row.node.id }"
                :style="targetDepthStyle(row, group)"
                type="button"
                @click="selectTarget(row.node.id)"
              >
                <span>{{ row.node.title || row.node.id }}</span>
                <small>{{ row.node.id }} / {{ row.node.type || "node" }}</small>
              </button>
            </section>
            <p v-if="!targetGroups.length" class="empty-line">No matching target nodes</p>
          </div>
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
            :style="relationStyle(edge)"
            @click="openNodeGraph(getOtherNodeId(edge, node.id))"
          >
            <span class="relation-label">{{ formatRelationLabel(edge) }}</span>
            <small>{{ getNodeTitleOrId(getOtherNodeId(edge, node.id)) }}</small>
            <span class="relation-trace" :class="`relation-trace--${edge.relation}`" aria-hidden="true"></span>
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
label span,
.direction-field > span {
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
  gap: 5px;
  border-left-color: var(--relation-row-color, var(--relation-node-color, var(--border-primary)));
}

.relation-label {
  color: var(--relation-row-color, var(--text-primary));
}

.relation-row small {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 700;
}

.relation-trace {
  display: block;
  width: 100%;
  height: 8px;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  position: relative;
}

.relation-trace::after {
  content: "";
  position: absolute;
  top: -5px;
  right: 0;
  width: 7px;
  height: 7px;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  border-right: 2px solid var(--relation-row-color, var(--border-primary));
  transform: rotate(45deg);
}

.relation-trace--depends-on {
  border-top-style: dashed;
}

.relation-trace--used-in {
  border-top-width: 4px;
}

.relation-trace--compares-with {
  height: 10px;
  border-top-style: double;
  border-top-width: 4px;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
