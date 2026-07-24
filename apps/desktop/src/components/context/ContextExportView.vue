<script setup>
import { computed, ref } from "vue";
import { buildAiContextFiles } from "@kinjito/protocol";
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
const activePurposeId = ref("wawapkg");
const purposePresets = [
  {
    id: "wawapkg",
    label: "Generate .wawapkg",
    brief: "Use when AI should produce an importable package with nodes, notes, ExerciseSets, Concept Maps, relations, assets, and review files.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "WORKFLOW_GUIDE.md",
      "FORMAT_CONTRACT.md",
      "WAWAPKG_SCHEMA.md",
      "NODE_SCHEMA.md",
      "NOTE_SCHEMA.md",
      "EXERCISE_SCHEMA.md",
      "CONCEPT_MAP_SCHEMA.md",
      "RELATION_SCHEMA.md",
      "ASSET_RULES.md",
      "QUALITY_RUBRIC.md",
      "SOURCE_TO_NOTE_GUIDE.md",
      "BLOCK_REGISTRY.md",
      "CUSTOM_BLOCK_INDEX.yaml",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "RELATION_INDEX.yaml",
      "CONCEPT_MAP_INDEX.yaml",
    ],
  },
  {
    id: "concept-map",
    label: "Only Concept Map",
    brief: "Use when AI should write or update a concept relation network without modifying graph.yaml.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "WORKFLOW_GUIDE.md",
      "FORMAT_CONTRACT.md",
      "WAWAPKG_SCHEMA.md",
      "CONCEPT_MAP_SCHEMA.md",
      "NODE_SCHEMA.md",
      "RELATION_SCHEMA.md",
      "QUALITY_RUBRIC.md",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "CONCEPT_MAP_INDEX.yaml",
    ],
  },
  {
    id: "exercise-set",
    label: "Only ExerciseSet",
    brief: "Use when AI should write or append `exercises.yaml` for one existing node, with correct recall/practice mode choices.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "WORKFLOW_GUIDE.md",
      "FORMAT_CONTRACT.md",
      "EXERCISE_SCHEMA.md",
      "QUALITY_RUBRIC.md",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "RELATION_INDEX.yaml",
      "CONCEPT_MAP_INDEX.yaml",
    ],
  },
  {
    id: "node-only",
    label: "Only Node",
    brief: "Use when AI should propose graph structure or node metadata without writing a long-form note.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "WORKFLOW_GUIDE.md",
      "FORMAT_CONTRACT.md",
      "NODE_SCHEMA.md",
      "RELATION_SCHEMA.md",
      "QUALITY_RUBRIC.md",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "RELATION_INDEX.yaml",
    ],
  },
  {
    id: "html-note",
    label: "One HTML Note",
    brief: "Use when AI should generate or revise a source-rich HTML note for one existing node, including assets and custom blocks.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "WORKFLOW_GUIDE.md",
      "FORMAT_CONTRACT.md",
      "NOTE_SCHEMA.md",
      "SOURCE_TO_NOTE_GUIDE.md",
      "ASSET_RULES.md",
      "QUALITY_RUBRIC.md",
      "BLOCK_REGISTRY.md",
      "CUSTOM_BLOCK_INDEX.yaml",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "CONCEPT_MAP_INDEX.yaml",
    ],
  },
  {
    id: "note-revision",
    label: "Revise Existing Note",
    brief: "Use when AI should improve an existing Markdown or HTML note while preserving node identity and current graph structure.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "FORMAT_CONTRACT.md",
      "NOTE_SCHEMA.md",
      "SOURCE_TO_NOTE_GUIDE.md",
      "ASSET_RULES.md",
      "QUALITY_RUBRIC.md",
      "BLOCK_REGISTRY.md",
      "CUSTOM_BLOCK_INDEX.yaml",
      "NODE_INDEX.yaml",
    ],
  },
  {
    id: "relations",
    label: "Relations / Index",
    brief: "Use when AI should audit or propose important graph relations without changing note content.",
    files: [
      "README.md",
      "AI_CONTEXT.yaml",
      "RULE_PRIORITY.yaml",
      "FORMAT_CONTRACT.md",
      "NODE_SCHEMA.md",
      "RELATION_SCHEMA.md",
      "QUALITY_RUBRIC.md",
      "DOMAIN_INDEX.yaml",
      "NODE_INDEX.yaml",
      "RELATION_INDEX.yaml",
    ],
  },
  {
    id: "all",
    label: "All Files",
    brief: "Use when the task is ambiguous or spans multiple output types. This mirrors the full exported folder.",
    files: null,
  },
];
const outputFiles = computed(() => buildAiContextFiles(activeVault.value || {}));
const fileRows = computed(() =>
  Object.entries(outputFiles.value).map(([name, contents]) => ({
    name,
    bytes: new Blob([contents]).size,
    category: fileCategory(name),
    description: fileDescription(name),
  })),
);
const selectedPurpose = computed(() => purposePresets.find((preset) => preset.id === activePurposeId.value) || purposePresets[0]);
const recommendedFileNames = computed(() => {
  if (!selectedPurpose.value.files) return new Set(fileRows.value.map((file) => file.name));
  return new Set(selectedPurpose.value.files);
});
const visibleFileRows = computed(() => fileRows.value.filter((file) => recommendedFileNames.value.has(file.name)));
const hiddenFileCount = computed(() => Math.max(0, fileRows.value.length - visibleFileRows.value.length));
const selectedPurposeFileCount = computed(() => visibleFileRows.value.length);
const totalBytes = computed(() => fileRows.value.reduce((sum, file) => sum + file.bytes, 0));
const visibleBytes = computed(() => visibleFileRows.value.reduce((sum, file) => sum + file.bytes, 0));

function fileCategory(name) {
  if (name.endsWith("_INDEX.yaml")) return "Index";
  if (name.endsWith(".yaml")) return "Contract";
  if (name === "README.md") return "Start";
  if (name === "WORKFLOW_GUIDE.md" || name === "SOURCE_TO_NOTE_GUIDE.md") return "Workflow";
  if (name.endsWith("_SCHEMA.md") || name === "FORMAT_CONTRACT.md" || name === "ASSET_RULES.md") return "Format";
  if (name === "QUALITY_RUBRIC.md") return "Quality";
  return "Guide";
}

function fileDescription(name) {
  const descriptions = {
    "README.md": "Entry point and recommended reading order for an AI agent.",
    "WORKFLOW_GUIDE.md": "Interactive task routing for architecture, notes, ExerciseSets, source plans, and explicit package work.",
    "FORMAT_CONTRACT.md": "Mechanical plain-file rules and separation between content, ExerciseSets, relations, and Stage layout.",
    "WAWAPKG_SCHEMA.md": "Complete package trees and canonical manifest, source, patch, node, note, ExerciseSet, and edge examples.",
    "NODE_SCHEMA.md": "Node ids, metadata fields, types, statuses, locale fields, and content-format rules.",
    "NOTE_SCHEMA.md": "Markdown and HTML note formats, source attribution, LaTeX, assets, and interactive-note constraints.",
    "EXERCISE_SCHEMA.md": "ExerciseSet ownership, paths, legal problem fields, types, difficulties, and a complete example.",
    "CONCEPT_MAP_SCHEMA.md": "Concept relation network schema, upsert operation, owner linking, and separation from graph.yaml.",
    "RELATION_SCHEMA.md": "Frozen relation semantics and canonical flat add_edge operations.",
    "ASSET_RULES.md": "Allowed asset roots, source preservation, reference requirements, and package exclusions.",
    "QUALITY_RUBRIC.md": "Quality checks for one-node-at-a-time notes, ExerciseSets, sources, and package reliability.",
    "AI_CONTEXT.yaml": "Machine-readable stepwise workflow policy, content capabilities, vault counts, and constraints.",
    "RULE_PRIORITY.yaml": "Conflict-resolution order for AI generation rules.",
    "SOURCE_TO_NOTE_GUIDE.md": "Source analysis and import-plan workflow with an approval gate before package generation.",
    "BLOCK_REGISTRY.md": "Readable list of custom declarative content blocks available in this vault.",
    "CUSTOM_BLOCK_INDEX.yaml": "Machine-readable custom block registry index.",
    "DOMAIN_INDEX.yaml": "Machine-readable list of existing domains and their display metadata.",
    "NODE_INDEX.yaml": "Machine-readable list of existing non-domain nodes and note availability.",
    "RELATION_INDEX.yaml": "Machine-readable list of graph relations that should be respected by imports.",
    "CONCEPT_MAP_INDEX.yaml": "Machine-readable list of existing Concept Maps and their owners.",
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
            <span>Total files</span>
            <strong>{{ fileRows.length }}</strong>
          </div>
          <div class="stat-row">
            <span>Recommended</span>
            <strong>{{ selectedPurposeFileCount }}</strong>
          </div>
          <div class="stat-row">
            <span>Recommended size</span>
            <strong>{{ formatBytes(visibleBytes) }}</strong>
          </div>
          <div class="stat-row">
            <span>Total size</span>
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
            These files are a compact AI handoff for interactive, stepwise knowledge authoring. They route the task
            before generation, separate strict formats from workflow guidance, and reserve .wawapkg output for an
            explicit request or an approved plan.
          </p>
        </section>

        <section class="ai-panel purpose-panel">
          <div class="section-label">AI Handoff Purpose</div>
          <div class="purpose-list">
            <button v-for="preset in purposePresets" :key="preset.id" class="purpose-button" type="button"
              :class="{ 'is-active': activePurposeId === preset.id }" @click="activePurposeId = preset.id">
              <strong>{{ preset.label }}</strong>
              <span>{{ preset.files ? `${preset.files.length} docs` : "full folder" }}</span>
            </button>
          </div>
        </section>
      </aside>

      <section class="file-plan-panel">
        <div v-if="error" class="error-banner">{{ error }}</div>
        <section class="purpose-summary">
          <div>
            <div class="section-label">Selected Purpose</div>
            <h2>{{ selectedPurpose.label }}</h2>
            <p>{{ selectedPurpose.brief }}</p>
          </div>
          <span v-if="hiddenFileCount">{{ hiddenFileCount }} non-essential files hidden</span>
          <span v-else>Showing full export set</span>
        </section>
        <div class="file-plan-header">
          <div>
            <div class="section-label">Recommended Files For AI</div>
            <h2>.kb-ai/context</h2>
          </div>
          <span>{{ visibleFileRows.length }} / {{ fileRows.length }} files</span>
        </div>

        <div class="file-list">
          <article v-for="file in visibleFileRows" :key="file.name" class="file-row">
            <div class="file-name">
              <strong>{{ file.name }}</strong>
              <span>{{ file.category }} / {{ formatBytes(file.bytes) }}</span>
            </div>
            <p>{{ file.description }}</p>
          </article>
          <p v-if="!visibleFileRows.length" class="empty-file-list">No files match this purpose.</p>
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

.purpose-panel {
  min-height: 0;
}

.purpose-list {
  display: grid;
  gap: 8px;
}

.purpose-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid var(--border-muted);
  border-left: 4px solid transparent;
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 10px;
  text-align: left;
}

.purpose-button strong,
.purpose-button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purpose-button strong {
  color: var(--text-primary);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.purpose-button span {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.purpose-button:hover,
.purpose-button.is-active {
  border-color: var(--language);
  border-left-color: var(--language);
  background: color-mix(in srgb, var(--language) 9%, var(--background-main));
}

.file-plan-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.purpose-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 18px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--language);
  background: var(--background-panel);
  padding: 14px;
}

.purpose-summary h2 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-subtitle);
  text-transform: uppercase;
}

.purpose-summary p {
  max-width: 880px;
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.55;
}

.purpose-summary > span {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-align: right;
  text-transform: uppercase;
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

.empty-file-list {
  grid-column: 1 / -1;
  margin: 0;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-muted);
  padding: 18px;
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

  .purpose-summary {
    grid-template-columns: 1fr;
  }

  .purpose-summary > span {
    text-align: left;
  }
}
</style>
