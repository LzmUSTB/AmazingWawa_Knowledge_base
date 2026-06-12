<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import HtmlNoteRenderer from "./HtmlNoteRenderer.vue";
import NoteBlockRenderer from "./NoteBlockRenderer.vue";
import NoteEditor from "./NoteEditor.vue";
import NoteFindBar from "./NoteFindBar.vue";
import NoteToolbar from "./NoteToolbar.vue";
import { findGraphNode, getActiveVault, getGraphNodes } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const props = defineProps({
  noteId: { type: String, required: true },
  canSaveNote: { type: Boolean, default: false },
  mode: { type: String, required: true },
  saving: { type: Boolean, default: false },
  noteFindCloseKey: { type: Number, default: 0 },
  noteFindOpenKey: { type: Number, default: 0 },
  noteFindQuery: { type: String, default: "" },
});

const emit = defineEmits(["dirty-change", "find-visible-change", "save-note", "set-mode", "show-graph"]);

const readSurfaceRef = ref(null);
const fallbackNode = { id: "", title: "Untitled", domain: "root", type: "note", status: "draft", summary: "" };
const node = computed(() => findGraphNode(props.noteId) || getGraphNodes()[0] || fallbackNode);
const accent = computed(() => getDomainColor(node.value.domain));
const noteRecord = computed(() => getActiveVault().notes[props.noteId] || null);
const noteMarkdown = computed(() => noteRecord.value?.markdown || "");
const noteHtml = computed(() => noteRecord.value?.html || "");
const noteFormat = computed(() => noteRecord.value?.format || (node.value?.contentFormat === "html" ? "html" : noteRecord.value ? "markdown" : "none"));
const hasMarkdownNote = computed(() => noteFormat.value === "markdown" && Boolean(noteMarkdown.value));
const hasHtmlNote = computed(() => noteFormat.value === "html" && Boolean(noteHtml.value));
const hasAnyNote = computed(() => hasMarkdownNote.value || hasHtmlNote.value);
const blockRegistry = computed(() => getActiveVault().blockRegistry || {});
const vaultRootPath = computed(() => getActiveVault().vaultRootPath || "");
const draftMarkdown = ref(noteMarkdown.value);
const findOpen = ref(false);
const findQuery = ref("");
const findMatches = ref([]);
const findCurrentIndex = ref(0);
const handledFindOpenKey = ref(props.noteFindOpenKey);
const htmlFindTotal = ref(0);
const htmlFindCurrentIndex = ref(0);
const htmlSearchMoveToken = ref(0);
const htmlSearchMoveDirection = ref(1);
const dirty = computed(() => draftMarkdown.value !== noteMarkdown.value);
const findTotal = computed(() => (hasHtmlNote.value ? htmlFindTotal.value : findMatches.value.length));
const activeFindIndex = computed(() => (hasHtmlNote.value ? htmlFindCurrentIndex.value : findCurrentIndex.value));

watch(noteMarkdown, (nextMarkdown) => { if (props.mode !== "edit") draftMarkdown.value = nextMarkdown; });
watch(() => props.noteId, () => { draftMarkdown.value = noteMarkdown.value; emit("dirty-change", false); closeFind(); });
watch(dirty, (nextDirty) => emit("dirty-change", nextDirty), { immediate: true });
watch(() => props.mode, (mode) => { if (mode !== "read") closeFind(); });
watch(() => props.noteFindOpenKey, () => {
  if (props.noteFindOpenKey === handledFindOpenKey.value) return;
  handledFindOpenKey.value = props.noteFindOpenKey;
  openFind(props.noteFindQuery);
});
watch(() => props.noteFindCloseKey, () => closeFind());
watch(() => props.noteFindQuery, (query) => { if (!findOpen.value || query === findQuery.value) return; findQuery.value = query; });
watch(findOpen, (visible) => emit("find-visible-change", visible), { immediate: true });
watch([findOpen, findQuery, noteMarkdown, noteHtml], () => {
  findCurrentIndex.value = 0;
  htmlFindTotal.value = 0;
  htmlFindCurrentIndex.value = 0;
  scheduleHighlight();
});
onBeforeUnmount(() => removeHighlights());
onMounted(() => {
  if (props.noteFindOpenKey > 0 && props.noteFindQuery) {
    handledFindOpenKey.value = props.noteFindOpenKey;
    openFind(props.noteFindQuery);
  }
});

function initialDraftMarkdown() {
  return `# ${node.value.title}\n\n## 一句话定义\n\n${node.value.summary || ""}\n\n## 它解决什么问题？\n\n## 核心直觉\n\n## 正式解释\n\n## 最小例子\n\n## 常见误区\n\n## 相关知识\n\n## 复习问题\n\n`;
}
function startEdit() {
  if (hasHtmlNote.value) {
    window.alert("HTML notes are read-only in the current editor. Create or edit note.html as a file, or create a Markdown note for this node.");
    return;
  }
  draftMarkdown.value = noteMarkdown.value || initialDraftMarkdown();
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
  if (!props.canSaveNote) { window.alert("Open a desktop vault folder before saving."); return; }
  emit("save-note", { node: node.value, markdown: draftMarkdown.value });
}
function openFind(query = findQuery.value) { if (props.mode !== "read") return; findOpen.value = true; if (query !== undefined) findQuery.value = query; findCurrentIndex.value = 0; scheduleHighlight(); }
function closeFind() { findOpen.value = false; findMatches.value = []; findCurrentIndex.value = 0; htmlFindTotal.value = 0; htmlFindCurrentIndex.value = 0; removeHighlights(); }
function scheduleHighlight() { nextTick(() => applyHighlights()); }
function removeHighlights() {
  const root = readSurfaceRef.value;
  if (!root) return;
  const marks = [...root.querySelectorAll("mark[data-note-find-match]")];
  marks.forEach((mark) => { const parent = mark.parentNode; if (!parent) return; while (mark.firstChild) parent.insertBefore(mark.firstChild, mark); parent.removeChild(mark); parent.normalize(); });
}
function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue.trim()) return true;
  return Boolean(parent.closest("script, style, input, textarea, select, mark[data-note-find-match]"));
}
function textNodesForHighlight(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(textNode) { return shouldSkipTextNode(textNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
  const nodes = [];
  let current = walker.nextNode();
  while (current) { nodes.push(current); current = walker.nextNode(); }
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
  if (hasHtmlNote.value) return;
  if (!findOpen.value || props.mode !== "read" || !findQuery.value.trim()) { findMatches.value = []; findCurrentIndex.value = 0; return; }
  const root = readSurfaceRef.value;
  if (!root) return;
  const query = findQuery.value.trim();
  textNodesForHighlight(root).forEach((textNode) => highlightTextNode(textNode, query));
  findMatches.value = [...root.querySelectorAll("mark[data-note-find-match]")];
  if (!findMatches.value.length) { findCurrentIndex.value = 0; return; }
  findCurrentIndex.value = Math.min(findCurrentIndex.value, findMatches.value.length - 1);
  updateCurrentMatch({ scroll: true });
}
function updateCurrentMatch({ scroll = true } = {}) {
  findMatches.value.forEach((match, index) => match.classList.toggle("is-current", index === findCurrentIndex.value));
  if (scroll && findMatches.value[findCurrentIndex.value]) findMatches.value[findCurrentIndex.value].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}
function moveFind(delta) {
  if (hasHtmlNote.value) {
    if (!htmlFindTotal.value) return;
    htmlSearchMoveDirection.value = delta;
    htmlSearchMoveToken.value += 1;
    return;
  }
  const count = findMatches.value.length; if (!count) return; findCurrentIndex.value = (findCurrentIndex.value + delta + count) % count; updateCurrentMatch();
}
function handleHtmlFindResults(payload) {
  htmlFindTotal.value = Number(payload?.total || 0);
  htmlFindCurrentIndex.value = Number(payload?.currentIndex || 0);
}
</script>

<template>
  <section class="note-view">
    <NoteToolbar :can-save-note="canSaveNote" :dirty="dirty" :mode="mode" :saving="saving" @cancel-edit="cancelEdit" @edit="startEdit" @save="saveNote" @show-graph="$emit('show-graph')" />
    <article class="note-content technical-grid" :class="{ 'is-html-note': hasHtmlNote }" :style="{ '--note-color': accent }">
      <NoteFindBar v-model:query="findQuery" :current-index="activeFindIndex" :total="findTotal" :visible="findOpen && mode === 'read'" @close="closeFind" @next="moveFind(1)" @previous="moveFind(-1)" />
      <div class="note-shell">
        <header class="note-header">
          <div class="note-accent"></div>
          <div>
            <h1>{{ node.title }}</h1>
            <div class="note-chips"><span>{{ node.domain }}</span><span>{{ node.type }}</span><span>status: {{ node.status }}</span><span v-if="hasHtmlNote">html</span><span v-else-if="!hasAnyNote">empty</span></div>
          </div>
        </header>
        <NoteEditor v-if="mode === 'edit' && (noteFormat !== 'none' || draftMarkdown)" v-model="draftMarkdown" />
        <div v-else ref="readSurfaceRef" class="read-surface" :class="{ 'is-html-note': hasHtmlNote }">
          <HtmlNoteRenderer
            v-if="hasHtmlNote"
            :html="noteHtml"
            :node="node"
            :search-active="findOpen && mode === 'read'"
            :search-move-direction="htmlSearchMoveDirection"
            :search-move-token="htmlSearchMoveToken"
            :search-query="findQuery"
            :vault-root-path="vaultRootPath"
            fill-viewport
            @find-results-change="handleHtmlFindResults"
          />
          <NoteBlockRenderer v-else-if="hasMarkdownNote" :markdown="noteMarkdown" :search-query="findOpen ? findQuery : ''" :block-registry="blockRegistry" :node="node" :vault-root-path="vaultRootPath" />
          <section v-else class="empty-note-card">
            <div class="empty-kicker">empty node</div>
            <h2>这个节点还没有 note</h2>
            <p>{{ node.summary || '该节点已经存在于 graph 中，但还没有 note.md 或 note.html。' }}</p>
            <button class="hud-button" type="button" style="--button-color: var(--graphics)" @click="startEdit">Create note.md</button>
          </section>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.note-view { display: flex; flex: 1; min-width: 0; min-height: 0; overflow: hidden; flex-direction: column; }
.note-content { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: auto; }
.note-content.is-html-note { display: flex; flex-direction: column; overflow: hidden; }
.note-shell { width: 100%; max-width: none; min-height: 100%; margin: 0; border-left: 1px solid var(--border-primary); border-right: 0; border-top: 0; border-bottom: 0; background: var(--background-main); }
.note-content.is-html-note .note-shell { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.note-header { display: grid; grid-template-columns: 5px 1fr; border-bottom: 1px solid var(--border-muted); background: var(--background-panel); }
.note-accent { background: var(--note-color); }
.note-header > div:last-child { padding: 28px 32px 24px; }
h1 { margin: 0; color: var(--text-primary); font-size: var(--font-size-note-title); line-height: 1.1; }
.note-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.note-chips span { min-height: 24px; padding: 5px 10px; border: 1px solid var(--border-muted); border-left: 4px solid var(--note-color); color: var(--text-secondary); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.read-surface { width: 100%; min-width: 0; padding: clamp(20px, 3vw, 42px); }
.read-surface.is-html-note { display: flex; flex: 1; min-height: 0; overflow: hidden; padding: 0; }
.empty-note-card { display: grid; gap: 14px; width: min(760px, 100%); margin: 0 auto; border: 1px solid var(--border-muted); border-left: 5px solid var(--note-color, var(--graphics)); background: var(--background-panel); padding: 24px; }
.empty-kicker { color: var(--text-muted); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 900; text-transform: uppercase; }
.empty-note-card h2 { margin: 0; color: var(--text-primary); font-size: var(--font-size-title); }
.empty-note-card p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-ui); line-height: 1.7; }
.empty-note-card .hud-button { width: max-content; }
.read-surface :deep(mark[data-note-find-match]) { background: rgba(255, 213, 0, 0.34); color: var(--text-primary); outline: 1px solid rgba(255, 213, 0, 0.42); padding: 0 1px; }
.read-surface :deep(mark[data-note-find-match].is-current) { background: var(--career); color: var(--background-main); outline: 2px solid var(--border-primary); }
</style>
