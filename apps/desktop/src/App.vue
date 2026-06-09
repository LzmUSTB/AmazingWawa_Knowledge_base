<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import WorkspaceLayout from "./components/layout/WorkspaceLayout.vue";
import MobileLocalGraphView from "./components/mobile/MobileLocalGraphView.vue";
import MobileNoteView from "./components/mobile/MobileNoteView.vue";
import {
  chooseVaultRoot,
  createKnowledgeItem,
  loadInitialVault,
  loadVaultFromPath,
  saveGraphLayoutBoard,
  writeNoteMarkdown,
} from "./data/desktop-vault-adapter.js";
import { loadStaticVault } from "./data/static-vault-loader.js";
import { findGraphNode, getGraphNodes, setActiveVault, useActiveVault } from "./graph/graph-data-store.js";
import { getGraphBoardSize, getNodeLayout } from "./graph/graph-layout.js";
import { getGraphScope, hasGraphScope, scopeForDomain } from "./graph/graph-scope.js";

const SIDEBAR_KEY = "amazingwawa.sidebarCollapsed";
const UI_FONT_SCALE_KEY = "amazingwawa.uiFontScale";
const savedSidebarPreference = localStorage.getItem(SIDEBAR_KEY);
const savedUiFontScale = Number(localStorage.getItem(UI_FONT_SCALE_KEY));
const initialVault = { ...loadStaticVault(), vaultRootPath: "", source: "static" };
setActiveVault(initialVault);

const currentView = ref("graph");
const currentDomain = ref(initialVault.vault.defaultDomain || initialVault.domains[0]?.id || "root");
const firstConcept = initialVault.nodes.find((node) => node.type !== "domain");
const currentNoteId = ref(firstConcept?.id || currentDomain.value);
const selectedNodeId = ref(currentDomain.value);
const graphScopeId = ref("root");
const noteMode = ref("read");
const activeDialog = ref("");
const activeVaultRootPath = ref("");
const noteDirty = ref(false);
const noteSaving = ref(false);
const isLayoutEditing = ref(false);
const layoutDirty = ref(false);
const layoutDraftBoards = ref({});
const layoutMovedNodeIds = ref({});
const activeLayoutScopeId = ref("");
const layoutSaveInProgress = ref(false);
const layoutError = ref("");
const uiFontScale = ref(Number.isFinite(savedUiFontScale) ? clampUiFontScale(savedUiFontScale) : 1);
const sidebarCollapsed = ref(
  savedSidebarPreference === null ? window.innerWidth < 1000 : savedSidebarPreference === "true",
);

const selectedNode = computed(
  () => findGraphNode(selectedNodeId.value) || getGraphNodes()[0],
);
const canSaveNote = computed(() => Boolean(activeVaultRootPath.value));
const canSaveLayout = computed(() => Boolean(activeVaultRootPath.value));
const activeVaultTitle = computed(() => useActiveVault().value?.vault?.title || "Knowledge Base");
const currentDraftLayoutBoard = computed(() => layoutDraftBoards.value[graphScopeId.value] || null);
const currentDraftMovedNodeIds = computed(() => layoutMovedNodeIds.value[graphScopeId.value] || []);

onMounted(async () => {
  window.addEventListener("wheel", handleGlobalWheel, { passive: false });
  window.addEventListener("keydown", handleGlobalKeydown);
  try {
    const vault = await loadInitialVault();
    applyVault(vault, { reset: true });
  } catch (error) {
    console.warn("[vault] Initial vault load failed; keeping static fallback.", error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("wheel", handleGlobalWheel);
  window.removeEventListener("keydown", handleGlobalKeydown);
});

function applyVault(vault, { reset = false } = {}) {
  setActiveVault(vault);
  activeVaultRootPath.value = vault.vaultRootPath || "";

  if (reset) {
    clearLayoutDrafts();
    resetNavigationForVault(vault);
    return;
  }

  if (!findGraphNode(selectedNodeId.value)) {
    graphScopeId.value = "root";
    selectedNodeId.value = getGraphScope("root").selectedNodeId;
  }
  if (!findGraphNode(currentNoteId.value)) {
    currentNoteId.value = getGraphNodes().find((node) => node.type !== "domain")?.id || selectedNodeId.value;
  }
  if (!hasGraphScope(graphScopeId.value)) {
    graphScopeId.value = "root";
  }
}

function resetNavigationForVault(vault) {
  const defaultDomain = vault.vault.defaultDomain || vault.domains[0]?.id || "root";
  const rootScope = getGraphScope("root");
  currentDomain.value = defaultDomain;
  currentNoteId.value = vault.nodes.find((node) => node.type !== "domain")?.id || defaultDomain;
  selectedNodeId.value = rootScope.selectedNodeId || defaultDomain;
  graphScopeId.value = "root";
  currentView.value = "graph";
  noteMode.value = "read";
  noteDirty.value = false;
}

function hasDomain(domainId) {
  return Boolean(useActiveVault().value.domains?.some((domain) => domain.id === domainId));
}

function getFallbackDomain() {
  const activeVault = useActiveVault().value;
  return activeVault.vault.defaultDomain || activeVault.domains?.[0]?.id || "root";
}

function clampUiFontScale(value) {
  return Math.min(1.25, Math.max(0.85, value));
}

function setUiFontScale(value) {
  uiFontScale.value = clampUiFontScale(value);
  localStorage.setItem(UI_FONT_SCALE_KEY, uiFontScale.value.toFixed(2));
}

function handleGlobalWheel(event) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setUiFontScale(uiFontScale.value + (event.deltaY < 0 ? 0.05 : -0.05));
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape" || activeDialog.value || (!isLayoutEditing.value && !layoutDirty.value)) return;
  event.preventDefault();
  discardLayoutDraft();
}

function clearLayoutDrafts() {
  isLayoutEditing.value = false;
  layoutDirty.value = false;
  layoutDraftBoards.value = {};
  layoutMovedNodeIds.value = {};
  activeLayoutScopeId.value = "";
  layoutSaveInProgress.value = false;
  layoutError.value = "";
}

function confirmDiscardNoteDirty() {
  if (!noteDirty.value) return true;
  const confirmed = window.confirm("Discard unsaved note changes?");
  if (confirmed) {
    noteDirty.value = false;
    noteMode.value = "read";
  }
  return confirmed;
}

function discardLayoutDraft({ confirm = true } = {}) {
  if (confirm && layoutDirty.value && !window.confirm("You have unsaved layout changes. Discard them?")) {
    return false;
  }
  const scopeId = activeLayoutScopeId.value || graphScopeId.value;
  const nextBoards = { ...layoutDraftBoards.value };
  const nextMoved = { ...layoutMovedNodeIds.value };
  delete nextBoards[scopeId];
  delete nextMoved[scopeId];
  layoutDraftBoards.value = nextBoards;
  layoutMovedNodeIds.value = nextMoved;
  isLayoutEditing.value = false;
  layoutDirty.value = false;
  activeLayoutScopeId.value = "";
  layoutError.value = "";
  return true;
}

function confirmDiscardLayoutDirty() {
  if (!layoutDirty.value) return true;
  return discardLayoutDraft();
}

function confirmDiscardDirty() {
  return confirmDiscardNoteDirty() && confirmDiscardLayoutDirty();
}

function buildDraftBoard(scopeId) {
  const scope = getGraphScope(scopeId);
  const size = getGraphBoardSize(scopeId);
  const existingBoard = useActiveVault().value.layouts?.boards?.[scopeId];
  const nodes = Object.fromEntries(
    scope.nodes.map((node) => {
      const box = existingBoard?.nodes?.[node.id] || getNodeLayout(node.id, scopeId);
      return [
        node.id,
        {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
      ];
    }),
  );

  return {
    width: existingBoard?.width || size.width || 2400,
    height: existingBoard?.height || size.height || 1600,
    grid: existingBoard?.grid || 32,
    nodes,
  };
}

function ensureLayoutDraft(scopeId = graphScopeId.value) {
  const resolvedScopeId = scopeId || "root";
  activeLayoutScopeId.value = resolvedScopeId;
  const existingDraft = layoutDraftBoards.value[resolvedScopeId];
  if (existingDraft) return existingDraft;
  const draftBoard = buildDraftBoard(resolvedScopeId);
  layoutDraftBoards.value = {
    ...layoutDraftBoards.value,
    [resolvedScopeId]: draftBoard,
  };
  layoutMovedNodeIds.value = {
    ...layoutMovedNodeIds.value,
    [resolvedScopeId]: layoutMovedNodeIds.value[resolvedScopeId] || [],
  };
  return draftBoard;
}

function startLayoutEditing() {
  layoutError.value = "";
  ensureLayoutDraft(graphScopeId.value);
  isLayoutEditing.value = true;
}

function updateDraftNodeLayout({ nodeId, layout }) {
  if (!nodeId || !layout) return;
  const scopeId = graphScopeId.value;
  const board = ensureLayoutDraft(scopeId);
  layoutDraftBoards.value = {
    ...layoutDraftBoards.value,
    [scopeId]: {
      ...board,
      nodes: {
        ...board.nodes,
        [nodeId]: {
          ...board.nodes[nodeId],
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height,
        },
      },
    },
  };
  layoutMovedNodeIds.value = {
    ...layoutMovedNodeIds.value,
    [scopeId]: Array.from(new Set([...(layoutMovedNodeIds.value[scopeId] || []), nodeId])),
  };
  activeLayoutScopeId.value = scopeId;
  isLayoutEditing.value = true;
  layoutDirty.value = true;
  layoutError.value = "";
}

async function saveLayout() {
  if (layoutSaveInProgress.value) return;
  if (!canSaveLayout.value) {
    window.alert("Open a desktop vault folder before saving layout.");
    return;
  }
  const scopeId = activeLayoutScopeId.value || graphScopeId.value;
  const board = layoutDraftBoards.value[scopeId] || ensureLayoutDraft(scopeId);
  layoutSaveInProgress.value = true;
  layoutError.value = "";
  const previousView = currentView.value;
  const previousScopeId = graphScopeId.value;
  const previousSelectedNodeId = selectedNodeId.value;
  const previousCurrentDomain = currentDomain.value;
  const movedNodeIds = layoutMovedNodeIds.value[scopeId] || [];

  try {
    const updatedVault = await saveGraphLayoutBoard(activeVaultRootPath.value, scopeId, board, {
      movedNodeIds,
    });
    applyVault(updatedVault, { reset: false });
    currentView.value = "graph";
    graphScopeId.value = hasGraphScope(previousScopeId) ? previousScopeId : "root";
    selectedNodeId.value = findGraphNode(previousSelectedNodeId)
      ? previousSelectedNodeId
      : getGraphScope(graphScopeId.value).selectedNodeId;
    currentDomain.value = hasDomain(previousCurrentDomain) ? previousCurrentDomain : getFallbackDomain();
    discardLayoutDraft({ confirm: false });
  } catch (error) {
    console.error("[vault] Failed to save graph-layout.yaml.", error);
    layoutError.value = String(error);
    window.alert(`Failed to save graph-layout.yaml: ${error}`);
  } finally {
    layoutSaveInProgress.value = false;
  }
}

function showGraph(scopeId = graphScopeId.value, nodeId = selectedNodeId.value) {
  if (!confirmDiscardDirty()) return;
  graphScopeId.value = scopeId || "root";
  const scope = getGraphScope(graphScopeId.value);
  if (scope.type === "domain") currentDomain.value = scope.id;
  if (scope.type === "focus") currentDomain.value = findGraphNode(scope.centerNodeId)?.domain || currentDomain.value;
  selectedNodeId.value = graphScopeId.value === "root" ? scope.selectedNodeId : nodeId;
  currentView.value = "graph";
}

function openNote(nodeId) {
  if (!confirmDiscardDirty()) return;
  const node = findGraphNode(nodeId);
  if (node) {
    currentDomain.value = node.domain;
    currentNoteId.value = node.id;
    selectedNodeId.value = node.id;
  }
  noteMode.value = "read";
  currentView.value = "note";
}

function openDomain(domain) {
  if (!confirmDiscardDirty()) return;
  currentDomain.value = domain;
  selectedNodeId.value = domain;
  graphScopeId.value = scopeForDomain(domain);
  currentView.value = "graph";
}

function openScope(scopeId, selectedId = scopeId) {
  if (!confirmDiscardDirty()) return;
  graphScopeId.value = scopeId;
  selectedNodeId.value = selectedId;
  const scope = getGraphScope(scopeId);
  if (scope.type === "domain") currentDomain.value = scope.id;
  if (scope.type === "focus") currentDomain.value = findGraphNode(scope.centerNodeId)?.domain || currentDomain.value;
  currentView.value = "graph";
}

function openDialog(dialogName) {
  if (dialogName === "new-note" && !confirmDiscardDirty()) return;
  activeDialog.value = dialogName;
}

function setNoteMode(mode) {
  if (noteMode.value === "edit" && mode !== "edit" && !confirmDiscardNoteDirty()) return;
  noteMode.value = mode;
}

function showView(viewName) {
  if (viewName === "graph") {
    showGraph(graphScopeId.value, selectedNodeId.value);
    return;
  }
  if (!confirmDiscardDirty()) return;
  currentView.value = viewName;
}

async function openVault() {
  if (!confirmDiscardDirty()) return;
  try {
    const vaultRoot = await chooseVaultRoot();
    if (!vaultRoot) return;
    const vault = await loadVaultFromPath(vaultRoot);
    applyVault(vault, { reset: true });
    console.log("[vault] Opened desktop vault:", vaultRoot);
  } catch (error) {
    console.error("[vault] Failed to open vault.", error);
    const message = String(error);
    window.alert(
      message.includes("missing vault.yaml")
        ? "Please select the vault folder that contains vault.yaml."
        : `Failed to open vault: ${message}`,
    );
  }
}

async function saveNote({ node, markdown }) {
  if (!node || noteSaving.value) return;
  if (!canSaveNote.value) {
    window.alert("Open a desktop vault folder before saving.");
    return;
  }
  noteSaving.value = true;
  const previousView = currentView.value;
  const previousGraphScopeId = graphScopeId.value;
  const previousSelectedNodeId = selectedNodeId.value;
  const previousCurrentDomain = currentDomain.value;
  const previousNoteId = currentNoteId.value;

  try {
    await writeNoteMarkdown(activeVaultRootPath.value, node, markdown);
    const updatedVault = await loadVaultFromPath(activeVaultRootPath.value);
    applyVault(updatedVault, { reset: false });
    currentView.value = "note";
    currentNoteId.value = node.id;
    selectedNodeId.value = node.id;
    currentDomain.value = findGraphNode(node.id)?.domain || node.domain || previousCurrentDomain;
    graphScopeId.value = hasGraphScope(previousGraphScopeId) ? previousGraphScopeId : "root";
    if (!findGraphNode(previousNoteId)) currentNoteId.value = node.id;
    if (!findGraphNode(previousSelectedNodeId)) selectedNodeId.value = node.id;
    noteDirty.value = false;
    noteMode.value = "read";
  } catch (error) {
    console.error("[vault] Failed to save note.md.", error);
    window.alert(`Failed to save note.md: ${error}`);
  } finally {
    noteSaving.value = false;
  }
}

async function createNote(payload) {
  if (!confirmDiscardDirty()) return;
  if (!canSaveNote.value) {
    window.alert("Open a desktop vault folder before creating notes.");
    return;
  }

  try {
    const result = await createKnowledgeItem(activeVaultRootPath.value, payload);
    applyVault(result.vault, { reset: false });
    currentNoteId.value = result.newNodeId;
    selectedNodeId.value = result.newNodeId;
    currentDomain.value = payload.domain;
    currentView.value = "note";
    noteMode.value = "edit";
    noteDirty.value = false;
    activeDialog.value = "";
  } catch (error) {
    console.error("[vault] Failed to create note.", error);
    window.alert(`Failed to create note: ${error}`);
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed.value));
}
</script>

<template>
  <div class="prototype-shell" :style="{ '--ui-font-scale': uiFontScale }">
    <WorkspaceLayout
      :active-dialog="activeDialog"
      :app-title="activeVaultTitle"
      :can-save-layout="canSaveLayout"
      :can-save-note="canSaveNote"
      :current-domain="currentDomain"
      :current-note-id="currentNoteId"
      :current-view="currentView"
      :draft-layout-board="currentDraftLayoutBoard"
      :draft-moved-node-ids="currentDraftMovedNodeIds"
      :graph-scope-id="graphScopeId"
      :is-layout-editing="isLayoutEditing"
      :layout-dirty="layoutDirty"
      :layout-save-in-progress="layoutSaveInProgress"
      :note-mode="noteMode"
      :note-saving="noteSaving"
      :selected-node-id="selectedNodeId"
      :sidebar-collapsed="sidebarCollapsed"
      @cancel-layout="discardLayoutDraft"
      @close-dialog="activeDialog = ''"
      @create-note="createNote"
      @edit-layout="startLayoutEditing"
      @ensure-layout-draft="ensureLayoutDraft"
      @layout-node-dragged="updateDraftNodeLayout"
      @open-dialog="openDialog"
      @open-domain="openDomain"
      @open-note="openNote"
      @open-scope="openScope"
      @open-vault="openVault"
      @save-layout="saveLayout"
      @save-note="saveNote"
      @select-node="selectedNodeId = $event"
      @set-note-dirty="noteDirty = $event"
      @set-note-mode="setNoteMode"
      @show-graph="showGraph"
      @show-view="showView"
      @toggle-sidebar="toggleSidebar"
    />

    <div class="mobile-prototype">
      <MobileNoteView v-if="currentView !== 'graph'" :node="selectedNode" @show-graph="currentView = 'graph'" />
      <MobileLocalGraphView v-else :selected-node-id="selectedNodeId" @open-note="openNote" />
    </div>
  </div>
</template>

<style>
:root {
  --background-main: #090909;
  --background-panel: #111111;
  --background-elevated: #181818;
  --border-primary: #ededed;
  --border-muted: #555555;
  --text-primary: #f5f5f5;
  --text-secondary: #b8b8b8;
  --text-muted: #777777;
  --graphics: #00b7ff;
  --linear-algebra: #ededed;
  --machine-learning: #c8ff00;
  --web-dev: #ff2bd6;
  --game-dev: #ff3b30;
  --career: #ffd500;
  --simulation: #7c5cff;
  --language: #00e5a8;
  --dcc-tools: #ff8a00;
  --relation-contains: #dcdcdc;
  --relation-depends-on: #ffd500;
  --relation-used-in: #7c5cff;
  --relation-compares-with: #ff8a00;
  --ui-font-scale: 1;
  --font-size-ui: calc(12px * var(--ui-font-scale));
  --font-size-small: calc(10px * var(--ui-font-scale));
  --font-size-title: calc(20px * var(--ui-font-scale));
  --font-size-note-title: calc(36px * var(--ui-font-scale));
  --font-size-mono: calc(13px * var(--ui-font-scale));
  color: var(--text-primary);
  background: var(--background-main);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-synthesis: none;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  overflow: hidden;
  background: var(--background-main);
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  color: inherit;
}

.prototype-shell {
  min-height: 100vh;
  background: var(--background-main);
  font-size: var(--font-size-ui);
}

.mobile-prototype {
  display: none;
}

.hud-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid var(--button-color, var(--border-muted));
  border-left-width: 4px;
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-ui);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
}

.hud-button:hover,
.hud-button.is-active {
  border-color: var(--border-primary);
  border-left-color: var(--button-color, var(--border-primary));
  background: var(--background-elevated);
}

.panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
}

.panel-label::before {
  width: 3px;
  height: 15px;
  background: var(--label-color, var(--border-primary));
  content: "";
}

.technical-grid {
  background-color: var(--background-main);
  background-image: url("data:image/svg+xml,%3Csvg width='128' height='128' viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23EDEDED' stroke-width='1'%3E%3Cpath opacity='0.08' d='M0 0H128M0 32H128M0 64H128M0 96H128M0 128H128M0 0V128M32 0V128M64 0V128M96 0V128M128 0V128'/%3E%3Cpath opacity='0.18' d='M0 0H128M0 0V128'/%3E%3Cpath opacity='0.16' d='M59 64H69M64 59V69'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 128px 128px;
}

.dialog-card {
  display: grid;
  gap: 18px;
  border: 1px solid var(--border-primary);
  background: var(--background-elevated);
}

.dialog-card .dialog-accent {
  height: 4px;
  background: var(--career);
}

.dialog-card header,
.dialog-card label,
.dialog-card .dialog-grid,
.dialog-card .relation-options,
.dialog-card .graph-yaml-note,
.dialog-card footer {
  margin-inline: 28px;
}

.dialog-card header {
  display: grid;
  gap: 8px;
}

.dialog-card h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.15;
}

.dialog-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.5;
}

.dialog-card label {
  display: grid;
  gap: 8px;
}

.dialog-card label span {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.dialog-card input,
.dialog-card select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  background: var(--background-main);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-ui);
  padding: 0 12px;
}

.dialog-card input:focus,
.dialog-card select:focus {
  border-color: var(--border-primary);
}

.dialog-card .dialog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.dialog-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 24px;
  padding-top: 4px;
}

@media (max-width: 760px) {
  body {
    overflow: auto;
  }

  .desktop-prototype {
    display: none;
  }

  .mobile-prototype {
    display: block;
    min-height: 100vh;
  }
}

/* =========================================================
   Global Scrollbar
   Hard-edged technical UI style
   ========================================================= */

* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-muted) var(--background-main);
}

::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: var(--background-main);
  border-left: 1px solid rgba(237, 237, 237, 0.16);
}

::-webkit-scrollbar-thumb {
  background: var(--background-elevated);
  border: 1px solid var(--border-muted);
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-muted);
  border-color: var(--border-primary);
}

::-webkit-scrollbar-thumb:active {
  background: var(--text-secondary);
  border-color: var(--border-primary);
}

::-webkit-scrollbar-corner {
  background: var(--background-main);
}

/* Horizontal scrollbar for toolbars or code-like areas */
.top-actions::-webkit-scrollbar,
.note-toolbar::-webkit-scrollbar,
.graph-toolbar::-webkit-scrollbar {
  height: 8px;
}

.top-actions::-webkit-scrollbar-track,
.note-toolbar::-webkit-scrollbar-track,
.graph-toolbar::-webkit-scrollbar-track {
  background: var(--background-panel);
  border-top: 1px solid rgba(237, 237, 237, 0.16);
}

.top-actions::-webkit-scrollbar-thumb,
.note-toolbar::-webkit-scrollbar-thumb,
.graph-toolbar::-webkit-scrollbar-thumb {
  background: var(--background-elevated);
  border: 1px solid var(--border-muted);
}

/* Dense scroll areas */
.tree-list::-webkit-scrollbar,
.note-content::-webkit-scrollbar,
.graph-viewport::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.tree-list::-webkit-scrollbar-thumb,
.note-content::-webkit-scrollbar-thumb,
.graph-viewport::-webkit-scrollbar-thumb {
  background: #181818;
  border: 1px solid #555555;
}

.tree-list::-webkit-scrollbar-thumb:hover,
.note-content::-webkit-scrollbar-thumb:hover,
.graph-viewport::-webkit-scrollbar-thumb:hover {
  background: #2a2a2a;
  border-color: var(--border-primary);
}
</style>
