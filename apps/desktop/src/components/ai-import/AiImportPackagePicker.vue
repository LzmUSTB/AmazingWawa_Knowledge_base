<script setup>
defineProps({
  packages: {
    type: Array,
    default: () => [],
  },
  selectedPackageId: {
    type: String,
    default: "",
  },
});

defineEmits(["select"]);
</script>

<template>
  <section class="ai-panel package-picker">
    <div class="section-label">Packages</div>
    <button
      v-for="item in packages"
      :key="item.package_id || item.packageId"
      class="package-row"
      :class="{ 'is-selected': selectedPackageId === (item.package_id || item.packageId) }"
      type="button"
      @click="$emit('select', item.package_id || item.packageId)"
    >
      <strong>{{ item.package_id || item.packageId }}</strong>
      <small>{{ item.relative_path || item.relativePath }}</small>
    </button>
    <p v-if="!packages.length" class="empty-line">No packages selected.</p>
  </section>
</template>

<style scoped>
.package-picker {
  align-content: start;
}

.package-row {
  display: grid;
  gap: 4px;
  min-width: 0;
  border: 1px solid var(--border-muted);
  border-left: 4px solid transparent;
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 9px;
  text-align: left;
}

.package-row:hover,
.package-row.is-selected {
  border-color: var(--border-primary);
  border-left-color: var(--career);
  color: var(--text-primary);
}

.package-row strong,
.package-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.package-row strong {
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.package-row small,
.empty-line {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.empty-line {
  margin: 0;
}
</style>
