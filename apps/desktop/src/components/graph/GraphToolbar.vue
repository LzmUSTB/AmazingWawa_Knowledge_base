<script setup>
import AppIcon from "../ui/AppIcon.vue";

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
  nodeCount: {
    type: Number,
    required: true,
  },
  canCreateNode: {
    type: Boolean,
    default: true,
  },
  stageCreateMode: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  "cancel-layout",
  "edit-layout",
  "fit-view",
  "open-dialog",
  "save-layout",
  "start-stage-create",
]);
</script>

<template>
  <div class="graph-toolbar">
    <button
      class="hud-button button-with-icon"
      style="--button-color: var(--graphics)"
      :disabled="!canCreateNode"
      :title="canCreateNode ? '' : 'Create or import a domain first.'"
      @click="$emit('open-dialog', 'new-node')"
    >
      <AppIcon name="plus-node" />
      <span class="button-icon-label">New Node</span>
    </button>
    <button class="hud-button button-with-icon" @click="$emit('fit-view')">
      <AppIcon name="fit-screen" />
      <span class="button-icon-label">Fit</span>
    </button>
    <button
      v-if="!layoutEditing && !layoutDirty"
      class="hud-button button-with-icon"
      style="--button-color: var(--language)"
      @click="$emit('edit-layout')"
    >
      <AppIcon name="layout-edit" />
      <span class="button-icon-label">Edit Layout</span>
    </button>
    <template v-else>
      <button
        class="hud-button button-with-icon graph-toolbar__button--stage"
        :class="{ 'is-active': stageCreateMode }"
        style="--button-color: var(--graphics)"
        type="button"
        @click="$emit('start-stage-create')"
      >
        <AppIcon name="stage" />
        <span class="button-icon-label">{{ stageCreateMode ? "Draw Stage" : "New Stage" }}</span>
      </button>
      <button
        class="hud-button button-with-icon"
        :disabled="!canSaveLayout || !layoutDirty || layoutSaveInProgress"
        style="--button-color: var(--language)"
        :title="canSaveLayout ? '' : 'Configure an active vault before saving layout.'"
        @click="$emit('save-layout')"
      >
        <AppIcon name="layout-save" />
        <span class="button-icon-label">Save Layout</span>
      </button>
      <button class="hud-button button-with-icon" :disabled="layoutSaveInProgress" @click="$emit('cancel-layout')">
        <AppIcon name="x" />
        <span class="button-icon-label">Cancel Layout</span>
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

.graph-toolbar__button--stage :deep(.app-icon) {
  display: block;
  width: 16px;
  height: 16px;
  pointer-events: none;
}

@media (max-width: 900px) {
  .graph-stats {
    display: none;
  }
}
</style>
