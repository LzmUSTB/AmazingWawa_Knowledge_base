<script setup>
import { computed, onMounted, ref, watch } from "vue";
import {
  applyWawaPackage,
  chooseWawaPackageFile,
  inspectWawaPackage,
} from "../../data/desktop-vault-adapter.js";
import AiImportApplyBar from "./AiImportApplyBar.vue";
import AiImportConflictPanel from "./AiImportConflictPanel.vue";
import AiImportGraphDiff from "./AiImportGraphDiff.vue";
import AiImportNotePreview from "./AiImportNotePreview.vue";
import AiImportSummary from "./AiImportSummary.vue";

const props = defineProps({
  vaultRootPath: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["applied"]);

const selectedPackageId = ref("");
const selectedPackageFilePath = ref("");
const selectedNoteIndex = ref(0);
const loading = ref(false);
const applying = ref(false);
const loadError = ref("");
const applyError = ref("");
const inspection = ref(null);
const confirmedWarnings = ref(false);

const validation = computed(() => inspection.value?.validation || null);
const diff = computed(() => inspection.value?.diff || null);
const blockRegistry = computed(() => inspection.value?.validation?.blockRegistry || {});
const selectedNotePreview = computed(() => diff.value?.notePreviews?.[selectedNoteIndex.value] || diff.value?.notePreviews?.[0] || null);
const history = computed(() => inspection.value?.history || { applied: false, appliedAt: "", raw: "" });
const hasWarnings = computed(() => Boolean(validation.value?.warnings?.length));
const canApply = computed(() => {
  if (history.value.applied) return false;
  if (!validation.value?.valid) return false;
  if (hasWarnings.value && !confirmedWarnings.value) return false;
  return Boolean(selectedPackageId.value);
});

onMounted(() => {
  inspection.value = null;
});

watch(selectedPackageId, () => {
  confirmedWarnings.value = false;
  applyError.value = "";
  selectedNoteIndex.value = 0;
});

async function importPackage() {
  loading.value = true;
  loadError.value = "";
  try {
    const packageFilePath = await chooseWawaPackageFile();
    if (!packageFilePath) return;
    selectedPackageFilePath.value = packageFilePath;
    const result = await inspectWawaPackage(props.vaultRootPath, packageFilePath);
    inspection.value = result;
    selectedPackageId.value = result.validation.previewModel.packageId;
  } catch (error) {
    loadError.value = String(error?.message || error);
  } finally {
    loading.value = false;
  }
}

async function inspectSelectedPackage() {
  if (!selectedPackageFilePath.value) return;
  loading.value = true;
  loadError.value = "";
  try {
    inspection.value = await inspectWawaPackage(props.vaultRootPath, selectedPackageFilePath.value);
  } catch (error) {
    loadError.value = String(error?.message || error);
  } finally {
    loading.value = false;
  }
}

async function applySelectedPackage() {
  if (!canApply.value || applying.value) return;
  applying.value = true;
  applyError.value = "";
  try {
    const updatedVault = await applyWawaPackage(props.vaultRootPath, selectedPackageFilePath.value);
    emit("applied", updatedVault);
    await inspectSelectedPackage();
  } catch (error) {
    applyError.value = String(error?.message || error);
  } finally {
    applying.value = false;
  }
}
</script>

<template>
  <section class="ai-import-view technical-grid">
    <header class="ai-import-header">
      <div>
        <div class="panel-label" style="--label-color: var(--career)">Import</div>
        <h1>Package Review</h1>
      </div>
      <button class="hud-button" :disabled="loading || !selectedPackageId" @click="inspectSelectedPackage">
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </header>

    <div class="ai-import-grid">
      <aside class="left-column">
        <section class="ai-panel import-cta">
          <div class="section-label">Import Package</div>
          <p>Select a .wawapkg package file.</p>
          <button class="hud-button" style="--button-color: var(--career)" :disabled="loading" @click="importPackage">
            Import .wawapkg
          </button>
        </section>
        <AiImportSummary :validation="validation" />
        <section v-if="history.applied" class="ai-panel applied-panel">
          <div class="section-label">Applied</div>
          <strong>APPLIED</strong>
          <small>{{ history.appliedAt || "history exists" }}</small>
        </section>
        <AiImportConflictPanel
          :errors="validation?.errors || []"
          :warnings="validation?.warnings || []"
          :review-items="validation?.reviewItems || []"
        />
        <section v-if="inspection?.packageFiles" class="ai-panel review-files">
          <div class="section-label">Package Review Files</div>
          <details v-for="(contents, filePath) in inspection.packageFiles.reviewFiles" :key="filePath">
            <summary>{{ filePath.replace('review/', '') }}</summary>
            <pre>{{ contents }}</pre>
          </details>
        </section>
      </aside>

      <main class="center-column">
        <div v-if="loadError || applyError" class="error-banner">{{ loadError || applyError }}</div>
        <label v-if="diff?.notePreviews?.length > 1" class="note-preview-selector">
          <span>Preview Note</span>
          <select v-model.number="selectedNoteIndex">
            <option v-for="(preview, index) in diff.notePreviews" :key="preview.nodeId" :value="index">
              {{ preview.title || preview.nodeId }}
            </option>
          </select>
        </label>
        <AiImportNotePreview :preview="selectedNotePreview" :block-registry="blockRegistry" />
      </main>

      <aside class="right-column">
        <AiImportGraphDiff :diff="diff" />
        <section class="ai-panel">
          <div class="section-label">New Block Types</div>
          <div v-if="diff?.blockTypesToAdd?.length" class="block-type-list">
            <div v-for="block in diff.blockTypesToAdd" :key="block.type" class="block-type-row">
              <strong>{{ block.type }}</strong>
              <span>{{ block.kind }}</span>
              <small>declarative visual</small>
            </div>
          </div>
          <p v-else class="empty-line">No new block types.</p>
        </section>
        <section class="ai-panel">
          <div class="section-label">File Diff</div>
          <div class="file-list">
            <div v-for="file in diff?.filesToCreate || []" :key="`create-${file.path}`" class="file-row">
              <strong>create</strong>
              <span>{{ file.path }}</span>
            </div>
            <div v-for="file in diff?.filesToModify || []" :key="`modify-${file.path}`" class="file-row">
              <strong>modify</strong>
              <span>{{ file.path }}</span>
            </div>
          </div>
          <p v-if="!diff?.filesToCreate?.length && !diff?.filesToModify?.length" class="empty-line">No file changes.</p>
        </section>
        <AiImportApplyBar
          v-model:confirmed-warnings="confirmedWarnings"
          :applying="applying"
          :can-apply="canApply"
          :has-warnings="hasWarnings"
          @apply="applySelectedPackage"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.ai-import-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: var(--background-main);
}

.ai-import-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 14px 18px;
}

.ai-import-header h1 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.ai-import-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.left-column,
.center-column,
.right-column {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.import-cta p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.5;
}

.applied-panel strong {
  color: var(--language);
  font-size: var(--font-size-ui);
  text-transform: uppercase;
}

.applied-panel small {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.review-files details {
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-secondary);
}

.review-files summary {
  cursor: pointer;
  color: var(--text-primary);
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 8px;
  text-transform: uppercase;
}

.review-files pre {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  border-top: 1px solid var(--border-muted);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.5;
  padding: 10px;
  white-space: pre-wrap;
}

.center-column {
  align-content: stretch;
}

.note-preview-selector {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 10px;
}

.note-preview-selector span {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.note-preview-selector select {
  min-width: 0;
  min-height: 30px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
}

.file-list {
  display: grid;
  gap: 8px;
}

.block-type-list {
  display: grid;
  gap: 8px;
}

.block-type-row {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 9px;
}

.block-type-row strong {
  color: var(--text-primary);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.block-type-row span,
.block-type-row small {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.file-row {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 9px;
}

.file-row strong,
.empty-line {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.file-row span {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: var(--font-size-small);
  font-weight: 800;
}

.empty-line {
  margin: 0;
}

.error-banner {
  border: 1px solid var(--game-dev);
  background: var(--background-main);
  color: var(--game-dev);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 10px;
}

@media (max-width: 1180px) {
  .ai-import-grid {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .right-column {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
