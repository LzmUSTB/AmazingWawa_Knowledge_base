<script setup>
import { computed } from "vue";
import NoteEditor from "./NoteEditor.vue";
import NoteToolbar from "./NoteToolbar.vue";
import { graphNodes, noteSections } from "../../graph/mock-graph-data.js";
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
});

defineEmits(["set-mode", "show-graph"]);

const node = computed(() => graphNodes.find((item) => item.id === props.noteId) || graphNodes[0]);
const accent = computed(() => getDomainColor(node.value.domain));
</script>

<template>
  <section class="note-view">
    <NoteToolbar
      :mode="mode"
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

        <NoteEditor v-if="mode === 'edit'" />

        <div v-else class="read-surface">
          <section v-for="section in noteSections" :key="section.label" class="note-block">
            <div class="panel-label" :style="{ '--label-color': accent }">{{ section.label }}</div>
            <p>{{ section.body }}</p>
          </section>
          <section class="note-block code-block">
            <div class="panel-label" :style="{ '--label-color': accent }">Vault structure</div>
            <pre>vault/content/graphics/rendering-pipeline/
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
  min-height: 0;
  flex-direction: column;
}

.note-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.note-shell {
  max-width: 920px;
  min-height: calc(100% - 64px);
  margin: 32px auto;
  border: 1px solid var(--border-primary);
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
  padding: 32px;
}

.note-block {
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
  margin: 14px 0 0;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}
</style>
