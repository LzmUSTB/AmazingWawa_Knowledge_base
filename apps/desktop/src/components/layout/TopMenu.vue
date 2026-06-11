<script setup>
import { ref } from "vue";
import AppIcon from "../ui/AppIcon.vue";
import { captureSourceSnapshot } from "../../data/desktop-vault-adapter.js";

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
  canCreateNote: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["export-context", "open-dialog", "open-vault", "show-view"]);

const snapshotCapturing = ref(false);

function normalizeSnapshotUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function handleCaptureSnapshot() {
  if (snapshotCapturing.value) return;

  const input = window.prompt("Capture source snapshot URL:");
  const url = normalizeSnapshotUrl(input);
  if (!url) return;

  if (!/^https?:\/\//i.test(url)) {
    window.alert("Snapshot URL must start with http:// or https://.");
    return;
  }

  snapshotCapturing.value = true;
  try {
    const result = await captureSourceSnapshot(url);
    const details = [
      `Snapshot zip created: ${result.zipPath}`,
      result.mode ? `Mode: ${result.mode}` : "",
      Number.isFinite(result.fileCount) ? `Files: ${result.fileCount}` : "",
      Number.isFinite(result.totalSize) ? `Size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB` : "",
    ].filter(Boolean);
    window.alert(details.join("\n"));
  } catch (error) {
    console.error("[snapshot] Failed to capture source snapshot.", error);
    window.alert(`Failed to capture source snapshot: ${error?.message || error}`);
  } finally {
    snapshotCapturing.value = false;
  }
}
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
      <button
        class="hud-button button-with-icon"
        style="--button-color: var(--graphics)"
        :disabled="!canCreateNote"
        :title="canCreateNote ? '' : 'Create or import a domain first.'"
        @click="$emit('open-dialog', 'new-note')"
      >
        <AppIcon name="file-plus" />
        <span class="button-icon-label">New Note</span>
      </button>
      <button class="hud-button button-with-icon" style="--button-color: var(--career)" @click="$emit('show-view', 'ai-import')">
        <AppIcon name="import" />
        <span class="button-icon-label">Import</span>
      </button>
      <button
        class="hud-button button-with-icon"
        style="--button-color: var(--language)"
        :disabled="!canExportContext"
        @click="$emit('export-context')"
      >
        <AppIcon name="export" />
        <span class="button-icon-label">Export Context</span>
      </button>
      <button
        class="hud-button button-with-icon"
        style="--button-color: var(--shader)"
        :disabled="snapshotCapturing"
        :title="snapshotCapturing ? 'Capturing source snapshot...' : 'Capture a web page as a local source snapshot zip.'"
        @click="handleCaptureSnapshot"
      >
        <AppIcon name="export" />
        <span class="button-icon-label">{{ snapshotCapturing ? "Capturing..." : "Capture" }}</span>
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
