<script setup>
import { computed, ref, watch } from "vue";
import { chooseHtmlNoteFile, chooseHtmlNoteFolder } from "../../data/desktop-vault-adapter.js";
import { findGraphNode, getActiveVault, getGraphNodes } from "../../graph/graph-data-store.js";
import NodeFilterList from "../common/NodeFilterList.vue";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  selectedNodeId: { type: String, required: true },
});

const emit = defineEmits(["add-note", "close"]);

function displayTitle(entity) {
  return entity?.titleLocale || entity?.title || entity?.id || "";
}

function noteRecord(nodeId) {
  return getActiveVault().notes?.[nodeId] || null;
}

function canAddNote(node) {
  const note = noteRecord(node.id);
  return (
    node.type !== "domain" &&
    !note?.markdown &&
    !note?.html &&
    (node.contentFormat === "none" || node.contentFormat === "auto" || !node.contentFormat)
  );
}

const candidates = computed(() => getGraphNodes().filter(canAddNote));
const candidateIds = computed(() => candidates.value.map((node) => node.id));
const noteMode = ref("markdown");
const selectedNodeId = ref("");
const selectedNode = computed(() => findGraphNode(selectedNodeId.value));
const initialTitle = ref("");
const htmlSourcePath = ref("");
const markdown = computed(() => `# ${initialTitle.value || displayTitle(selectedNode.value)}\n\n`);
const formValid = computed(() => (
  Boolean(selectedNode.value && candidates.value.some((node) => node.id === selectedNode.value.id)) &&
  (noteMode.value === "markdown" || Boolean(htmlSourcePath.value))
));

function chooseDefaultNode() {
  const selected = candidates.value.find((node) => node.id === props.selectedNodeId);
  selectedNodeId.value = selected?.id || candidates.value[0]?.id || "";
  initialTitle.value = displayTitle(findGraphNode(selectedNodeId.value));
}

watch(candidates, chooseDefaultNode, { immediate: true });
watch(() => props.selectedNodeId, chooseDefaultNode);
watch(selectedNodeId, () => {
  initialTitle.value = displayTitle(selectedNode.value);
});
watch(noteMode, () => {
  htmlSourcePath.value = "";
});

async function chooseHtmlSource(kind) {
  const selectedPath = kind === "folder" ? await chooseHtmlNoteFolder() : await chooseHtmlNoteFile();
  if (!selectedPath) return;
  htmlSourcePath.value = selectedPath;
  noteMode.value = kind === "folder" ? "html-folder" : "html-file";
}

function submit() {
  if (!formValid.value) return;
  if (noteMode.value !== "markdown") {
    emit("add-note", {
      nodeId: selectedNodeId.value,
      contentFormat: "html",
      sourceKind: noteMode.value === "html-folder" ? "folder" : "file",
      sourcePath: htmlSourcePath.value,
    });
    return;
  }
  emit("add-note", {
    nodeId: selectedNodeId.value,
    initialTitle: initialTitle.value.trim() || displayTitle(selectedNode.value),
    markdown: markdown.value,
  });
}
</script>

<template>
  <div class="dialog-card add-note-dialog">
    <div class="dialog-accent"></div>
    <header>
      <h2>Add Note</h2>
      <p>Create a Markdown note, or import an HTML file/folder for an existing empty node.</p>
    </header>

    <section v-if="!candidates.length" class="empty-state">
      No empty node is available. Every existing node already has a note.
    </section>

    <template v-else>
      <NodeFilterList v-model="selectedNodeId" :candidate-ids="candidateIds" label="Target" />
      <div class="mode-switch" role="tablist" aria-label="Note format">
        <button :class="{ 'is-active': noteMode === 'markdown' }" type="button" @click="noteMode = 'markdown'">
          Markdown
        </button>
        <button :class="{ 'is-active': noteMode === 'html-file' }" type="button" @click="chooseHtmlSource('file')">
          HTML File
        </button>
        <button :class="{ 'is-active': noteMode === 'html-folder' }" type="button" @click="chooseHtmlSource('folder')">
          HTML Folder
        </button>
      </div>
      <label>
        <span>Initial title</span>
        <input v-model="initialTitle" :disabled="noteMode !== 'markdown'" placeholder="Note title" />
      </label>
      <pre v-if="noteMode === 'markdown'">{{ markdown }}</pre>
      <section v-else class="html-source-panel">
        <div class="section-label">HTML Source</div>
        <strong>{{ noteMode === "html-folder" ? "Folder import" : "File import" }}</strong>
        <small>{{ htmlSourcePath || "Choose an HTML file or folder." }}</small>
      </section>
    </template>

    <footer>
      <button class="hud-button button-with-icon" @click="$emit('close')"><AppIcon name="x" /><span class="button-icon-label">Cancel</span></button>
      <button class="hud-button button-with-icon" :disabled="!formValid" style="--button-color: var(--graphics)" @click="submit">
        <AppIcon name="file-plus" /><span class="button-icon-label">{{ noteMode === "markdown" ? "Add Note" : "Import Note" }}</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.add-note-dialog {
  --dialog-pad: 36px;
  width: min(640px, calc(100vw - 48px));
}

.add-note-dialog > header,
.add-note-dialog > label,
.add-note-dialog > .empty-state,
.add-note-dialog > pre,
.add-note-dialog > .html-source-panel,
.add-note-dialog > .mode-switch,
.add-note-dialog > footer,
.add-note-dialog :deep(.node-filter-list) {
  margin-inline: var(--dialog-pad);
}

.add-note-dialog :deep(.node-filter-list label) {
  margin-inline: 0;
}

.empty-state { border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-secondary); padding: 16px; }
pre { max-height: 180px; overflow: auto; border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-muted); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); padding: 12px; }
.mode-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.mode-switch button {
  min-height: 34px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 900;
  text-transform: uppercase;
}
.mode-switch button:hover,
.mode-switch button.is-active {
  border-color: var(--border-primary);
  color: var(--text-primary);
}
.html-source-panel {
  display: grid;
  gap: 7px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--graphics);
  background: var(--background-main);
  padding: 12px;
}
.html-source-panel strong {
  color: var(--text-primary);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}
.html-source-panel small {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
}
.hud-button:disabled { cursor: not-allowed; opacity: 0.42; }
</style>
