<script setup>
import { computed } from "vue";
import { buildAiContextFiles } from "../../../../../packages/knowledge-core/src/index.js";
import { useActiveVault } from "../../graph/graph-data-store.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  exporting: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "export"]);

const activeVault = useActiveVault();
const outputFiles = computed(() => buildAiContextFiles(activeVault.value || {}));
const fileRows = computed(() =>
  Object.entries(outputFiles.value).map(([name, contents]) => ({
    name,
    bytes: new Blob([contents]).size,
    category: fileCategory(name),
    description: fileDescription(name),
  })),
);
const totalBytes = computed(() => fileRows.value.reduce((sum, file) => sum + file.bytes, 0));

function fileCategory(name) {
  if (name.endsWith("_INDEX.yaml")) return "Index";
  if (name.endsWith(".yaml")) return "Contract";
  if (name === "README.md") return "Start";
  return "Guide";
}

function fileDescription(name) {
  const descriptions = {
    "README.md": "Entry point and recommended reading order for an AI agent.",
    "AI_CONTEXT.yaml": "Machine-readable vault snapshot: domains, nodes, relations, block support, package rules, and counts.",
    "RULE_PRIORITY.yaml": "Conflict-resolution order for AI generation rules.",
    "AI_KB_GUIDE.md": "Main authoring contract for generating valid .wawapkg packages.",
    "SOURCE_TO_NOTE_GUIDE.md": "Rules for converting source material, snapshots, assets, demos, and citations into notes.",
    "PACKAGE_AND_RELATION_GUIDE.md": "Package structure, patch operations, and relation-type guidance.",
    "NOTE_AND_BLOCK_GUIDE.md": "Markdown, HTML note, and content-block authoring guidance.",
    "NOTE_QUALITY_RUBRIC.md": "Quality checklist for note completeness, visual fidelity, source use, and package reliability.",
    "BLOCK_REGISTRY.md": "Readable list of custom declarative content blocks available in this vault.",
    "CUSTOM_BLOCK_INDEX.yaml": "Machine-readable custom block registry index.",
    "DOMAIN_INDEX.yaml": "Machine-readable list of existing domains and their display metadata.",
    "NODE_INDEX.yaml": "Machine-readable list of existing non-domain nodes and note availability.",
    "RELATION_INDEX.yaml": "Machine-readable list of graph relations that should be respected by imports.",
  };
  return descriptions[name] || "Context file used by AI import/package generation workflows.";
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
</script>

<template>
  <section class="context-export-view technical-grid">
    <header class="context-export-header">
      <div>
        <div class="panel-label" style="--label-color: var(--language)">Export</div>
        <h1>Context Export</h1>
      </div>
      <div class="header-actions">
        <button class="hud-button button-with-icon" :disabled="exporting" style="--button-color: var(--language)"
          @click="$emit('export')">
          <AppIcon name="export" :size="11" />
          {{ exporting ? "Exporting..." : "Export Context" }}
        </button>
        <button class="hud-button button-with-icon" :disabled="exporting" @click="$emit('close')">
          <AppIcon name="x" :size="11" />
          Close
        </button>
      </div>
    </header>

    <main class="context-export-grid">
      <aside class="left-column">
        <section class="ai-panel export-summary">
          <div class="section-label">Output Target</div>
          <strong>.kb-ai/context/</strong>
          <p>
            No files are written when this page opens. Press Export Context to regenerate these files and then open the
            output folder.
          </p>
        </section>

        <section class="ai-panel stats-panel">
          <div class="section-label">Export Plan</div>
          <div class="stat-row">
            <span>Files</span>
            <strong>{{ fileRows.length }}</strong>
          </div>
          <div class="stat-row">
            <span>Estimated size</span>
            <strong>{{ formatBytes(totalBytes) }}</strong>
          </div>
          <div class="stat-row">
            <span>Write mode</span>
            <strong>Regenerate</strong>
          </div>
        </section>

        <section class="ai-panel">
          <div class="section-label">What This Is For</div>
          <p class="quiet-copy">
            These files are a compact AI handoff for creating future .wawapkg imports. They describe the vault schema,
            current graph inventory, relation rules, content quality bar, and supported note/block formats.
          </p>
        </section>
      </aside>

      <section class="file-plan-panel">
        <div v-if="error" class="error-banner">{{ error }}</div>
        <div class="file-plan-header">
          <div>
            <div class="section-label">Files To Output</div>
            <h2>.kb-ai/context</h2>
          </div>
          <span>{{ fileRows.length }} files</span>
        </div>

        <div class="file-list">
          <article v-for="file in fileRows" :key="file.name" class="file-row">
            <div class="file-name">
              <strong>{{ file.name }}</strong>
              <span>{{ file.category }} / {{ formatBytes(file.bytes) }}</span>
            </div>
            <p>{{ file.description }}</p>
          </article>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.context-export-view {
  display: grid;
  height: 100%;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: var(--background-main);
}

.context-export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 14px 18px;
}

.context-export-header h1 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-export-grid {
  display: grid;
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.left-column {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.export-summary strong {
  color: var(--language);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-ui);
}

.export-summary p,
.quiet-copy {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.6;
}

.stat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 9px;
}

.stat-row span {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.stat-row strong {
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.file-plan-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.file-plan-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--language);
  background: var(--background-panel);
  padding: 14px;
}

.file-plan-header h2 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.file-plan-header span {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.file-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.file-row {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 132px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--language);
  background: var(--background-panel);
  padding: 12px;
}

.file-name {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.file-name strong {
  overflow: hidden;
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name span {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  line-height: 1.2;
  text-transform: uppercase;
}

.file-row p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.5;
}

.error-banner {
  border: 1px solid var(--game-dev);
  background: var(--background-main);
  color: var(--game-dev);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 10px;
}

@media (max-width: 980px) {
  .context-export-grid {
    grid-template-columns: 1fr;
    overflow: auto;
  }
}
</style>
