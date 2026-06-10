<script setup>
import { computed, ref } from "vue";
import AiImportView from "../ai-import/AiImportView.vue";
import NewNoteDialog from "../dialogs/NewNoteDialog.vue";
import GraphToolbar from "../graph/GraphToolbar.vue";
import GraphView from "../graph/GraphView.vue";
import BreadcrumbBar from "../navigation/BreadcrumbBar.vue";
import NoteView from "../note/NoteView.vue";
import EditRelationDialog from "../relation/EditRelationDialog.vue";
import RelationSidebar from "../relation/RelationSidebar.vue";
import FileTree from "./FileTree.vue";
import TopMenu from "./TopMenu.vue";
import { getScopeLayoutMode } from "../../graph/graph-layout.js";
import { getGraphScope } from "../../graph/graph-scope.js";

const props = defineProps({
  activeDialog: {
    type: String,
    required: true,
  },
  addLinkCloseKey: {
    type: Number,
    default: 0,
  },
  addLinkError: {
    type: String,
    default: "",
  },
  addLinkOpenKey: {
    type: Number,
    default: 0,
  },
  addLinkSaving: {
    type: Boolean,
    default: false,
  },
  appTitle: {
    type: String,
    default: "Knowledge Base",
  },
  activeVaultRootPath: {
    type: String,
    required: true,
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
  currentRelationNodeId: {
    type: String,
    default: "",
  },
  currentRelationNodePinned: {
    type: Boolean,
    default: false,
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
  selectedNodeId: {
    type: String,
    required: true,
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  relationSidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  relationEditEdgeId: {
    type: String,
    default: "",
  },
  relationError: {
    type: String,
    default: "",
  },
  relationSaving: {
    type: Boolean,
    default: false,
  },
  uiFontScale: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits([
  "add-link",
  "ai-import-applied",
  "close-dialog",
  "close-relation-edit",
  "export-context",
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
  "request-add-link",
  "request-delete-relation",
  "request-edit-relation",
  "save-note",
  "save-layout",
  "save-relation-edit",
  "select-node",
  "set-note-find-visible",
  "set-note-dirty",
  "set-note-mode",
  "show-graph",
  "show-view",
  "toggle-sidebar",
  "toggle-pin-node",
  "toggle-relation-sidebar",
]);

const graphViewRef = ref(null);
const currentScope = computed(() => getGraphScope(props.graphScopeId));
const layoutMode = computed(() => getScopeLayoutMode(currentScope.value.id));

function relayOpenScope(scopeId, selectedId = scopeId) {
  emit("open-scope", scopeId, selectedId);
}

function fitGraphView() {
  graphViewRef.value?.fitCurrentScope();
}
</script>

<template>
  <div
    class="desktop-prototype app-frame"
    :class="{
      'is-sidebar-collapsed': sidebarCollapsed,
      'is-relation-sidebar-collapsed': relationSidebarCollapsed,
    }"
  >
    <TopMenu
      :app-title="appTitle"
      :can-export-context="Boolean(activeVaultRootPath)"
      :ui-font-scale="uiFontScale"
      @export-context="$emit('export-context')"
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
            :node-count="currentScope.nodes.length"
            @cancel-layout="$emit('cancel-layout')"
            @edit-layout="$emit('edit-layout')"
            @fit-view="fitGraphView"
            @open-dialog="$emit('open-dialog', $event)"
            @save-layout="$emit('save-layout')"
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
            @open-note="$emit('open-note', $event)"
            @open-scope="$emit('open-scope', $event)"
            @select-node="$emit('select-node', $event)"
          />
        </template>

        <AiImportView
          v-else-if="currentView === 'ai-import'"
          :vault-root-path="activeVaultRootPath"
          @applied="$emit('ai-import-applied', $event)"
        />

        <NoteView
          v-else
          :can-save-note="canSaveNote"
          :mode="noteMode"
          :note-find-close-key="noteFindCloseKey"
          :note-find-open-key="noteFindOpenKey"
          :note-find-query="noteFindQuery"
          :note-id="currentNoteId"
          :saving="noteSaving"
          @dirty-change="$emit('set-note-dirty', $event)"
          @find-visible-change="$emit('set-note-find-visible', $event)"
          @save-note="$emit('save-note', $event)"
          @set-mode="$emit('set-note-mode', $event)"
          @show-graph="$emit('open-scope', currentNoteId, currentNoteId)"
        />
      </main>

      <RelationSidebar
        :add-link-close-key="addLinkCloseKey"
        :add-link-error="addLinkError"
        :add-link-open-key="addLinkOpenKey"
        :add-link-saving="addLinkSaving"
        :collapsed="relationSidebarCollapsed"
        :current-note-id="currentNoteId"
        :current-node-pinned="currentRelationNodePinned"
        :current-view="currentView"
        :graph-scope-id="graphScopeId"
        :node-id="currentRelationNodeId"
        @add-link="$emit('add-link', $event)"
        @open-domain="$emit('open-domain', $event)"
        @open-note="$emit('open-note', $event)"
        @open-scope="relayOpenScope"
        @request-add-link="$emit('request-add-link')"
        @request-delete-relation="$emit('request-delete-relation', $event)"
        @request-edit-relation="$emit('request-edit-relation', $event)"
        @toggle-collapse="$emit('toggle-relation-sidebar')"
        @toggle-pin-node="$emit('toggle-pin-node')"
      />
    </div>

    <div v-if="activeDialog || relationEditEdgeId" class="dialog-overlay" @click.self="relationEditEdgeId ? $emit('close-relation-edit') : $emit('close-dialog')">
      <NewNoteDialog
        v-if="activeDialog === 'new-note'"
        :current-domain="currentDomain"
        :current-view="currentView"
        :graph-scope-id="graphScopeId"
        :selected-node-id="selectedNodeId"
        @close="$emit('close-dialog')"
        @create-note="$emit('create-note', $event)"
      />
      <EditRelationDialog
        v-else-if="relationEditEdgeId"
        :edge-id="relationEditEdgeId"
        :error="relationError"
        :saving="relationSaving"
        @close="$emit('close-relation-edit')"
        @save="$emit('save-relation-edit', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.app-frame {
  --sidebar-width: 260px;
  --relation-sidebar-width: 320px;
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

.app-frame.is-relation-sidebar-collapsed {
  --relation-sidebar-width: 44px;
}

.app-body {
  display: grid;
  grid-template-columns: var(--sidebar-width, 260px) minmax(0, 1fr) var(--relation-sidebar-width, 320px);
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
