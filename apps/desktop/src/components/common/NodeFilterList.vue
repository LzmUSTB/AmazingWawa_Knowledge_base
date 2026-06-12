<script setup>
import { computed, ref, watch } from "vue";
import { getActiveVault, getGraphEdges, getGraphNodes } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  candidateIds: { type: Array, default: null },
  excludeIds: { type: Array, default: () => [] },
  includeDomains: { type: Boolean, default: false },
  label: { type: String, default: "Target" },
  placeholder: { type: String, default: "Filter nodes" },
});

const emit = defineEmits(["update:modelValue"]);

const search = ref("");
const excludeIdSet = computed(() => new Set(props.excludeIds || []));
const candidateIdSet = computed(() => (Array.isArray(props.candidateIds) ? new Set(props.candidateIds) : null));
const queryText = computed(() => search.value.trim().toLowerCase());

function displayTitle(entity) {
  return entity?.titleLocale || entity?.title || entity?.id || "";
}

function subtitle(entity) {
  if (!entity) return "";
  const englishTitle = entity.title || entity.id;
  const first = englishTitle === displayTitle(entity) ? entity.id : englishTitle;
  return `${first} / ${entity.type || entity.domain || "node"}`;
}

function matchesTarget(item) {
  if (!item) return false;
  const query = queryText.value;
  if (!query) return true;
  return `${item.titleLocale || ""} ${item.title || ""} ${item.id || ""} ${item.domain || ""} ${item.type || ""}`.toLowerCase().includes(query);
}

function canSelectNode(node) {
  if (!node?.id) return false;
  if (excludeIdSet.value.has(node.id)) return false;
  if (candidateIdSet.value && !candidateIdSet.value.has(node.id)) return false;
  if (node.type === "domain" && !props.includeDomains) return false;
  return true;
}

function buildRows(parentId, depth, path, visited, childrenByParent, nodeById) {
  return (childrenByParent.get(parentId) || []).flatMap((childId) => {
    if (path.has(childId)) return [];
    const childNode = nodeById.get(childId);
    const childRows = buildRows(childId, depth + 1, new Set([...path, childId]), visited, childrenByParent, nodeById);
    const includeSelf = childNode && canSelectNode(childNode) && (matchesTarget(childNode) || childRows.length);
    if (childNode?.id) visited.add(childNode.id);
    return includeSelf ? [{ node: childNode, depth, kind: "node" }, ...childRows] : childRows;
  });
}

const groups = computed(() => {
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
      const rows = buildRows(domain.id, 1, new Set([domain.id]), visited, childrenByParent, nodeById);
      const domainSelectable = Boolean(domainNode && canSelectNode(domainNode));
      const domainVisible = matchesTarget(domainNode || domain) && (domainSelectable || !candidateIdSet.value);
      if (domainNode?.id) visited.add(domainNode.id);

      const ungrouped = nodes
        .filter((item) => item.domain === domain.id && !visited.has(item.id) && canSelectNode(item) && matchesTarget(item))
        .map((item) => ({ node: item, depth: 1, kind: "ungrouped" }));

      return {
        domain,
        domainNode,
        domainSelectable,
        domainVisible,
        color: getDomainColor(domain.id),
        rows: [...rows, ...ungrouped],
      };
    })
    .filter((group) => group.domainVisible || group.rows.length);
});

function selectNode(id) {
  emit("update:modelValue", id);
}

function rowStyle(row, group) {
  return {
    "--target-domain-color": group.color,
    "--target-indent": `${10 + row.depth * 14}px`,
  };
}

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!nextValue) return;
    const exists = getGraphNodes().some((node) => node.id === nextValue && canSelectNode(node));
    if (!exists) emit("update:modelValue", "");
  },
);
</script>

<template>
  <div class="node-filter-list">
    <label>
      <span>{{ label }}</span>
      <input v-model="search" :placeholder="placeholder" spellcheck="false" />
    </label>
    <div class="target-tree">
      <section v-for="group in groups" :key="group.domain.id" class="target-domain-group" :style="{ '--target-domain-color': group.color }">
        <button
          class="target-domain-row"
          :class="{ 'is-selected': modelValue === group.domainNode?.id, 'is-static': !group.domainSelectable }"
          type="button"
          :disabled="!group.domainSelectable"
          @click="group.domainSelectable && selectNode(group.domainNode.id)"
        >
          <span>{{ displayTitle(group.domain) }}</span>
          <small>{{ group.domain.id }}</small>
        </button>
        <button
          v-for="row in group.rows"
          :key="row.node.id"
          class="target-node-row"
          :class="{ 'is-selected': modelValue === row.node.id }"
          :style="rowStyle(row, group)"
          type="button"
          @click="selectNode(row.node.id)"
        >
          <span>{{ displayTitle(row.node) }}</span>
          <small>{{ subtitle(row.node) }}</small>
        </button>
      </section>
      <p v-if="!groups.length" class="empty-line">No matching nodes</p>
    </div>
  </div>
</template>

<style scoped>
.node-filter-list {
  display: grid;
  gap: 8px;
  min-width: 0;
}

label {
  display: grid;
  gap: 6px;
}

label span {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

input {
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

input:focus {
  border-color: var(--border-primary);
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

.empty-line {
  margin: 0;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 10px;
  text-transform: uppercase;
}
</style>
