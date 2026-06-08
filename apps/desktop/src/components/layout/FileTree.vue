<script setup>
import { computed } from "vue";
import { getActiveVault } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

defineProps({
  activeDomain: {
    type: String,
    required: true,
  },
  activeNoteId: {
    type: String,
    required: true,
  },
});

defineEmits(["open-domain", "open-note"]);

const fileTree = computed(() => getActiveVault().fileTree);
</script>

<template>
  <aside class="file-tree">
    <div class="panel-label">Vault Source</div>
    <button class="tree-root" @click="$emit('open-domain', activeDomain)">vault/</button>

    <div class="tree-list">
      <section v-for="domain in fileTree" :key="domain.id" class="tree-domain">
        <button
          class="domain-row"
          :class="{ 'is-active': domain.id === activeDomain }"
          :style="{ '--domain-color': getDomainColor(domain.id) }"
          @click="$emit('open-domain', domain.id)"
        >
          <span class="domain-marker"></span>
          <span>{{ domain.id }}</span>
        </button>

        <div
          v-if="domain.id === activeDomain || domain.children.length"
          class="concept-list"
        >
          <button
            v-for="node in domain.children"
            :key="node.id"
            class="concept-row"
            :class="{ 'is-active': node.id === activeNoteId }"
            :style="{ '--domain-color': getDomainColor(domain.id) }"
            @click="$emit('open-note', node.id)"
          >
            {{ node.id }}
          </button>
        </div>
      </section>
    </div>

    <div class="tree-files">
      <button>graph.yaml</button>
      <button>domains.yaml</button>
      <button>assets/</button>
    </div>
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
  border-right: 1px solid var(--border-primary);
  background: var(--background-main);
}

.panel-label {
  margin: 18px 16px 0;
}

.tree-root,
.domain-row,
.concept-row,
.tree-files button {
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
  font-size: 13px;
  font-weight: 800;
}

.tree-list {
  flex: 1;
  min-height: 0;
  padding: 8px 10px 0;
  overflow: auto;
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
  font-size: 11px;
  font-weight: 800;
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

.concept-row {
  min-height: 24px;
  padding: 0 8px 0 14px;
  border-left: 3px solid transparent;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
}

.concept-row:hover,
.concept-row.is-active {
  border-left-color: var(--domain-color);
  outline: 1px solid var(--domain-color);
  background: var(--background-panel);
  color: var(--text-primary);
}

.tree-files {
  display: grid;
  gap: 6px;
  margin: 0 16px 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border-muted);
}

.tree-files button {
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
}
</style>
