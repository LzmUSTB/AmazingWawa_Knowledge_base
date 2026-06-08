<script setup>
defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["open-dialog", "open-vault", "show-view", "toggle-sidebar"]);
</script>

<template>
  <header class="top-menu">
    <div class="app-mark">AMAZINGWAWA KNOWLEDGE BASE</div>
    <nav class="top-actions" aria-label="Application actions">
      <button class="hud-button" style="--button-color: var(--simulation)" @click="$emit('toggle-sidebar')">
        {{ sidebarCollapsed ? "Show Vault" : "Hide Vault" }}
      </button>
      <button class="hud-button" @click="$emit('open-vault')">Open Vault</button>
      <button
        class="hud-button"
        style="--button-color: var(--graphics)"
        @click="$emit('open-dialog', 'new-note')"
      >
        New Note
      </button>
      <button
        class="hud-button"
        style="--button-color: var(--career)"
        @click="$emit('open-dialog', 'new-link')"
      >
        New Link
      </button>
      <button class="hud-button">Search</button>
      <button class="hud-button">Git</button>
      <button class="hud-button">Settings</button>
    </nav>
    <div class="vault-route">vault/content / graph.yaml / domains.yaml</div>
  </header>
</template>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: minmax(160px, 292px) minmax(0, 1fr) minmax(120px, 360px);
  align-items: center;
  height: 44px;
  min-width: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
}

.app-mark {
  overflow: hidden;
  padding-left: 16px;
  color: var(--text-primary);
  font-size: 11px;
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

.vault-route {
  overflow: hidden;
  padding-right: 18px;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  text-align: right;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 920px) {
  .top-menu {
    grid-template-columns: minmax(128px, 1fr) minmax(0, 2fr);
  }

  .vault-route {
    display: none;
  }
}
</style>
