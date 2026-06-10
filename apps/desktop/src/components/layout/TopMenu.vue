<script setup>
import AppIcon from "../ui/AppIcon.vue";

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
      <button class="hud-button button-with-icon" @click="$emit('open-vault')">
        <AppIcon name="folder-open" />
        <span class="button-icon-label">Open Vault</span>
      </button>
      <button class="hud-button button-with-icon" style="--button-color: var(--graphics)" @click="$emit('open-dialog', 'new-note')">
        <AppIcon name="file-plus" />
        <span class="button-icon-label">New Note</span>
      </button>
      <button class="hud-button button-with-icon" disabled title="Git panel is not implemented yet">
        <AppIcon name="git-branch" />
        <span class="button-icon-label">Git</span>
      </button>
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
