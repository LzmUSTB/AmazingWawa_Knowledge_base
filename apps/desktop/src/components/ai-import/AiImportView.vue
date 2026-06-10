<script setup>
import { computed, onMounted, ref, watch } from "vue";
import {
  applyAiImportPackage,
  inspectAiImportPackage,
  listAiImportPackages,
} from "../../data/desktop-vault-adapter.js";
import AiImportApplyBar from "./AiImportApplyBar.vue";
import AiImportBlockTypePreview from "./AiImportBlockTypePreview.vue";
import AiImportConflictPanel from "./AiImportConflictPanel.vue";
import AiImportGraphDiff from "./AiImportGraphDiff.vue";
import AiImportNotePreview from "./AiImportNotePreview.vue";
import AiImportPackagePicker from "./AiImportPackagePicker.vue";
import AiImportSummary from "./AiImportSummary.vue";

const props = defineProps({
  vaultRootPath: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["applied"]);

const packages = ref([]);
const selectedPackageId = ref("");
const loading = ref(false);
const applying = ref(false);
const loadError = ref("");
const applyError = ref("");
const inspection = ref(null);
const confirmedWarnings = ref(false);

const validation = computed(() => inspection.value?.validation || null);
const diff = computed(() => inspection.value?.diff || null);
const blockRegistry = computed(() => inspection.value?.validation?.blockRegistry || {});
const selectedNotePreview = computed(() => diff.value?.notePreviews?.[0] || null);
const selectedBlockType = computed(() => diff.value?.blockTypesToAdd?.[0] || null);
const hasWarnings = computed(() => Boolean(validation.value?.warnings?.length));
const canApply = computed(() => {
  if (!validation.value?.valid) return false;
  if (hasWarnings.value && !confirmedWarnings.value) return false;
  return Boolean(selectedPackageId.value);
});

onMounted(() => refreshPackages());

watch(selectedPackageId, () => {
  confirmedWarnings.value = false;
  applyError.value = "";
  if (selectedPackageId.value) inspectSelectedPackage();
});

async function refreshPackages() {
  loading.value = true;
  loadError.value = "";
  try {
    packages.value = await listAiImportPackages(props.vaultRootPath);
    if (!selectedPackageId.value && packages.value.length) {
      selectedPackageId.value = packages.value[0].package_id || packages.value[0].packageId;
    }
  } catch (error) {
    loadError.value = String(error?.message || error);
  } finally {
    loading.value = false;
  }
}

async function inspectSelectedPackage() {
  loading.value = true;
  loadError.value = "";
  inspection.value = null;
  try {
    inspection.value = await inspectAiImportPackage(props.vaultRootPath, selectedPackageId.value);
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
    const updatedVault = await applyAiImportPackage(props.vaultRootPath, selectedPackageId.value);
    emit("applied", updatedVault);
    await refreshPackages();
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
        <div class="panel-label" style="--label-color: var(--career)">AI Import</div>
        <h1>Draft Package Review</h1>
      </div>
      <button class="hud-button" :disabled="loading" @click="refreshPackages">
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </header>

    <div class="ai-import-grid">
      <aside class="left-column">
        <AiImportPackagePicker
          :packages="packages"
          :selected-package-id="selectedPackageId"
          @select="selectedPackageId = $event"
        />
        <AiImportSummary :validation="validation" />
        <AiImportConflictPanel
          :errors="validation?.errors || []"
          :warnings="validation?.warnings || []"
          :review-items="validation?.reviewItems || []"
        />
      </aside>

      <main class="center-column">
        <div v-if="loadError || applyError" class="error-banner">{{ loadError || applyError }}</div>
        <AiImportNotePreview :preview="selectedNotePreview" :block-registry="blockRegistry" />
        <AiImportBlockTypePreview :block-type="selectedBlockType" :block-registry="blockRegistry" />
      </main>

      <aside class="right-column">
        <AiImportGraphDiff :diff="diff" />
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

.center-column {
  align-content: stretch;
}

.file-list {
  display: grid;
  gap: 8px;
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
