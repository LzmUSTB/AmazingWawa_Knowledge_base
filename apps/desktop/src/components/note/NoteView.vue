<script setup>
import { computed, ref, watch } from "vue";
import NoteEditor from "./NoteEditor.vue";
import NoteToolbar from "./NoteToolbar.vue";
import { findGraphNode, getActiveVault, getGraphNodes } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

const props = defineProps({
  noteId: {
    type: String,
    required: true,
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
const noteBlocks = computed(() => {
  if (!noteMarkdown.value) {
    return [
      {
        label: "Summary",
        body: node.value.summary || "No note.md was found for this node.",
      },
    ];
  }

  return noteMarkdown.value
    .split(/\n(?=##\s+)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split("\n");
      const heading = lines[0].replace(/^#+\s*/, "");
      return {
        label: index === 0 && lines[0].startsWith("# ") ? "Note" : heading,
        body: index === 0 && lines[0].startsWith("# ") ? lines.slice(1).join("\n").trim() : lines.slice(1).join("\n").trim(),
      };
    })
    .filter((block) => block.body || block.label);
});

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
  emit("save-note", {
    node: node.value,
    markdown: draftMarkdown.value,
  });
}
</script>

<template>
  <section class="note-view">
    <NoteToolbar
      :dirty="dirty"
      :mode="mode"
      :saving="saving"
      @cancel-edit="cancelEdit"
      @edit="startEdit"
      @save="saveNote"
      @set-mode="$emit('set-mode', $event)"
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
          <section v-for="section in noteBlocks" :key="section.label" class="note-block">
            <div class="panel-label" :style="{ '--label-color': accent }">{{ section.label }}</div>
            <pre class="markdown-preview">{{ section.body }}</pre>
          </section>
          <section class="note-block code-block">
            <div class="panel-label" :style="{ '--label-color': accent }">Vault structure</div>
            <pre>vault/content/{{ node.domain }}/{{ node.id }}/
  meta.yaml
  note.md
  assets/</pre>
          </section>
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
  font-size: 36px;
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
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.read-surface {
  display: grid;
  gap: 24px;
  width: 100%;
  min-width: 0;
  padding: clamp(16px, 3vw, 32px);
}

.note-block {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 20px;
}

.note-block p {
  margin: 14px 0 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.75;
}

pre {
  overflow: auto;
  max-width: 100%;
  margin: 14px 0 0;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
