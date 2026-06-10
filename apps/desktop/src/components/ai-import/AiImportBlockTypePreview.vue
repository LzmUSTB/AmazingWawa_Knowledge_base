<script setup>
import { computed } from "vue";
import GenericVisualBlock from "../note/blocks/GenericVisualBlock.vue";

const props = defineProps({
  blockType: {
    type: Object,
    default: null,
  },
  blockRegistry: {
    type: Object,
    default: () => ({}),
  },
});

const block = computed(() => {
  if (!props.blockType) return null;
  const definition = props.blockRegistry.declarative?.[props.blockType.type] || {};
  return {
    type: props.blockType.type,
    sourceType: props.blockType.type,
    blockKind: "declarative-visual",
    definition,
    data: definition.example || props.blockType.example || {},
    raw: "",
  };
});
</script>

<template>
  <section class="ai-block-preview">
    <div class="section-label">Block Type Preview</div>
    <GenericVisualBlock v-if="block" :block="block" />
    <p v-else class="empty-line">No block type in this package.</p>
  </section>
</template>

<style scoped>
.ai-block-preview {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 14px;
}

.empty-line {
  margin: 0;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}
</style>
