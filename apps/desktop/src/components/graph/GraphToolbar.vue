<script setup>
defineProps({
  edgeCount: {
    type: Number,
    required: true,
  },
  canSaveLayout: {
    type: Boolean,
    default: false,
  },
  layoutMode: {
    type: String,
    required: true,
  },
  layoutDirty: {
    type: Boolean,
    default: false,
  },
  layoutEditing: {
    type: Boolean,
    default: false,
  },
  layoutSaveInProgress: {
    type: Boolean,
    default: false,
  },
  localDisabled: {
    type: Boolean,
    default: false,
  },
  nodeCount: {
    type: Number,
    required: true,
  },
});

defineEmits([
  "cancel-layout",
  "edit-layout",
  "fit-view",
  "open-dialog",
  "save-layout",
  "show-graph",
  "show-local",
]);
</script>

<template>
  <div class="graph-toolbar">
    <button class="hud-button" style="--button-color: var(--graphics)" @click="$emit('open-dialog', 'new-note')">
      New Node
    </button>
    <button class="hud-button" style="--button-color: var(--career)" @click="$emit('open-dialog', 'new-link')">
      New Link
    </button>
    <button class="hud-button" @click="$emit('show-graph', 'root')">Global</button>
    <button class="hud-button" :disabled="localDisabled" style="--button-color: var(--simulation)"
      @click="$emit('show-local')">
      Local
    </button>
    <button class="hud-button" @click="$emit('fit-view')">Fit</button>
    <button
      v-if="!layoutEditing && !layoutDirty"
      class="hud-button"
      style="--button-color: var(--language)"
      @click="$emit('edit-layout')"
    >
      Edit Layout
    </button>
    <template v-else>
      <button
        class="hud-button"
        :disabled="!canSaveLayout || !layoutDirty || layoutSaveInProgress"
        style="--button-color: var(--language)"
        :title="canSaveLayout ? '' : 'Open a desktop vault folder before saving layout.'"
        @click="$emit('save-layout')"
      >
        Save Layout
      </button>
      <button class="hud-button" :disabled="layoutSaveInProgress" @click="$emit('cancel-layout')">
        Cancel Layout
      </button>
      <span class="layout-status">{{ layoutDirty ? "UNSAVED LAYOUT" : "LAYOUT EDITING" }}</span>
    </template>
    <div class="graph-stats">nodes: {{ nodeCount }} / edges: {{ edgeCount }} / layout: {{ layoutMode }}</div>
  </div>
</template>

<style scoped>
.graph-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 50px;
  min-width: 0;
  overflow-x: auto;
  padding: 8px 18px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.graph-stats {
  margin-left: auto;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.layout-status {
  color: var(--language);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

@media (max-width: 900px) {
  .graph-stats {
    display: none;
  }
}
</style>
