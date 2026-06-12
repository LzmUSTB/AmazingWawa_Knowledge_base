<script setup>
import { computed } from "vue";

defineOptions({ name: "FileTreeNode" });

const props = defineProps({
  node: { type: Object, required: true },
  activeNoteId: { type: String, required: true },
  depth: { type: Number, default: 0 },
  domainColor: { type: String, required: true },
});

const emit = defineEmits(["context-menu", "open-note"]);

const displayTitle = computed(() => props.node.displayTitle || props.node.titleLocale || props.node.title || props.node.id);
const subtitle = computed(() => {
  const englishTitle = props.node.title || props.node.id;
  return englishTitle === displayTitle.value ? "" : englishTitle;
});
const tooltipTitle = computed(() => (subtitle.value ? `${displayTitle.value} / ${subtitle.value}` : displayTitle.value));
const hasActiveDescendant = computed(() => containsActiveNode(props.node));
const shouldShowChildren = computed(() => Boolean(props.node.children?.length && hasActiveDescendant.value));

function containsActiveNode(node) {
  if (!props.activeNoteId || !node) return false;
  if (node.id === props.activeNoteId) return true;
  return Boolean(node.children?.some((child) => containsActiveNode(child)));
}
</script>

<template>
  <div class="tree-node">
    <button
      class="concept-row"
      :class="{ 'is-active': node.id === activeNoteId, 'has-note': node.hasNote }"
      :style="{ '--domain-color': domainColor, '--tree-depth': depth }"
      :title="tooltipTitle"
      @click="$emit('open-note', node.id)"
      @contextmenu.prevent.stop="$emit('context-menu', $event, { kind: 'node', id: node.id })"
    >
      <span class="tree-title">{{ displayTitle }}</span>
      <span v-if="subtitle" class="tree-id">{{ subtitle }}</span>
    </button>
    <div v-if="shouldShowChildren" class="node-children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :active-note-id="activeNoteId"
        :depth="depth + 1"
        :domain-color="domainColor"
        :node="child"
        @context-menu="(event, target) => $emit('context-menu', event, target)"
        @open-note="$emit('open-note', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  min-width: 0;
}

.concept-row {
  width: 100%;
  min-height: 28px;
  padding: 3px 8px 3px calc(14px + var(--tree-depth) * 14px);
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-align: left;
}

.concept-row.has-note .tree-title::after {
  color: var(--domain-color);
  content: "  note";
  font-size: 0.82em;
  text-transform: uppercase;
}

.tree-title,
.tree-id {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-title {
  color: var(--text-secondary);
}

.tree-id {
  margin-top: 2px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.concept-row:hover,
.concept-row.is-active {
  border-left-color: var(--domain-color);
  outline: 1px solid var(--domain-color);
  background: var(--background-panel);
  color: var(--text-primary);
}

.concept-row:hover .tree-title,
.concept-row.is-active .tree-title {
  color: var(--text-primary);
}
</style>
