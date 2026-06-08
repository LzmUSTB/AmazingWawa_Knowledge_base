<script setup>
defineProps({
  mode: {
    type: String,
    required: true,
  },
});

defineEmits(["set-mode", "show-graph"]);
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
      @click="$emit('set-mode', 'edit')"
    >
      Edit
    </button>
    <button class="hud-button" @click="$emit('set-mode', 'read')">Save</button>
    <button class="hud-button" @click="$emit('set-mode', 'read')">Cancel</button>
    <button class="hud-button" style="--button-color: var(--simulation)" @click="$emit('show-graph')">
      Show in Graph
    </button>
    <div class="note-meta">note.md rendered / meta.yaml summarized</div>
  </div>
</template>

<style scoped>
.note-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
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
</style>
