<script setup>
defineProps({
  diff: {
    type: Object,
    default: null,
  },
});
</script>

<template>
  <section class="ai-panel graph-diff">
    <div class="section-label">Graph Diff</div>
    <div v-if="diff?.graphDiff?.length" class="diff-list">
      <div v-for="item in diff.graphDiff" :key="item.edge.id" class="diff-row">
        <strong>{{ item.action }}</strong>
        <span>{{ item.edge.from }} {{ item.edge.relation }} {{ item.edge.to }}</span>
        <small>{{ item.reason }}</small>
      </div>
    </div>
    <p v-else class="empty-line">No graph changes.</p>
  </section>
</template>

<style scoped>
.diff-list {
  display: grid;
  gap: 8px;
}

.diff-row {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 9px;
}

.diff-row strong,
.diff-row small,
.empty-line {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.diff-row span {
  color: var(--text-primary);
  font-size: var(--font-size-small);
  font-weight: 800;
}

.empty-line {
  margin: 0;
}
</style>
