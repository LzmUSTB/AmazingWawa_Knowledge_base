<script setup>
import { computed, ref } from "vue";
import { exportVaultWawaPackage, openVaultExportsFolder } from "../../data/desktop-vault-adapter.js";
import { useActiveVault } from "../../graph/graph-data-store.js";
import AppIcon from "../ui/AppIcon.vue";

const activeVault = useActiveVault();
const exportBusy = ref(false);
const exportProgress = ref(0);
const exportStatus = ref("Ready");
const exportResult = ref(null);
const exportError = ref("");

const nodeCount = computed(() => (activeVault.value.nodes || []).filter((node) => node.type !== "domain").length);
const domainCount = computed(() => (activeVault.value.domains || []).length);
const relationCount = computed(() => (activeVault.value.edges || []).length);
const noteCount = computed(() => Object.values(activeVault.value.notes || {}).filter((note) => note?.markdown || note?.html).length);
const exerciseSetCount = computed(() => activeVault.value.exercises?.all?.length || 0);

const exportStages = [
  { at: 8, label: "Preparing package manifest..." },
  { at: 24, label: "Collecting domains and graph structure..." },
  { at: 42, label: "Collecting notes and assets..." },
  { at: 60, label: "Collecting ExerciseSets..." },
  { at: 78, label: "Compressing .wawapkg..." },
  { at: 94, label: "Finalizing export..." },
];

function formatBytes(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / 1024 / 1024).toFixed(2)} MB`;
}

async function startExport() {
  if (exportBusy.value) return;
  exportBusy.value = true;
  exportProgress.value = 4;
  exportStatus.value = "Starting export...";
  exportResult.value = null;
  exportError.value = "";
  let stageIndex = 0;
  const timer = window.setInterval(() => {
    const stage = exportStages[Math.min(stageIndex, exportStages.length - 1)];
    exportProgress.value = Math.max(exportProgress.value, stage.at);
    exportStatus.value = stage.label;
    if (stageIndex < exportStages.length - 1) stageIndex += 1;
  }, 450);
  try {
    const result = await exportVaultWawaPackage(activeVault.value.vaultRootPath);
    exportResult.value = result;
    exportProgress.value = 100;
    exportStatus.value = "Export complete.";
  } catch (error) {
    exportError.value = String(error?.message || error);
    exportStatus.value = "Export failed.";
  } finally {
    window.clearInterval(timer);
    exportBusy.value = false;
  }
}

async function openOutputFolder() {
  await openVaultExportsFolder(activeVault.value.vaultRootPath);
}
</script>

<template>
  <section class="package-export-view technical-grid">
    <header class="package-export-header">
      <div>
        <div class="section-label">Vault Package</div>
        <h1>Export vault as .wawapkg</h1>
        <p>Build a portable package containing the current vault's domains, nodes, notes, assets, relations, and ExerciseSets.</p>
      </div>
      <button class="hud-button button-with-icon export-button" type="button" :disabled="exportBusy || !activeVault.vaultRootPath" @click="startExport">
        <AppIcon name="export" :size="13" />
        {{ exportBusy ? "Exporting..." : "Start Export" }}
      </button>
    </header>

    <main class="package-export-grid">
      <section class="export-card export-card--summary">
        <div class="section-label">Included Content</div>
        <div class="summary-grid">
          <div><strong>{{ domainCount }}</strong><span>Domains</span></div>
          <div><strong>{{ nodeCount }}</strong><span>Nodes</span></div>
          <div><strong>{{ noteCount }}</strong><span>Notes</span></div>
          <div><strong>{{ exerciseSetCount }}</strong><span>ExerciseSets</span></div>
          <div><strong>{{ relationCount }}</strong><span>Relations</span></div>
        </div>
      </section>

      <section class="export-card">
        <div class="section-label">Export Behavior</div>
        <ul>
          <li>Output is written to <code>.kb-ai/exports/</code>.</li>
          <li>Import creates package nodes and appends ExerciseSet problems by id.</li>
          <li>Existing problem ids with different content are rejected as conflicts.</li>
          <li>Exercise progress is not exported; only ExerciseSet content is included.</li>
        </ul>
      </section>

      <section class="export-card export-card--progress">
        <div class="export-progress-head">
          <div>
            <div class="section-label">Progress</div>
            <strong>{{ exportStatus }}</strong>
          </div>
          <span>{{ exportProgress }}%</span>
        </div>
        <div class="export-progress" role="progressbar" :aria-valuenow="exportProgress" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: `${exportProgress}%` }"></span>
        </div>
        <p v-if="exportError" class="export-error">{{ exportError }}</p>
        <div v-if="exportResult" class="export-result">
          <strong>{{ exportResult.packageId }}</strong>
          <span>{{ exportResult.packagePath }}</span>
          <small>{{ exportResult.fileCount }} files / {{ formatBytes(exportResult.totalSize) }}</small>
          <button class="hud-button button-with-icon" type="button" @click="openOutputFolder">
            <AppIcon name="folder-open" :size="12" />
            Open Export Folder
          </button>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.package-export-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--background-main);
}

.package-export-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--border-primary);
  border-left: 5px solid var(--tools);
  background: var(--background-panel);
  margin: 14px;
  padding: 22px;
}

.package-export-header h1 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.package-export-header p {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
}

.export-button {
  flex: 0 0 auto;
  --button-color: var(--tools);
}

.package-export-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.3fr);
  align-content: start;
  gap: 14px;
  min-height: 0;
  overflow: auto;
  padding: 0 14px 14px;
}

.export-card {
  border: 1px solid var(--border-primary);
  border-left: 5px solid var(--tools);
  background: var(--background-panel);
  padding: 18px;
}

.export-card--summary {
  grid-row: span 2;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.summary-grid div {
  display: grid;
  gap: 5px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 12px;
}

.summary-grid strong {
  color: var(--text-primary);
  font-size: var(--font-size-subtitle);
}

.summary-grid span,
.export-progress-head span,
.export-result small {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.export-card ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.65;
}

.export-card code {
  color: var(--tools);
}

.export-card--progress {
  display: grid;
  gap: 12px;
}

.export-progress-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.export-progress-head strong {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  text-transform: uppercase;
}

.export-progress {
  height: 12px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
}

.export-progress span {
  display: block;
  width: 0;
  height: 100%;
  background: var(--tools);
  transition: width .18s linear;
}

.export-error {
  margin: 0;
  color: var(--game-dev);
  font-family: var(--font-mono);
  font-size: var(--font-size-small);
  line-height: 1.45;
}

.export-result {
  display: grid;
  gap: 8px;
  min-width: 0;
  border-top: 1px solid var(--border-muted);
  padding-top: 12px;
}

.export-result strong {
  color: var(--text-primary);
}

.export-result span {
  overflow: hidden;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--font-size-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-result .hud-button {
  justify-self: start;
}

@media (max-width: 1100px) {
  .package-export-header,
  .export-progress-head {
    align-items: stretch;
    flex-direction: column;
  }

  .package-export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
