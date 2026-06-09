<script setup>
import { computed, ref, watch } from "vue";
import NoteBlockRenderer from "./NoteBlockRenderer.vue";
import NoteEditor from "./NoteEditor.vue";
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
});

const emit = defineEmits(["dirty-change", "save-note", "set-mode", "show-graph"]);

const node = computed(() => findGraphNode(props.noteId) || getGraphNodes()[0]);
const accent = computed(() => getDomainColor(node.value.domain));
const noteMarkdown = computed(() => getActiveVault().notes[props.noteId]?.markdown || "");
const draftMarkdown = ref(noteMarkdown.value);
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
  },
);

watch(dirty, (nextDirty) => emit("dirty-change", nextDirty), { immediate: true });

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

        <div v-else class="read-surface">
          <NoteBlockRenderer :markdown="readMarkdown" />
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
</style>
