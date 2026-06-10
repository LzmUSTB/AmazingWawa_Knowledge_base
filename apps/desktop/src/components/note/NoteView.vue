<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import NoteBlockRenderer from "./NoteBlockRenderer.vue";
import NoteEditor from "./NoteEditor.vue";
import NoteFindBar from "./NoteFindBar.vue";
import NoteToolbar from "./NoteToolbar.vue";
import { findGraphNode, getActiveVault, getGraphNodes } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const props = defineProps({
  noteId: {
    type: String,
    required: true,
  },
  canSaveNote: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  noteFindCloseKey: {
    type: Number,
    default: 0,
  },
  noteFindOpenKey: {
    type: Number,
    default: 0,
  },
  noteFindQuery: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["dirty-change", "find-visible-change", "save-note", "set-mode", "show-graph"]);

const readSurfaceRef = ref(null);
const node = computed(() => findGraphNode(props.noteId) || getGraphNodes()[0]);
const accent = computed(() => getDomainColor(node.value.domain));
const noteMarkdown = computed(() => getActiveVault().notes[props.noteId]?.markdown || "");
const blockRegistry = computed(() => getActiveVault().blockRegistry || {});
const vaultRootPath = computed(() => getActiveVault().vaultRootPath || "");
const draftMarkdown = ref(noteMarkdown.value);
const findOpen = ref(false);
const findQuery = ref("");
const findMatches = ref([]);
const findCurrentIndex = ref(0);
const dirty = computed(() => draftMarkdown.value !== noteMarkdown.value);
const readMarkdown = computed(() => noteMarkdown.value || `## Summary\n\n${node.value.summary || "No note.md was found for this node."}`);

watch(noteMarkdown, (nextMarkdown) => {
  if (props.mode !== "edit") draftMarkdown.value = nextMarkdown;
});

watch(
  () => props.noteId,
  () => {
    draftMarkdown.value = noteMarkdown.value;
    emit("dirty-change", false);
    closeFind();
  },
);

watch(dirty, (nextDirty) => emit("dirty-change", nextDirty), { immediate: true });

watch(
  () => props.mode,
  (mode) => {
    if (mode !== "read") closeFind();
  },
);

watch(
  () => props.noteFindOpenKey,
  () => openFind(props.noteFindQuery),
);

watch(
  () => props.noteFindCloseKey,
  () => closeFind(),
);

watch(
  () => props.noteFindQuery,
  (query) => {
    if (!findOpen.value || query === findQuery.value) return;
    findQuery.value = query;
  },
);

watch(findOpen, (visible) => emit("find-visible-change", visible), { immediate: true });

watch([findOpen, findQuery, readMarkdown], () => {
  findCurrentIndex.value = 0;
  scheduleHighlight();
});

onBeforeUnmount(() => removeHighlights());

function startEdit() {
  draftMarkdown.value = noteMarkdown.value;
  emit("set-mode", "edit");
}

function cancelEdit() {
  if (dirty.value && !window.confirm("Discard unsaved note changes?")) return;
  draftMarkdown.value = noteMarkdown.value;
  emit("dirty-change", false);
  emit("set-mode", "read");
}

function saveNote() {
  if (!dirty.value || props.saving) return;
  if (!props.canSaveNote) {
    window.alert("Open a desktop vault folder before saving.");
    return;
  }
  emit("save-note", {
    node: node.value,
    markdown: draftMarkdown.value,
  });
}

function openFind(query = findQuery.value) {
  if (props.mode !== "read") return;
  findOpen.value = true;
  if (query !== undefined) findQuery.value = query;
  findCurrentIndex.value = 0;
  scheduleHighlight();
}

function closeFind() {
  findOpen.value = false;
  findMatches.value = [];
  findCurrentIndex.value = 0;
  removeHighlights();
}

function scheduleHighlight() {
  nextTick(() => applyHighlights());
}

function removeHighlights() {
  const root = readSurfaceRef.value;
  if (!root) return;
  const marks = [...root.querySelectorAll("mark[data-note-find-match]")];
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue.trim()) return true;
  return Boolean(parent.closest("script, style, input, textarea, select, mark[data-note-find-match]"));
}

function textNodesForHighlight(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return shouldSkipTextNode(textNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  return nodes;
}

function highlightTextNode(textNode, query) {
  const text = textNode.nodeValue || "";
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const fragment = document.createDocumentFragment();
  let index = 0;
  let found = false;

  while (index < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, index);
    if (matchIndex < 0) break;
    if (matchIndex > index) fragment.appendChild(document.createTextNode(text.slice(index, matchIndex)));
    const mark = document.createElement("mark");
    mark.dataset.noteFindMatch = "true";
    mark.textContent = text.slice(matchIndex, matchIndex + query.length);
    fragment.appendChild(mark);
    index = matchIndex + query.length;
    found = true;
  }

  if (!found) return;
  if (index < text.length) fragment.appendChild(document.createTextNode(text.slice(index)));
  textNode.parentNode.replaceChild(fragment, textNode);
}

function applyHighlights() {
  removeHighlights();
  if (!findOpen.value || props.mode !== "read" || !findQuery.value.trim()) {
    findMatches.value = [];
    findCurrentIndex.value = 0;
    return;
  }
  const root = readSurfaceRef.value;
  if (!root) return;
  const query = findQuery.value.trim();
  textNodesForHighlight(root).forEach((textNode) => highlightTextNode(textNode, query));
  findMatches.value = [...root.querySelectorAll("mark[data-note-find-match]")];
  if (!findMatches.value.length) {
    findCurrentIndex.value = 0;
    return;
  }
  findCurrentIndex.value = Math.min(findCurrentIndex.value, findMatches.value.length - 1);
  updateCurrentMatch({ scroll: true });
}

function updateCurrentMatch({ scroll = true } = {}) {
  findMatches.value.forEach((match, index) => {
    match.classList.toggle("is-current", index === findCurrentIndex.value);
  });
  if (scroll && findMatches.value[findCurrentIndex.value]) {
    findMatches.value[findCurrentIndex.value].scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }
}

function moveFind(delta) {
  const count = findMatches.value.length;
  if (!count) return;
  findCurrentIndex.value = (findCurrentIndex.value + delta + count) % count;
  updateCurrentMatch();
}
</script>

<template>
  <section class="note-view">
    <NoteToolbar
      :can-save-note="canSaveNote"
      :dirty="dirty"
      :mode="mode"
      :saving="saving"
      @cancel-edit="cancelEdit"
      @edit="startEdit"
      @save="saveNote"
      @show-graph="$emit('show-graph')"
    />

    <article class="note-content technical-grid" :style="{ '--note-color': accent }">
      <NoteFindBar
        v-model:query="findQuery"
        :current-index="findCurrentIndex"
        :total="findMatches.length"
        :visible="findOpen && mode === 'read'"
        @close="closeFind"
        @next="moveFind(1)"
        @previous="moveFind(-1)"
      />
      <div class="note-shell">
        <header class="note-header">
          <div class="note-accent"></div>
          <div>
            <h1>{{ node.title }}</h1>
            <div class="note-chips">
              <span>{{ node.domain }}</span>
              <span>{{ node.type }}</span>
              <span>status: {{ node.status }}</span>
            </div>
          </div>
        </header>

        <NoteEditor v-if="mode === 'edit'" v-model="draftMarkdown" />

        <div v-else ref="readSurfaceRef" class="read-surface">
          <NoteBlockRenderer
            :markdown="readMarkdown"
            :search-query="findOpen ? findQuery : ''"
            :block-registry="blockRegistry"
            :node="node"
            :vault-root-path="vaultRootPath"
          />
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.note-view {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.note-content {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.note-shell {
  width: 100%;
  max-width: none;
  min-height: 100%;
  margin: 0;
  border-left: 1px solid var(--border-primary);
  border-right: 0;
  border-top: 0;
  border-bottom: 0;
  background: var(--background-main);
}

.note-header {
  display: grid;
  grid-template-columns: 5px 1fr;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
}

.note-accent {
  background: var(--note-color);
}

.note-header > div:last-child {
  padding: 28px 32px 24px;
}

h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-note-title);
  line-height: 1.1;
}

.note-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.note-chips span {
  min-height: 24px;
  padding: 5px 10px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--note-color);
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.read-surface {
  width: 100%;
  min-width: 0;
  padding: clamp(20px, 3vw, 42px);
}

.read-surface :deep(mark[data-note-find-match]) {
  background: rgba(255, 213, 0, 0.34);
  color: var(--text-primary);
  outline: 1px solid rgba(255, 213, 0, 0.42);
  padding: 0 1px;
}

.read-surface :deep(mark[data-note-find-match].is-current) {
  background: var(--career);
  color: var(--background-main);
  outline: 2px solid var(--border-primary);
}
</style>
