<script setup>
defineProps({
  errors: {
    type: Array,
    default: () => [],
  },
  warnings: {
    type: Array,
    default: () => [],
  },
  reviewItems: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <section class="ai-panel conflict-panel">
    <div class="section-label">Review</div>
    <div v-if="errors.length" class="message-block is-error">
      <strong>Errors</strong>
      <ul>
        <li v-for="item in errors" :key="item">{{ item }}</li>
      </ul>
    </div>
    <div v-if="warnings.length" class="message-block is-warning">
      <strong>Warnings</strong>
      <ul>
        <li v-for="item in warnings" :key="item">{{ item }}</li>
      </ul>
    </div>
    <div v-if="reviewItems.length" class="message-block">
      <strong>Review Items</strong>
      <ul>
        <li v-for="item in reviewItems" :key="`${item.type}-${item.title}`">{{ item.title }}: {{ item.message }}</li>
      </ul>
    </div>
    <p v-if="!errors.length && !warnings.length && !reviewItems.length" class="empty-line">No issues found.</p>
  </section>
</template>

<style scoped>
.conflict-panel {
  align-content: start;
}

.message-block {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.45;
  padding: 10px;
}

.message-block strong {
  color: var(--text-primary);
  text-transform: uppercase;
}

.message-block ul {
  margin: 0;
  padding-left: 18px;
}

.is-error {
  border-color: var(--game-dev);
}

.is-error strong {
  color: var(--game-dev);
}

.is-warning {
  border-color: var(--career);
}

.is-warning strong {
  color: var(--career);
}

.empty-line {
  margin: 0;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}
</style>
