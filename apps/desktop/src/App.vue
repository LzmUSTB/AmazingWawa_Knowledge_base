<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import NoVaultView from "./components/layout/NoVaultView.vue";
import WorkspaceLayout from "./components/layout/WorkspaceLayout.vue";
import MobileLocalGraphView from "./components/mobile/MobileLocalGraphView.vue";
import MobileNoteView from "./components/mobile/MobileNoteView.vue";
import SearchOverlay from "./components/search/SearchOverlay.vue";
import {
  chooseVaultRoot,
  createGraphLink,
  createKnowledgeItem,
  loadInitialVault,
  loadVaultFromPath,
  removeGraphLink,
  replaceGraphLink,
  saveGraphLayoutBoard,
  writeNoteMarkdown,
} from "./data/desktop-vault-adapter.js";
import { createEmptyVault, findGraphNode, getGraphNodes, setActiveVault, useActiveVault } from "./graph/graph-data-store.js";
import { getGraphBoardSize, getNodeLayout } from "./graph/graph-layout.js";
import { getGraphScope, hasGraphScope, isDomainNode, scopeForDomain } from "./graph/graph-scope.js";
import {
  addRecentNode,
  entriesToShortcutResults,
  loadPinnedNodes,
  loadRecentNodes,
  togglePinnedNode,
} from "./navigation/node-shortcuts.js";

const SIDEBAR_KEY = "amazingwawa.sidebarCollapsed";
const RELATION_SIDEBAR_KEY = "amazingwawa.relationSidebarCollapsed";
const UI_FONT_SCALE_KEY = "amazingwawa.uiFontScale";
const savedSidebarPreference = localStorage.getItem(SIDEBAR_KEY);
const savedRelationSidebarPreference = localStorage.getItem(RELATION_SIDEBAR_KEY);
const savedUiFontScale = Number(localStorage.getItem(UI_FONT_SCALE_KEY));
const initialVault = createEmptyVault();
setActiveVault(initialVault);

const currentView = ref("graph");
const currentDomain = ref("");
const currentNoteId = ref("");
const selectedNodeId = ref("");
const graphScopeId = ref("root");
const noteMode = ref("read");
const activeDialog = ref("");
const activeVaultRootPath = ref("");
const vaultLoading = ref(true);
const vaultLoadError = ref("");
const noteDirty = ref(false);
const noteSaving = ref(false);
const addLinkOpenKey = ref(0);
const addLinkCloseKey = ref(0);
const addLinkSaving = ref(false);
const addLinkError = ref("");
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
const relationSidebarCollapsed = ref(savedRelationSidebarPreference === "true");
const searchOverlayVisible = ref(false);
const searchMode = ref("quick");
const searchQuery = ref("");
const relationEditEdgeId = ref("");
const relationSaving = ref(false);
const relationError = ref("");
const noteFindQuery = ref("");
const noteFindOpenKey = ref(0);
const noteFindCloseKey = ref(0);
const noteFindVisible = ref(false);
const pinnedNodes = ref(loadPinnedNodes());
const recentNodes = ref(loadRecentNodes());
const backStack = ref([]);
const forwardStack = ref([]);
const historySuppressed = ref(false);

const selectedNode = computed(
  () => findGraphNode(selectedNodeId.value) || getGraphNodes()[0],
);
const canSaveNote = computed(() => Boolean(activeVaultRootPath.value));
const canSaveLayout = computed(() => Boolean(activeVaultRootPath.value));
const activeVaultTitle = computed(() => useActiveVault().value?.vault?.title || "Knowledge Base");
const currentDraftLayoutBoard = computed(() => layoutDraftBoards.value[graphScopeId.value] || null);
const currentDraftMovedNodeIds = computed(() => layoutMovedNodeIds.value[graphScopeId.value] || []);
const hasRealVault = computed(() => Boolean(activeVaultRootPath.value) && useActiveVault().value.source === "desktop");
const currentRelationNodeId = computed(() => {
  if (currentView.value === "note") return currentNoteId.value;
  const scope = getGraphScope(graphScopeId.value);
  return selectedNodeId.value || scope.centerNodeId || scope.selectedNodeId || "";
});
const pinnedNodeIds = computed(() => pinnedNodes.value.map((entry) => entry.id));
const pinnedNodeIdSet = computed(() => new Set(pinnedNodeIds.value));
const currentRelationNodePinned = computed(() => pinnedNodeIdSet.value.has(currentRelationNodeId.value));
const pinnedResults = computed(() => entriesToShortcutResults(pinnedNodes.value, "pinned", { limit: 8 }));
const recentResults = computed(() =>
  entriesToShortcutResults(recentNodes.value, "recent", {
    limit: 8,
    excludeIds: pinnedNodeIdSet.value,
  }),
);

if (import.meta.env.DEV) {
  watch([currentView, graphScopeId, selectedNodeId], ([view, scope, selected], [oldView, oldScope, oldSelected]) => {
    console.debug("[nav-state]", {
      from: { view: oldView, scope: oldScope, selected: oldSelected },
      to: { view, scope, selected },
      trace: new Error().stack,
    });
  });
}

onMounted(async () => {
  window.addEventListener("wheel", handleGlobalWheel, { passive: false });
  window.addEventListener("keydown", handleGlobalKeydown);
  try {
    const vault = await loadInitialVault();
    applyVault(vault, { reset: true });
    vaultLoadError.value = "";
  } catch (error) {
    console.warn("[vault] Initial vault load failed.", error);
    setActiveVault(createEmptyVault());
    activeVaultRootPath.value = "";
    vaultLoadError.value = String(error?.message || error);
  } finally {
    vaultLoading.value = false;
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

function replaceVaultWithoutNavigation(vault) {
  setActiveVault(vault);
  activeVaultRootPath.value = vault.vaultRootPath || "";
}

function snapshotNavigation() {
  return {
    view: currentView.value,
    scopeId: graphScopeId.value,
    selectedNodeId: selectedNodeId.value,
    currentNoteId: currentNoteId.value,
    currentDomain: currentDomain.value,
  };
}

function isSameNavigationEntry(a, b) {
  return (
    a?.view === b?.view &&
    a?.scopeId === b?.scopeId &&
    a?.selectedNodeId === b?.selectedNodeId &&
    a?.currentNoteId === b?.currentNoteId &&
    a?.currentDomain === b?.currentDomain
  );
}

function pushNavigationHistory(nextEntry) {
  if (historySuppressed.value) return;
  const currentEntry = snapshotNavigation();
  if (isSameNavigationEntry(currentEntry, nextEntry)) return;
  backStack.value = [...backStack.value, currentEntry].slice(-50);
  forwardStack.value = [];
}

function validatedNavigationEntry(entry) {
  const scopeId = hasGraphScope(entry.scopeId) ? entry.scopeId : "root";
  const scope = getGraphScope(scopeId);
  const selectedId = findGraphNode(entry.selectedNodeId) ? entry.selectedNodeId : scope.selectedNodeId;
  const noteId = findGraphNode(entry.currentNoteId) ? entry.currentNoteId : selectedId;
  const domain = hasDomain(entry.currentDomain)
    ? entry.currentDomain
    : findGraphNode(selectedId)?.domain || getFallbackDomain();
  return {
    ...entry,
    view: entry.view === "note" ? "note" : "graph",
    scopeId,
    selectedNodeId: selectedId,
    currentNoteId: noteId,
    currentDomain: domain,
  };
}

function applyNavigationEntry(entry) {
  const nextEntry = validatedNavigationEntry(entry);
  historySuppressed.value = true;
  currentView.value = nextEntry.view;
  graphScopeId.value = nextEntry.scopeId;
  selectedNodeId.value = nextEntry.selectedNodeId;
  currentNoteId.value = nextEntry.currentNoteId;
  currentDomain.value = nextEntry.currentDomain;
  noteMode.value = "read";
  historySuppressed.value = false;
  recordRecentForNavigation(nextEntry);
}

function goBack() {
  if (!backStack.value.length || !confirmDiscardDirty()) return;
  const previous = backStack.value[backStack.value.length - 1];
  backStack.value = backStack.value.slice(0, -1);
  forwardStack.value = [...forwardStack.value, snapshotNavigation()].slice(-50);
  applyNavigationEntry(previous);
}

function goForward() {
  if (!forwardStack.value.length || !confirmDiscardDirty()) return;
  const next = forwardStack.value[forwardStack.value.length - 1];
  forwardStack.value = forwardStack.value.slice(0, -1);
  backStack.value = [...backStack.value, snapshotNavigation()].slice(-50);
  applyNavigationEntry(next);
}

function restoreNavigation(snapshot, fallbackNodeId = "") {
  const targetScopeId = hasGraphScope(snapshot.scopeId) ? snapshot.scopeId : "root";
  const fallbackScope = getGraphScope(targetScopeId);
  const nextSelectedId = findGraphNode(snapshot.selectedNodeId)
    ? snapshot.selectedNodeId
    : findGraphNode(fallbackNodeId)
      ? fallbackNodeId
      : fallbackScope.selectedNodeId;
  currentView.value = snapshot.view;
  graphScopeId.value = targetScopeId;
  selectedNodeId.value = nextSelectedId;
  currentNoteId.value = findGraphNode(snapshot.currentNoteId) ? snapshot.currentNoteId : nextSelectedId;
  currentDomain.value = hasDomain(snapshot.currentDomain)
    ? snapshot.currentDomain
    : findGraphNode(nextSelectedId)?.domain || getFallbackDomain();
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

function recordRecentNode(nodeId) {
  if (!findGraphNode(nodeId)) return;
  recentNodes.value = addRecentNode(recentNodes.value, nodeId);
}

function recordRecentForNavigation(entry = snapshotNavigation()) {
  if (entry.view === "note") {
    recordRecentNode(entry.currentNoteId);
    return;
  }
  const scope = getGraphScope(entry.scopeId);
  if (scope.type === "domain") {
    recordRecentNode(scope.id);
    return;
  }
  if (scope.type === "focus") {
    recordRecentNode(scope.centerNodeId || entry.selectedNodeId);
    return;
  }
  recordRecentNode(entry.selectedNodeId);
}

function toggleCurrentPinnedNode() {
  if (!currentRelationNodeId.value || !findGraphNode(currentRelationNodeId.value)) return;
  pinnedNodes.value = togglePinnedNode(pinnedNodes.value, currentRelationNodeId.value);
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
  if (searchOverlayVisible.value && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    return;
  }
  if (event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    goBack();
    return;
  }
  if (event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    goForward();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "q") {
    event.preventDefault();
    toggleSearchOverlay();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "f") {
    if (searchOverlayVisible.value) {
      event.preventDefault();
      return;
    }
    if (
      currentView.value === "note" &&
      noteMode.value === "read" &&
      !relationEditEdgeId.value &&
      !activeDialog.value
    ) {
      event.preventDefault();
      openNoteFind(noteFindQuery.value);
    }
    return;
  }
  if (searchOverlayVisible.value && event.key === "Escape") {
    event.preventDefault();
    closeSearchOverlay();
    return;
  }
  if (relationEditEdgeId.value && event.key === "Escape") {
    event.preventDefault();
    closeRelationEdit();
    return;
  }
  if (noteFindVisible.value && currentView.value === "note" && event.key === "Escape") {
    event.preventDefault();
    closeNoteFind();
    return;
  }
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

function discardLayoutDraft({ confirm = true, scopeId = activeLayoutScopeId.value || graphScopeId.value } = {}) {
  if (confirm && layoutDirty.value && !window.confirm("You have unsaved layout changes. Discard them?")) {
    return false;
  }
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
  const previousScopeId = graphScopeId.value;
  const previousSelectedNodeId = selectedNodeId.value;
  const previousCurrentDomain = currentDomain.value;
  const movedNodeIds = layoutMovedNodeIds.value[scopeId] || [];

  try {
    const updatedVault = await saveGraphLayoutBoard(activeVaultRootPath.value, scopeId, board, {
      movedNodeIds,
    });
    replaceVaultWithoutNavigation(updatedVault);
    const targetScopeId = hasGraphScope(scopeId) ? scopeId : hasGraphScope(previousScopeId) ? previousScopeId : "root";
    currentView.value = "graph";
    graphScopeId.value = targetScopeId;
    selectedNodeId.value = findGraphNode(previousSelectedNodeId)
      ? previousSelectedNodeId
      : getGraphScope(targetScopeId).selectedNodeId;
    currentDomain.value = hasDomain(previousCurrentDomain) ? previousCurrentDomain : getFallbackDomain();
    discardLayoutDraft({ confirm: false, scopeId });
    console.debug("[save-layout:restored]", {
      currentView: currentView.value,
      graphScopeId: graphScopeId.value,
      selectedNodeId: selectedNodeId.value,
      savedScopeId: scopeId,
    });
  } catch (error) {
    console.error("[vault] Failed to save graph-layout.yaml.", error);
    layoutError.value = String(error);
    window.alert(`Failed to save graph-layout.yaml: ${error}`);
  } finally {
    layoutSaveInProgress.value = false;
  }
}

function showGraph(scopeId = graphScopeId.value, nodeId = selectedNodeId.value) {
  if (!confirmDiscardDirty()) return false;
  const nextScopeId = scopeId || "root";
  const scope = getGraphScope(nextScopeId);
  const nextSelectedNodeId = nextScopeId === "root" ? scope.selectedNodeId : nodeId;
  pushNavigationHistory({
    view: "graph",
    scopeId: nextScopeId,
    selectedNodeId: nextSelectedNodeId,
    currentNoteId: currentNoteId.value,
    currentDomain: scope.type === "domain" ? scope.id : scope.type === "focus" ? findGraphNode(scope.centerNodeId)?.domain || currentDomain.value : currentDomain.value,
  });
  graphScopeId.value = nextScopeId;
  if (scope.type === "domain") currentDomain.value = scope.id;
  if (scope.type === "focus") currentDomain.value = findGraphNode(scope.centerNodeId)?.domain || currentDomain.value;
  selectedNodeId.value = nextSelectedNodeId;
  currentView.value = "graph";
  recordRecentForNavigation();
  return true;
}

function openNote(nodeId) {
  if (!confirmDiscardDirty()) return false;
  const node = findGraphNode(nodeId);
  if (!node) return false;
  pushNavigationHistory({
    view: "note",
    scopeId: graphScopeId.value,
    selectedNodeId: node.id,
    currentNoteId: node.id,
    currentDomain: node.domain,
  });
  currentDomain.value = node.domain;
  currentNoteId.value = node.id;
  selectedNodeId.value = node.id;
  noteMode.value = "read";
  currentView.value = "note";
  recordRecentNode(nodeId);
  return true;
}

function openDomain(domain) {
  if (!confirmDiscardDirty()) return false;
  const nextScopeId = scopeForDomain(domain);
  pushNavigationHistory({
    view: "graph",
    scopeId: nextScopeId,
    selectedNodeId: domain,
    currentNoteId: currentNoteId.value,
    currentDomain: domain,
  });
  currentDomain.value = domain;
  selectedNodeId.value = domain;
  graphScopeId.value = nextScopeId;
  currentView.value = "graph";
  recordRecentNode(domain);
  return true;
}

function openScope(scopeId, selectedId = scopeId) {
  if (!confirmDiscardDirty()) return false;
  const scope = getGraphScope(scopeId);
  const nextDomain =
    scope.type === "domain"
      ? scope.id
      : scope.type === "focus"
        ? findGraphNode(scope.centerNodeId)?.domain || currentDomain.value
        : currentDomain.value;
  pushNavigationHistory({
    view: "graph",
    scopeId,
    selectedNodeId: selectedId,
    currentNoteId: currentNoteId.value,
    currentDomain: nextDomain,
  });
  graphScopeId.value = scopeId;
  selectedNodeId.value = selectedId;
  if (scope.type === "domain") currentDomain.value = scope.id;
  if (scope.type === "focus") currentDomain.value = findGraphNode(scope.centerNodeId)?.domain || currentDomain.value;
  currentView.value = "graph";
  recordRecentForNavigation();
  return true;
}

function toggleSearchOverlay() {
  searchOverlayVisible.value = !searchOverlayVisible.value;
}

function closeSearchOverlay() {
  searchOverlayVisible.value = false;
}

function nodeGraphScopeId(node) {
  if (!node) return "root";
  if (isDomainNode(node.id)) return scopeForDomain(node.id);
  return hasGraphScope(node.id) ? node.id : scopeForDomain(node.domain);
}

function openSearchNode(result, localGraph = false) {
  const node = findGraphNode(result.targetId);
  if (!node) return false;
  if (isDomainNode(node.id)) return openDomain(node.id);
  if (localGraph) return openScope(nodeGraphScopeId(node), node.id);
  return openNote(node.id);
}

function openNoteFind(query = "") {
  noteFindQuery.value = query || noteFindQuery.value || "";
  noteFindOpenKey.value += 1;
}

function closeNoteFind() {
  noteFindCloseKey.value += 1;
  noteFindVisible.value = false;
}

function executeSearchResult({ result, localGraph = false, query = "" }) {
  if (!result) return;

  let didOpen = false;
  const nodeLikeKinds = new Set(["node", "full-text", "pinned", "recent"]);

  if (nodeLikeKinds.has(result.kind)) {
    didOpen = openSearchNode(result, localGraph);
  } else if (result.kind === "domain") {
    didOpen = openDomain(result.targetId);
  } else if (result.kind === "relation") {
    const sourceNode = findGraphNode(result.sourceId);
    if (!sourceNode) return;
    didOpen = openScope(nodeGraphScopeId(sourceNode), result.sourceId);
  }

  if (didOpen) {
    closeSearchOverlay();

    if (result.kind === "full-text" && !localGraph) {
      noteFindQuery.value = query;
      noteFindOpenKey.value += 1;
    }
  }
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
    vaultLoadError.value = "";
    vaultLoading.value = false;
    console.log("[vault] Opened desktop vault:", vaultRoot);
  } catch (error) {
    console.error("[vault] Failed to open vault.", error);
    const message = String(error);
    vaultLoadError.value = message;
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
  const previousGraphScopeId = graphScopeId.value;
  const previousSelectedNodeId = selectedNodeId.value;
  const previousCurrentDomain = currentDomain.value;
  const savedNodeId = node.id;

  try {
    await writeNoteMarkdown(activeVaultRootPath.value, node, markdown);
    const updatedVault = await loadVaultFromPath(activeVaultRootPath.value);
    replaceVaultWithoutNavigation(updatedVault);
    const targetScopeId = hasGraphScope(savedNodeId)
      ? savedNodeId
      : hasGraphScope(previousGraphScopeId)
        ? previousGraphScopeId
        : "root";
    currentView.value = "note";
    currentNoteId.value = savedNodeId;
    selectedNodeId.value = savedNodeId;
    currentDomain.value = findGraphNode(savedNodeId)?.domain || node.domain || previousCurrentDomain;
    graphScopeId.value = targetScopeId;
    noteDirty.value = false;
    noteMode.value = "read";
    console.debug("[save-note:restored]", {
      currentView: currentView.value,
      graphScopeId: graphScopeId.value,
      currentNoteId: currentNoteId.value,
      selectedNodeId: selectedNodeId.value,
    });
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

function requestAddLink() {
  if (!confirmDiscardDirty()) return;
  addLinkError.value = "";
  addLinkOpenKey.value += 1;
}

async function createLink(payload) {
  if (addLinkSaving.value) return;
  if (!activeVaultRootPath.value) {
    addLinkError.value = "Open a desktop vault folder before creating links.";
    return;
  }

  addLinkSaving.value = true;
  addLinkError.value = "";
  const previousView = currentView.value;
  const previousGraphScopeId = graphScopeId.value;
  const previousSelectedNodeId = selectedNodeId.value;
  const previousCurrentNoteId = currentNoteId.value;
  const previousCurrentDomain = currentDomain.value;

  try {
    const updatedVault = await createGraphLink(activeVaultRootPath.value, payload);
    replaceVaultWithoutNavigation(updatedVault);
    const sourceNode = findGraphNode(payload.sourceId);
    const targetScopeId = hasGraphScope(previousGraphScopeId)
      ? previousGraphScopeId
      : hasGraphScope(payload.sourceId)
        ? payload.sourceId
        : "root";
    currentView.value = previousView;
    graphScopeId.value = targetScopeId;
    selectedNodeId.value = findGraphNode(previousSelectedNodeId) ? previousSelectedNodeId : payload.sourceId;
    currentNoteId.value = findGraphNode(previousCurrentNoteId) ? previousCurrentNoteId : payload.sourceId;
    currentDomain.value = hasDomain(previousCurrentDomain)
      ? previousCurrentDomain
      : sourceNode?.domain || getFallbackDomain();
    addLinkCloseKey.value += 1;
  } catch (error) {
    console.error("[vault] Failed to create graph link.", error);
    addLinkError.value = String(error?.message || error);
  } finally {
    addLinkSaving.value = false;
  }
}

function closeRelationEdit() {
  if (relationSaving.value) return;
  relationEditEdgeId.value = "";
  relationError.value = "";
}

function requestEditRelation(edgeId) {
  if (!confirmDiscardDirty()) return;
  relationError.value = "";
  relationEditEdgeId.value = edgeId;
}

async function requestDeleteRelation(edgeId) {
  if (relationSaving.value) return;
  if (!confirmDiscardDirty()) return;
  const edge = useActiveVault().value.edges?.find((item) => item.id === edgeId);
  if (!edge) {
    window.alert(`Relation "${edgeId}" was not found.`);
    return;
  }
  if (edge.relation === "contains") {
    window.alert("Contains relations cannot be deleted from this menu.");
    return;
  }
  const sourceTitle = findGraphNode(edge.source)?.title || edge.source;
  const targetTitle = findGraphNode(edge.target)?.title || edge.target;
  const confirmed = window.confirm(
    `Delete relation?\n\n${sourceTitle} ${edge.relation} ${targetTitle}\n\nThis removes the edge from graph.yaml.`,
  );
  if (!confirmed) return;

  relationSaving.value = true;
  relationError.value = "";
  const previousNavigation = snapshotNavigation();
  try {
    const updatedVault = await removeGraphLink(activeVaultRootPath.value, edgeId);
    replaceVaultWithoutNavigation(updatedVault);
    restoreNavigation(previousNavigation, edge.source);
    if (relationEditEdgeId.value === edgeId) relationEditEdgeId.value = "";
  } catch (error) {
    console.error("[vault] Failed to delete graph link.", error);
    window.alert(`Failed to delete relation: ${error}`);
  } finally {
    relationSaving.value = false;
  }
}

async function saveEditedRelation(payload) {
  if (relationSaving.value) return;
  relationSaving.value = true;
  relationError.value = "";
  const previousNavigation = snapshotNavigation();
  try {
    const updatedVault = await replaceGraphLink(activeVaultRootPath.value, payload.oldEdgeId, payload);
    replaceVaultWithoutNavigation(updatedVault);
    restoreNavigation(previousNavigation, payload.sourceId);
    relationEditEdgeId.value = "";
  } catch (error) {
    console.error("[vault] Failed to edit graph link.", error);
    relationError.value = String(error?.message || error);
  } finally {
    relationSaving.value = false;
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed.value));
}

function toggleRelationSidebar() {
  relationSidebarCollapsed.value = !relationSidebarCollapsed.value;
  localStorage.setItem(RELATION_SIDEBAR_KEY, String(relationSidebarCollapsed.value));
}
</script>

<template>
  <div class="prototype-shell" :style="{ '--ui-font-scale': uiFontScale }">
    <NoVaultView
      v-if="vaultLoading || !hasRealVault"
      :error="vaultLoadError"
      :loading="vaultLoading"
      @open-vault="openVault"
    />
    <WorkspaceLayout
      v-else
      :active-dialog="activeDialog"
      :add-link-close-key="addLinkCloseKey"
      :add-link-error="addLinkError"
      :add-link-open-key="addLinkOpenKey"
      :add-link-saving="addLinkSaving"
      :app-title="activeVaultTitle"
      :can-save-layout="canSaveLayout"
      :can-save-note="canSaveNote"
      :current-domain="currentDomain"
      :current-note-id="currentNoteId"
      :current-relation-node-id="currentRelationNodeId"
      :current-view="currentView"
      :draft-layout-board="currentDraftLayoutBoard"
      :draft-moved-node-ids="currentDraftMovedNodeIds"
      :graph-scope-id="graphScopeId"
      :is-layout-editing="isLayoutEditing"
      :layout-dirty="layoutDirty"
      :layout-save-in-progress="layoutSaveInProgress"
      :note-mode="noteMode"
      :note-saving="noteSaving"
      :note-find-close-key="noteFindCloseKey"
      :note-find-open-key="noteFindOpenKey"
      :note-find-query="noteFindQuery"
      :relation-edit-edge-id="relationEditEdgeId"
      :relation-error="relationError"
      :current-relation-node-pinned="currentRelationNodePinned"
      :relation-sidebar-collapsed="relationSidebarCollapsed"
      :relation-saving="relationSaving"
      :selected-node-id="selectedNodeId"
      :sidebar-collapsed="sidebarCollapsed"
      :ui-font-scale="uiFontScale"
      @add-link="createLink"
      @cancel-layout="discardLayoutDraft"
      @close-dialog="activeDialog = ''"
      @close-relation-edit="closeRelationEdit"
      @create-note="createNote"
      @edit-layout="startLayoutEditing"
      @ensure-layout-draft="ensureLayoutDraft"
      @layout-node-dragged="updateDraftNodeLayout"
      @open-dialog="openDialog"
      @open-domain="openDomain"
      @open-note="openNote"
      @open-scope="openScope"
      @open-vault="openVault"
      @request-add-link="requestAddLink"
      @request-delete-relation="requestDeleteRelation"
      @request-edit-relation="requestEditRelation"
      @save-layout="saveLayout"
      @save-note="saveNote"
      @save-relation-edit="saveEditedRelation"
      @select-node="selectedNodeId = $event"
      @set-note-dirty="noteDirty = $event"
      @set-note-find-visible="noteFindVisible = $event"
      @set-note-mode="setNoteMode"
      @show-graph="showGraph"
      @show-view="showView"
      @toggle-sidebar="toggleSidebar"
      @toggle-pin-node="toggleCurrentPinnedNode"
      @toggle-relation-sidebar="toggleRelationSidebar"
    />

    <div v-if="hasRealVault" class="mobile-prototype">
      <MobileNoteView v-if="currentView !== 'graph'" :node="selectedNode" @show-graph="currentView = 'graph'" />
      <MobileLocalGraphView v-else :selected-node-id="selectedNodeId" @open-note="openNote" />
    </div>

    <SearchOverlay
      v-if="hasRealVault"
      v-model:mode="searchMode"
      v-model:query="searchQuery"
      :visible="searchOverlayVisible"
      :pinned-results="pinnedResults"
      :recent-results="recentResults"
      @close="closeSearchOverlay"
      @execute="executeSearchResult"
    />
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

.button-with-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.button-icon-only {
  display: inline-grid;
  place-items: center;
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
}

.button-icon-label {
  display: inline-block;
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
