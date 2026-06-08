<script setup>
defineEmits(["open-dialog", "open-vault", "show-view"]);
</script>

<template>
  <header class="top-menu">
    <div class="app-mark">AMAZINGWAWA KNOWLEDGE BASE</div>
    <nav class="top-actions" aria-label="Application actions">
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
  </header>
</template>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: minmax(160px, 292px) minmax(0, 1fr);
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

@media (max-width: 920px) {
  .top-menu {
    grid-template-columns: minmax(128px, 1fr) minmax(0, 2fr);
  }

  .vault-route {
    display: none;
  }
}
</style>
