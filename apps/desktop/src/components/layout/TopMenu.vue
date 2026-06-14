<script setup>
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  canExportContext: {
    type: Boolean,
    default: false,
  },
  canAddNote: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["export-context", "open-dialog", "open-vault", "show-view"]);

const appWindow = getCurrentWindow();

function minimizeWindow() {
  appWindow.minimize();
}

function toggleMaximizeWindow() {
  appWindow.toggleMaximize();
}

function closeWindow() {
  appWindow.close();
}

function handleTitlebarDoubleClick(event) {
  if (event.target.closest("button")) return;
  toggleMaximizeWindow();
}
</script>

<template>
  <header class="top-menu" data-tauri-drag-region @dblclick="handleTitlebarDoubleClick">
    <div class="app-mark" data-tauri-drag-region>{{ appTitle || "Knowledge Base" }}</div>
    <nav class="top-actions" aria-label="Application actions">
      <span class="font-scale-indicator">FONT {{ Math.round(uiFontScale * 100) }}%</span>
      <button class="hud-button top-action-button button-with-icon" title="Open Vault" @click="$emit('open-vault')">
        <AppIcon name="folder-open" />
        <span class="button-icon-label">Open Vault</span>
      </button>
      <button class="hud-button top-action-button button-with-icon" style="--button-color: var(--graphics)" :disabled="!canAddNote"
        :title="canAddNote ? '' : 'No empty node is available. Create a node first.'"
        @click="$emit('open-dialog', 'add-note')">
        <AppIcon name="file-plus" />
        <span class="button-icon-label">New Note</span>
      </button>
      <button class="hud-button top-action-button button-with-icon" title="Import" style="--button-color: var(--career)"
        @click="$emit('show-view', 'ai-import')">
        <AppIcon name="import" />
        <span class="button-icon-label">Import</span>
      </button>
      <button class="hud-button top-action-button button-with-icon" title="Export Context" style="--button-color: var(--language)"
        :disabled="!canExportContext" @click="$emit('export-context')">
        <AppIcon name="export" />
        <span class="button-icon-label">Export Context</span>
      </button>
      <button class="hud-button top-action-button button-with-icon" title="Capture" style="--button-color: var(--shader)"
        @click="$emit('show-view', 'source-snapshot')">
        <AppIcon name="capture" />
        <span class="button-icon-label">Capture</span>
      </button>
      <button class="hud-button top-action-button button-with-icon" disabled title="Git panel is not implemented yet">
        <AppIcon name="git-branch" />
        <span class="button-icon-label">Git</span>
      </button>
    </nav>
    <div class="window-controls" aria-label="Window controls">
      <button class="window-control" type="button" title="Minimize" aria-label="Minimize window"
        @click="minimizeWindow">
        <AppIcon name="window-minimize" :size="13" />
      </button>
      <button class="window-control" type="button" title="Maximize" aria-label="Maximize window"
        @click="toggleMaximizeWindow">
        <AppIcon name="window-maximize" :size="13" />
      </button>
      <button class="window-control window-control--close" type="button" title="Close" aria-label="Close window"
        @click="closeWindow">
        <AppIcon name="x" :size="11" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(0, auto) auto;
  align-items: center;
  height: 44px;
  min-width: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
  padding: 0 0 0 16px;
  user-select: none;
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
  padding-right: 10px;
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

.top-action-button {
  flex: 0 0 auto;
}

.window-controls {
  display: grid;
  grid-template-columns: repeat(3, 42px);
  height: 100%;
  border-left: 1px solid var(--border-muted);
}

.window-control {
  display: grid;
  place-items: center;
  width: 42px;
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.window-control:hover {
  background: var(--background-elevated);
  color: var(--text-primary);
}

.window-control--close:hover {
  background: var(--game-dev);
  color: var(--background-main);
}

@media (max-width: 1180px) {
  .top-menu {
    grid-template-columns: minmax(96px, 1fr) minmax(0, auto) auto;
    padding-left: 12px;
  }

  .top-actions {
    gap: 7px;
    overflow: hidden;
  }

  .top-action-button {
    width: 34px;
    min-width: 34px;
    justify-content: center;
    padding-inline: 0;
  }

  .top-action-button .button-icon-label,
  .font-scale-indicator {
    display: none;
  }
}
</style>
