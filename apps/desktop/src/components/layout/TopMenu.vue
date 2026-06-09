<script setup>
defineProps({
  appTitle: {
    type: String,
    default: "Knowledge Base",
  },
  uiFontScale: {
    type: Number,
    default: 1,
  },
});

defineEmits(["open-dialog", "open-vault", "show-view"]);
</script>

<template>
  <header class="top-menu">
    <div class="app-mark">{{ appTitle || "Knowledge Base" }}</div>
    <nav class="top-actions" aria-label="Application actions">
      <span class="font-scale-indicator">FONT {{ Math.round(uiFontScale * 100) }}%</span>
      <button class="hud-button" @click="$emit('open-vault')">Open Vault</button>
      <button class="hud-button" style="--button-color: var(--graphics)" @click="$emit('open-dialog', 'new-note')">
        New Note
      </button>
      <button class="hud-button" style="--button-color: var(--career)" @click="$emit('open-dialog', 'new-link')">
        New Link
      </button>
      <button class="hud-button" disabled title="Git panel is not implemented yet">Git</button>
    </nav>
  </header>
</template>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  height: 44px;
  min-width: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
  padding: 0 16px;
}

.app-mark {
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-ui);
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
  padding-block: 4px;
}

.font-scale-indicator {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
