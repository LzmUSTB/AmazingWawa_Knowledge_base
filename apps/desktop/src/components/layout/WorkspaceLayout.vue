<script setup>
import { computed, ref } from "vue";
import NewLinkDialog from "../dialogs/NewLinkDialog.vue";
import NewNoteDialog from "../dialogs/NewNoteDialog.vue";
import GraphToolbar from "../graph/GraphToolbar.vue";
import GraphView from "../graph/GraphView.vue";
import BreadcrumbBar from "../navigation/BreadcrumbBar.vue";
import NoteView from "../note/NoteView.vue";
import FileTree from "./FileTree.vue";
import TopMenu from "./TopMenu.vue";
import { getScopeLayoutMode } from "../../graph/graph-layout.js";
import { getGraphScope } from "../../graph/graph-scope.js";

const props = defineProps({
  activeDialog: {
    type: String,
    required: true,
  },
  appTitle: {
    type: String,
    default: "Knowledge Base",
  },
  currentDomain: {
    type: String,
    required: true,
  },
  currentNoteId: {
    type: String,
    required: true,
  },
  currentView: {
    type: String,
    required: true,
  },
  canSaveNote: {
    type: Boolean,
    default: false,
  },
  canSaveLayout: {
    type: Boolean,
    default: false,
  },
  graphScopeId: {
    type: String,
    required: true,
  },
  draftLayoutBoard: {
    type: Object,
    default: null,
  },
  draftMovedNodeIds: {
    type: Array,
    default: () => [],
  },
  isLayoutEditing: {
    type: Boolean,
    default: false,
  },
  layoutDirty: {
    type: Boolean,
    default: false,
  },
  layoutSaveInProgress: {
    type: Boolean,
    default: false,
  },
  noteMode: {
    type: String,
    required: true,
  },
  noteSaving: {
    type: Boolean,
    default: false,
  },
  selectedNodeId: {
    type: String,
    required: true,
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  uiFontScale: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits([
  "close-dialog",
  "open-dialog",
  "open-domain",
  "open-note",
  "open-vault",
  "open-scope",
  "create-note",
  "cancel-layout",
  "edit-layout",
  "ensure-layout-draft",
  "layout-node-dragged",
  "save-note",
  "save-layout",
  "select-node",
  "set-note-dirty",
  "set-note-mode",
  "show-graph",
  "show-view",
  "toggle-sidebar",
]);

const graphViewRef = ref(null);
const currentScope = computed(() => getGraphScope(props.graphScopeId));
const localDisabled = computed(() => !props.selectedNodeId);
const layoutMode = computed(() => getScopeLayoutMode(currentScope.value.id));

function openLocalGraph(nodeId) {
  emit("open-scope", nodeId, nodeId);
}

function openSelectedLocalGraph() {
  if (!props.selectedNodeId) return;
  emit("open-scope", props.selectedNodeId, props.selectedNodeId);
}

function fitGraphView() {
  graphViewRef.value?.fitCurrentScope();
}
</script>

<template>
  <div class="desktop-prototype app-frame" :class="{ 'is-sidebar-collapsed': sidebarCollapsed }">
    <TopMenu
      :app-title="appTitle"
      :ui-font-scale="uiFontScale"
      @open-dialog="$emit('open-dialog', $event)"
      @open-vault="$emit('open-vault')"
      @show-view="$emit('show-view', $event)"
    />
    <div class="app-body" :class="{ 'is-sidebar-collapsed': sidebarCollapsed }">
      <aside class="sidebar-region">
        <FileTree
          v-if="!sidebarCollapsed"
          :active-domain="currentDomain"
          :active-note-id="currentNoteId"
          @open-domain="$emit('open-domain', $event)"
          @open-note="$emit('open-note', $event)"
          @toggle-sidebar="$emit('toggle-sidebar')"
        />
        <button
          v-else
          class="sidebar-rail-button hud-button"
          style="--button-color: var(--graphics)"
          @click="$emit('toggle-sidebar')"
        >
          Vault
        </button>
      </aside>

      <main class="workspace">
        <BreadcrumbBar
          :current-domain="currentDomain"
          :current-note-id="currentNoteId"
          :current-view="currentView"
          @open-domain="$emit('open-domain', $event)"
          :graph-scope-id="graphScopeId"
          @show-graph="$emit('show-graph', $event)"
        />

        <template v-if="currentView === 'graph'">
          <GraphToolbar
            :edge-count="currentScope.edges.length"
            :can-save-layout="canSaveLayout"
            :layout-dirty="layoutDirty"
            :layout-editing="isLayoutEditing"
            :layout-mode="layoutMode"
            :layout-save-in-progress="layoutSaveInProgress"
            :local-disabled="localDisabled"
            :node-count="currentScope.nodes.length"
            @cancel-layout="$emit('cancel-layout')"
            @edit-layout="$emit('edit-layout')"
            @fit-view="fitGraphView"
            @open-dialog="$emit('open-dialog', $event)"
            @save-layout="$emit('save-layout')"
            @show-local="openSelectedLocalGraph"
            @show-graph="$emit('show-graph', $event)"
          />
          <GraphView
            ref="graphViewRef"
            :draft-board="draftLayoutBoard"
            :draft-moved-node-ids="draftMovedNodeIds"
            :is-layout-editing="isLayoutEditing"
            :selected-node-id="selectedNodeId"
            :scope-id="graphScopeId"
            @ensure-layout-draft="$emit('ensure-layout-draft', $event)"
            @layout-node-dragged="$emit('layout-node-dragged', $event)"
            @open-dialog="$emit('open-dialog', $event)"
            @open-note="$emit('open-note', $event)"
            @open-scope="$emit('open-scope', $event)"
            @select-node="$emit('select-node', $event)"
            @show-local="openLocalGraph"
          />
        </template>

        <NoteView
          v-else
          :can-save-note="canSaveNote"
          :mode="noteMode"
          :note-id="currentNoteId"
          :saving="noteSaving"
          @dirty-change="$emit('set-note-dirty', $event)"
          @save-note="$emit('save-note', $event)"
          @set-mode="$emit('set-note-mode', $event)"
          @show-graph="$emit('open-scope', currentNoteId, currentNoteId)"
        />
      </main>
    </div>

    <div v-if="activeDialog" class="dialog-overlay" @click.self="$emit('close-dialog')">
      <NewLinkDialog
        v-if="activeDialog === 'new-link'"
        :selected-node-id="selectedNodeId"
        @close="$emit('close-dialog')"
      />
      <NewNoteDialog
        v-else-if="activeDialog === 'new-note'"
        :current-domain="currentDomain"
        :current-view="currentView"
        :graph-scope-id="graphScopeId"
        :selected-node-id="selectedNodeId"
        @close="$emit('close-dialog')"
        @create-note="$emit('create-note', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.app-frame {
  --sidebar-width: 260px;
  display: grid;
  grid-template-rows: 44px 1fr;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.app-frame.is-sidebar-collapsed {
  --sidebar-width: 44px;
}

.app-body {
  display: grid;
  grid-template-columns: var(--sidebar-width, 260px) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-body.is-sidebar-collapsed {
  --sidebar-width: 44px;
}

.sidebar-region {
  grid-column: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--border-primary);
  background: var(--background-main);
}

.workspace {
  grid-column: 2;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.sidebar-rail-button {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  border-top: 0;
  border-bottom: 0;
  border-left: 0;
  writing-mode: vertical-rl;
}

.dialog-overlay {
  position: fixed;
  z-index: 20;
  inset: 44px 0 0 var(--sidebar-width, 260px);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.62);
}
</style>
