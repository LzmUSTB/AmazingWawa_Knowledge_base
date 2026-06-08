<script setup>
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

defineEmits(["cancel-edit", "edit", "save", "set-mode", "show-graph"]);
</script>

<template>
  <div class="note-toolbar">
    <button class="hud-button" :class="{ 'is-active': mode === 'read' }" @click="$emit('set-mode', 'read')">
      Read
    </button>
    <button
      class="hud-button"
      :class="{ 'is-active': mode === 'edit' }"
      style="--button-color: var(--graphics)"
      @click="$emit('edit')"
    >
      Edit
    </button>
    <button class="hud-button" :disabled="!canSaveNote || !dirty || saving" @click="$emit('save')">
      Save
    </button>
    <button class="hud-button" :disabled="mode !== 'edit'" @click="$emit('cancel-edit')">Cancel</button>
    <div class="note-meta">
      {{ canSaveNote ? "desktop vault / writable" : "static sample / read only" }}
    </div>
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
  padding: 0 18px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.note-meta {
  margin-left: auto;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
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
