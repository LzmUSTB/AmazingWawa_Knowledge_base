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
  graphScopeId: {
    type: String,
    required: true,
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
});

const emit = defineEmits([
  "close-dialog",
  "open-dialog",
  "open-domain",
  "open-note",
  "open-vault",
  "open-scope",
  "save-note",
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
      :sidebar-collapsed="sidebarCollapsed"
      @open-dialog="$emit('open-dialog', $event)"
      @open-vault="$emit('open-vault')"
      @show-view="$emit('show-view', $event)"
      @toggle-sidebar="$emit('toggle-sidebar')"
    />
    <div class="app-body">
      <FileTree
        v-show="!sidebarCollapsed"
        :active-domain="currentDomain"
        :active-note-id="currentNoteId"
        @open-domain="$emit('open-domain', $event)"
        @open-note="$emit('open-note', $event)"
      />
      <button
        v-if="sidebarCollapsed"
        class="sidebar-restore hud-button"
        style="--button-color: var(--graphics)"
        @click="$emit('toggle-sidebar')"
      >
        Vault
      </button>

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
            :layout-mode="layoutMode"
            :local-disabled="localDisabled"
            :node-count="currentScope.nodes.length"
            @fit-view="fitGraphView"
            @open-dialog="$emit('open-dialog', $event)"
            @show-local="openSelectedLocalGraph"
            @show-graph="$emit('show-graph', $event)"
          />
          <GraphView
            ref="graphViewRef"
            :selected-node-id="selectedNodeId"
            :scope-id="graphScopeId"
            @open-dialog="$emit('open-dialog', $event)"
            @open-note="$emit('open-note', $event)"
            @open-scope="$emit('open-scope', $event)"
            @select-node="$emit('select-node', $event)"
            @show-local="openLocalGraph"
          />
        </template>

        <NoteView
          v-else
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
        @close="$emit('close-dialog')"
      />
    </div>
  </div>
</template>

<style scoped>
.app-frame {
  display: grid;
  grid-template-rows: 44px 1fr;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.app-body {
  position: relative;
  display: grid;
  grid-template-columns: var(--sidebar-width, 260px) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-frame.is-sidebar-collapsed {
  --sidebar-width: 0px;
}

.workspace {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.sidebar-restore {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 4;
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
