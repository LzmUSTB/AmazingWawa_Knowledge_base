<script setup>
import { computed, ref, watch } from "vue";
import { findGraphNode, getActiveVault, getGraphEdges, getGraphNodes } from "../../graph/graph-data-store.js";
import { getNodeTitleOrId } from "../../graph/graph-relations.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const LINK_RELATIONS = ["depends-on", "used-in", "compares-with"];

const props = defineProps({
  edgeId: {
    type: String,
    required: true,
  },
  error: {
    type: String,
    default: "",
  },
  saving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "save"]);

const sourceId = ref("");
const targetId = ref("");
const relation = ref("depends-on");
const targetSearch = ref("");

const originalEdge = computed(() => getGraphEdges().find((edge) => edge.id === props.edgeId));
const sourceNode = computed(() => findGraphNode(sourceId.value));
const targetNode = computed(() => findGraphNode(targetId.value));
const queryText = computed(() => targetSearch.value.trim().toLowerCase());
const changed = computed(
  () =>
    originalEdge.value &&
    (sourceId.value !== originalEdge.value.source ||
      targetId.value !== originalEdge.value.target ||
      relation.value !== originalEdge.value.relation),
);
const preview = computed(() =>
  sourceId.value && targetId.value
    ? `${getNodeTitleOrId(sourceId.value)} ${relation.value} ${getNodeTitleOrId(targetId.value)}`
    : "Choose source and target to preview the relation.",
);
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
  return domains
    .map((domain) => {
      const domainNode = nodeById.get(domain.id);
      const rows = buildTargetRows(domain.id, 1, new Set([domain.id]), visited, childrenByParent, nodeById);
      const domainVisible = domainNode?.id !== sourceId.value && matchesTarget(domainNode || domain);
      if (domainNode?.id) visited.add(domainNode.id);
      const ungrouped = nodes
        .filter((item) => item.domain === domain.id && item.id !== sourceId.value && !visited.has(item.id))
        .filter(matchesTarget)
        .map((item) => ({ node: item, depth: 1, kind: "ungrouped" }));
      return {
        domain,
        domainNode,
        domainSelectable: Boolean(domainNode && domainNode.id !== sourceId.value),
        domainVisible: !queryText.value || domainVisible,
        color: getDomainColor(domain.id),
        rows: [...rows, ...ungrouped],
      };
    })
    .filter((group) => group.domainVisible || group.rows.length);
});

const localError = computed(() => {
  if (!originalEdge.value) return "Original relation was not found.";
  if (originalEdge.value.relation === "contains") return "Contains relations cannot be edited here.";
  if (!sourceNode.value) return "Source node does not exist.";
  if (!targetNode.value) return "Target node does not exist.";
  if (sourceId.value === targetId.value) return "Source and target must be different.";
  if (!LINK_RELATIONS.includes(relation.value)) return "Choose a supported relation.";
  if (duplicateEdge.value) return duplicateEdge.value;
  if (!changed.value) return "No changes to save.";
  return "";
});
const canSave = computed(() => changed.value && !localError.value && !props.saving);
const visibleError = computed(() => props.error || (localError.value === "No changes to save." ? "" : localError.value));
const duplicateEdge = computed(() => {
  const edgeId = `${sourceId.value}-${relation.value}-${targetId.value}`;
  const edges = getGraphEdges();
  if (edges.some((edge) => edge.id === edgeId && edge.id !== props.edgeId)) return `Edge "${edgeId}" already exists.`;
  if (
    edges.some(
      (edge) =>
        edge.id !== props.edgeId &&
        edge.source === sourceId.value &&
        edge.target === targetId.value &&
        edge.relation === relation.value,
    )
  ) {
    return `Duplicate ${sourceId.value}/${targetId.value}/${relation.value} edge.`;
  }
  if (
    relation.value === "compares-with" &&
    edges.some(
      (edge) =>
        edge.id !== props.edgeId &&
        edge.source === targetId.value &&
        edge.target === sourceId.value &&
        edge.relation === relation.value,
    )
  ) {
    return `Duplicate reverse compares-with edge for ${sourceId.value}/${targetId.value}.`;
  }
  return "";
});

watch(
  () => props.edgeId,
  () => resetForm(),
  { immediate: true },
);

function resetForm() {
  const edge = originalEdge.value;
  sourceId.value = edge?.source || "";
  targetId.value = edge?.target || "";
  relation.value = LINK_RELATIONS.includes(edge?.relation) ? edge.relation : "depends-on";
  targetSearch.value = "";
}

function matchesTarget(item) {
  if (!item) return false;
  const query = queryText.value;
  if (!query) return true;
  return `${item.title || ""} ${item.id || ""} ${item.domain || item.id || ""}`.toLowerCase().includes(query);
}

function buildTargetRows(parentId, depth, path, visited, childrenByParent, nodeById) {
  return (childrenByParent.get(parentId) || []).flatMap((childId) => {
    if (path.has(childId)) return [];
    const childNode = nodeById.get(childId);
    const childRows = buildTargetRows(childId, depth + 1, new Set([...path, childId]), visited, childrenByParent, nodeById);
    const includeSelf = childNode && childNode.id !== sourceId.value && (matchesTarget(childNode) || childRows.length);
    if (childNode?.id) visited.add(childNode.id);
    return includeSelf ? [{ node: childNode, depth, kind: "node" }, ...childRows] : childRows;
  });
}

function targetDepthStyle(row, group) {
  return {
    "--target-domain-color": group.color,
    "--target-indent": `${10 + row.depth * 14}px`,
  };
}

function toggleDirection() {
  const previousSource = sourceId.value;
  sourceId.value = targetId.value;
  targetId.value = previousSource;
}

function selectTarget(id) {
  targetId.value = id;
}

function submit() {
  if (!canSave.value) return;
  emit("save", {
    oldEdgeId: props.edgeId,
    sourceId: sourceId.value,
    targetId: targetId.value,
    relation: relation.value,
  });
}
</script>

<template>
  <div class="dialog-card edit-relation">
    <div class="dialog-accent"></div>
    <header>
      <h2>Edit Relation</h2>
      <p>Update a non-contains graph edge in graph.yaml.</p>
    </header>

    <div class="relation-form-section">
      <span>Source / Direction</span>
      <div class="direction-composer">
        <div class="direction-node">{{ sourceNode?.title || sourceId || "Source Node" }}</div>
        <button class="direction-arrow" title="Swap source and target" type="button" @click="toggleDirection">
          -&gt;
        </button>
        <div class="direction-node">{{ targetNode?.title || targetId || "Target Node" }}</div>
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
      <span>Target Picker</span>
      <input v-model="targetSearch" placeholder="Filter nodes" spellcheck="false" />
    </label>

    <div class="target-tree">
      <section v-for="group in targetGroups" :key="group.domain.id" class="target-domain-group" :style="{ '--target-domain-color': group.color }">
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

    <div class="preview-line">{{ preview }}</div>
    <div v-if="visibleError" class="form-error">{{ visibleError }}</div>

    <footer>
      <button class="hud-button" :disabled="saving" @click="$emit('close')">Cancel</button>
      <button class="hud-button" :disabled="!canSave" style="--button-color: var(--career)" @click="submit">
        {{ saving ? "Saving..." : "Save Relation" }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.edit-relation {
  width: min(720px, calc(100vw - 48px));
  max-height: calc(100vh - 88px);
  overflow: auto;
}

.relation-form-section {
  display: grid;
  gap: 8px;
  margin-inline: 28px;
}

.relation-form-section > span,
.target-tree span,
.empty-line {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.direction-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px minmax(0, 1fr);
  align-items: stretch;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
}

.direction-node,
.direction-arrow {
  min-width: 0;
  min-height: 42px;
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
  padding: 8px 10px;
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
  background: var(--background-panel);
  color: var(--text-primary);
}

.target-tree {
  display: grid;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  margin-inline: 28px;
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
  background: var(--background-panel);
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
  text-overflow: ellipsis;
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
  background: var(--background-panel);
  outline: 1px solid var(--target-domain-color, var(--border-primary));
  outline-offset: -1px;
}

.preview-line,
.form-error {
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.45;
  margin-inline: 28px;
  padding: 8px;
}

.form-error {
  border-color: var(--game-dev);
  color: var(--game-dev);
}

.empty-line {
  margin: 0;
  padding: 10px;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
