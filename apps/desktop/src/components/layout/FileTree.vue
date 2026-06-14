<script setup>
import { computed, ref } from "vue";
import { getActiveVault } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";
import AppIcon from "../ui/AppIcon.vue";
import FileTreeNode from "./FileTreeNode.vue";
import VaultContextMenu from "./VaultContextMenu.vue";

const props = defineProps({
  activeDomain: {
    type: String,
    required: true,
  },
  activeNoteId: {
    type: String,
    required: true,
  },
  activeNodeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["delete-entity", "edit-entity", "open-domain", "open-note", "show-root", "toggle-sidebar"]);

const fileTree = computed(() => getActiveVault().fileTree);
const menu = ref(null);

function hasActiveDescendant(node) {
  if (!node || !props.activeNodeId) return false;
  if (node.id === props.activeNodeId) return true;
  return Boolean(node.children?.some((child) => hasActiveDescendant(child)));
}

function isDomainExpanded(domain) {
  return Boolean(props.activeNodeId && (domain.id === props.activeNodeId || hasActiveDescendant(domain)));
}

function displayTitle(entity) {
  return entity?.displayTitle || entity?.titleLocale || entity?.title || entity?.id || "";
}

function subtitle(entity) {
  const englishTitle = entity?.title || entity?.id || "";
  return englishTitle === displayTitle(entity) ? "" : englishTitle;
}

function tooltipTitle(entity) {
  const secondary = subtitle(entity);
  return secondary ? `${displayTitle(entity)} / ${secondary}` : displayTitle(entity);
}

function openContextMenu(event, target) {
  menu.value = {
    x: Math.min(event.clientX, window.innerWidth - 150),
    y: Math.min(event.clientY, window.innerHeight - 84),
    target,
  };
}

function closeContextMenu() {
  menu.value = null;
}

function emitMenuAction(action, target) {
  closeContextMenu();
  emit(action, target);
}
</script>

<template>
  <aside class="file-tree">
    <header class="tree-header">
      <div class="panel-label">Vault Source</div>
      <button class="sidebar-toggle hud-button button-icon-only" title="Hide vault sidebar"
        aria-label="Hide vault sidebar" @click="$emit('toggle-sidebar')">
        <AppIcon name="chevron-left" :size="13" />
      </button>
    </header>
    <button class="tree-root" @click="$emit('show-root')">vault/</button>

    <div class="tree-list">
      <section v-for="domain in fileTree" :key="domain.id" class="tree-domain">
        <button class="domain-row" :class="{ 'is-active': domain.id === activeNodeId }"
          :style="{ '--domain-color': getDomainColor(domain.id) }" @click="$emit('open-domain', domain.id)"
          @contextmenu.prevent.stop="openContextMenu($event, { kind: 'domain', id: domain.id })">
          <span class="domain-marker"></span>
          <span class="tree-text" :title="tooltipTitle(domain)">
            <span class="tree-title">{{ displayTitle(domain) }}</span>
            <span v-if="subtitle(domain)" class="tree-id">{{ subtitle(domain) }}</span>
          </span>
        </button>

        <div v-if="isDomainExpanded(domain)" class="concept-list">
          <FileTreeNode v-for="node in domain.children" :key="node.id" :active-note-id="activeNodeId"
            :domain-color="getDomainColor(domain.id)" :node="node" @context-menu="openContextMenu"
            @open-note="$emit('open-note', $event)" />
        </div>
      </section>
    </div>

    <VaultContextMenu :menu="menu" @close="closeContextMenu" @delete="emitMenuAction('delete-entity', $event)"
      @edit="emitMenuAction('edit-entity', $event)" />
  </aside>
</template>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  width: 260px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--background-main);
}

.file-tree * {
  min-width: 0;
}

.panel-label {
  margin: 0;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  gap: 8px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.sidebar-toggle {
  width: 28px;
  min-width: 28px;
  padding: 0;
}

.tree-root,
.domain-row,
.concept-row {
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.tree-root {
  margin-top: 18px;
  padding: 0 16px;
  color: var(--text-primary);
  font-size: var(--font-size-mono);
  font-weight: 800;
}

.tree-list {
  flex: 1;
  min-height: 0;
  padding: 8px 10px 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.tree-domain {
  margin-bottom: 8px;
}

.domain-row {
  display: grid;
  grid-template-columns: 4px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 28px;
  padding: 0 10px 0 7px;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  font-weight: 800;
}

.tree-text {
  min-width: 0;
}

.tree-title,
.tree-id {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-title {
  text-transform: none;
}

.tree-id {
  margin-top: 2px;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.domain-row:hover,
.domain-row.is-active {
  outline: 1px solid var(--border-primary);
  background: var(--background-elevated);
  color: var(--text-primary);
}

.domain-marker {
  width: 4px;
  height: 16px;
  background: var(--domain-color);
}

.concept-list {
  display: grid;
  gap: 2px;
  padding: 4px 0 4px 28px;
}
</style>
