<script setup>
import AppIcon from "../ui/AppIcon.vue";

defineProps({
  canSaveNote: {
    type: Boolean,
    default: false,
  },
  dirty: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["cancel-edit", "edit", "save", "show-graph"]);
</script>

<template>
  <div class="note-toolbar">
    <template v-if="mode === 'edit'">
      <button class="hud-button button-with-icon" :disabled="!canSaveNote || !dirty || saving" @click="$emit('save')">
        <AppIcon name="save" />
        <span class="button-icon-label">Save</span>
      </button>
      <button class="hud-button button-with-icon" :disabled="saving" @click="$emit('cancel-edit')">
        <AppIcon name="x" />
        <span class="button-icon-label">Cancel</span>
      </button>
    </template>
    <template v-else>
      <button class="hud-button button-with-icon" style="--button-color: var(--graphics)" @click="$emit('edit')">
        <AppIcon name="edit" />
        <span class="button-icon-label">Edit</span>
      </button>
      <button class="hud-button button-with-icon" style="--button-color: var(--simulation)" @click="$emit('show-graph')">
        <AppIcon name="graph" />
        <span class="button-icon-label">Show in Graph</span>
      </button>
      <div class="note-meta">
        {{ canSaveNote ? "desktop vault / writable" : "static sample / read only" }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 54px;
  min-width: 0;
  overflow-x: auto;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.note-meta {
  margin-left: auto;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .note-meta {
    display: none;
  }
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
