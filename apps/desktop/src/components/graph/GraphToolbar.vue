<script setup>
defineEmits(["open-dialog", "show-graph"]);
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
    <button class="hud-button" style="--button-color: var(--simulation)">Local</button>
    <button class="hud-button">Reset View</button>
    <button class="hud-button">Fit</button>
    <div class="graph-stats">nodes: 43 / edges: 62 / layout: pcb-grid</div>
  </div>
</template>

<style scoped>
.graph-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
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
</style>
