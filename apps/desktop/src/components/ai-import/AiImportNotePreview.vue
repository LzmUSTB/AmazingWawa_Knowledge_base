<script setup>
import NoteBlockRenderer from "../note/NoteBlockRenderer.vue";

defineProps({
  preview: {
    type: Object,
    default: null,
  },
  blockRegistry: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<template>
  <section class="ai-preview-panel">
    <header class="preview-head">
      <div>
        <div class="section-label">Note Preview</div>
        <h2>{{ preview?.title || "No note selected" }}</h2>
      </div>
      <span v-if="preview" class="preview-mode">{{ preview.mode }}</span>
    </header>
    <div v-if="preview" class="note-preview-surface">
      <NoteBlockRenderer :markdown="preview.markdown" :block-registry="blockRegistry" />
    </div>
    <p v-else class="empty-line">No generated note preview.</p>
  </section>
</template>

<style scoped>
.ai-preview-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
}

.preview-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 12px 14px;
}

.preview-head h2 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
}

.preview-mode {
  border: 1px solid var(--border-muted);
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 5px 8px;
  text-transform: uppercase;
}

.note-preview-surface {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.empty-line {
  margin: 0;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 18px;
  text-transform: uppercase;
}
</style>
