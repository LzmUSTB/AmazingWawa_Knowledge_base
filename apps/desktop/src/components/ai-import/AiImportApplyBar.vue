<script setup>
defineProps({
  applying: {
    type: Boolean,
    default: false,
  },
  canApply: {
    type: Boolean,
    default: false,
  },
  hasWarnings: {
    type: Boolean,
    default: false,
  },
  confirmedWarnings: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["apply", "update:confirmedWarnings"]);
</script>

<template>
  <section class="ai-panel apply-bar">
    <label v-if="hasWarnings" class="warning-confirm">
      <input
        type="checkbox"
        :checked="confirmedWarnings"
        @change="$emit('update:confirmedWarnings', $event.target.checked)"
      />
      <span>Confirm warnings</span>
    </label>
    <button class="hud-button" style="--button-color: var(--career)" :disabled="!canApply || applying" @click="$emit('apply')">
      {{ applying ? "Applying..." : "Apply Package" }}
    </button>
  </section>
</template>

<style scoped>
.apply-bar {
  gap: 10px;
}

.warning-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--career);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.warning-confirm input {
  width: 15px;
  height: 15px;
  accent-color: var(--career);
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
