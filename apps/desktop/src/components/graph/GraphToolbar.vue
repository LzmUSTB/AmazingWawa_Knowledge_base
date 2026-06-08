<script setup>
defineProps({
  edgeCount: {
    type: Number,
    required: true,
  },
  layoutMode: {
    type: String,
    required: true,
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

defineEmits(["fit-view", "open-dialog", "show-graph", "show-local"]);
</script>

<template>
  <div class="graph-toolbar">
    <button class="hud-button">Search</button>
    <button
      class="hud-button"
      style="--button-color: var(--graphics)"
      @click="$emit('open-dialog', 'new-note')"
    >
      New Node
    </button>
    <button
      class="hud-button"
      style="--button-color: var(--career)"
      @click="$emit('open-dialog', 'new-link')"
    >
      New Link
    </button>
    <button class="hud-button" @click="$emit('show-graph', 'root')">Global</button>
    <button
      class="hud-button"
      :disabled="localDisabled"
      style="--button-color: var(--simulation)"
      @click="$emit('show-local')"
    >
      Local
    </button>
    <button class="hud-button" @click="$emit('fit-view')">Fit</button>
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
  padding: 0 18px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.graph-stats {
  margin-left: auto;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
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
