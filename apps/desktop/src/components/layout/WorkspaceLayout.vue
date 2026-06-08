<script setup>
import { ref } from "vue";
import NewLinkDialog from "../dialogs/NewLinkDialog.vue";
import NewNoteDialog from "../dialogs/NewNoteDialog.vue";
import GraphToolbar from "../graph/GraphToolbar.vue";
import GraphView from "../graph/GraphView.vue";
import BreadcrumbBar from "../navigation/BreadcrumbBar.vue";
import NoteView from "../note/NoteView.vue";
import FileTree from "./FileTree.vue";
import TopMenu from "./TopMenu.vue";

defineProps({
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
  selectedNodeId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  "close-dialog",
  "open-dialog",
  "open-domain",
  "open-note",
  "open-scope",
  "select-node",
  "set-note-mode",
  "show-graph",
  "show-view",
]);

const graphViewRef = ref(null);

function openLocalGraph(nodeId) {
  emit("open-scope", nodeId, nodeId);
}

function fitGraphView() {
  graphViewRef.value?.fitCurrentScope();
}
</script>

<template>
  <div class="desktop-prototype app-frame">
    <TopMenu @open-dialog="$emit('open-dialog', $event)" @show-view="$emit('show-view', $event)" />
    <div class="app-body">
      <FileTree
        :active-domain="currentDomain"
        :active-note-id="currentNoteId"
        @open-domain="$emit('open-domain', $event)"
        @open-note="$emit('open-note', $event)"
      />

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
            @fit-view="fitGraphView"
            @open-dialog="$emit('open-dialog', $event)"
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
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.app-body {
  display: grid;
  grid-template-columns: 260px minmax(720px, 1fr);
  min-height: 0;
}

.workspace {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.dialog-overlay {
  position: fixed;
  z-index: 20;
  inset: 44px 0 0 260px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.62);
}
</style>
