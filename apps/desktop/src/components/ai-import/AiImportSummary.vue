<script setup>
defineProps({
  validation: {
    type: Object,
    default: null,
  },
});
</script>

<template>
  <section class="ai-panel">
    <div class="section-label">Summary</div>
    <template v-if="validation">
      <div class="summary-grid">
        <span>Package</span>
        <strong>{{ validation.previewModel.packageId }}</strong>
        <span>Status</span>
        <strong>{{ validation.previewModel.status || "unknown" }}</strong>
        <span>Validation</span>
        <strong :class="validation.valid ? 'is-valid' : 'is-invalid'">{{ validation.valid ? "valid" : "invalid" }}</strong>
        <span>Operations</span>
        <strong>{{ validation.previewModel.operationCount }}</strong>
      </div>
    </template>
    <p v-else class="empty-line">Select a package to inspect it.</p>
  </section>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 8px 10px;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.summary-grid strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-grid span,
.empty-line {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
}

.is-valid {
  color: var(--language) !important;
}

.is-invalid {
  color: var(--game-dev) !important;
}

.empty-line {
  margin: 0;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}
</style>
