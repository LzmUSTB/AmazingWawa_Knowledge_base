<script setup>
import { computed } from "vue";
import { hasContainsChildren, isDomainNode } from "../../graph/graph-scope.js";
import { getDomainColor } from "../../graph/graph-theme.js";

defineEmits(["open-dialog", "open-note", "show-local"]);

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const domainSelected = computed(() => isDomainNode(props.node.id));
const hasChildren = computed(() => hasContainsChildren(props.node.id));
</script>

<template>
  <div class="node-context node-context-menu" :style="{ '--node-color': getDomainColor(node.domain) }">
    <div class="node-context__accent"></div>
    <div>
      <div class="node-context__eyebrow">Selected Node</div>
      <h2>{{ node.title }}</h2>
      <p>domain: {{ node.domain }}</p>
      <p>{{ domainSelected ? "type" : "status" }}: {{ domainSelected ? node.type : node.status }}</p>
      <div class="node-context__actions">
        <button
          v-if="domainSelected"
          class="hud-button"
          style="--button-color: var(--node-color)"
          @click="$emit('show-local', node.id)"
        >
          Open Domain Graph
        </button>
        <button
          v-else-if="hasChildren"
          class="hud-button"
          style="--button-color: var(--node-color)"
          @click="$emit('show-local', node.id)"
        >
          Open Local Graph
        </button>
        <button
          v-else
          class="hud-button"
          style="--button-color: var(--simulation)"
          @click="$emit('open-note', node.id)"
        >
          Open Note
        </button>
        <button
          v-if="!domainSelected && hasChildren"
          class="hud-button"
          style="--button-color: var(--simulation)"
          @click="$emit('open-note', node.id)"
        >
          Open Note
        </button>
        <button
          v-else-if="!domainSelected"
          class="hud-button"
          style="--button-color: var(--simulation)"
          @click="$emit('show-local', node.id)"
        >
          Local Graph
        </button>
        <button class="hud-button" style="--button-color: var(--career)" @click="$emit('open-dialog', 'new-link')">
          Add Link
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-context {
  position: absolute;
  right: 22px;
  top: 22px;
  z-index: 3;
  display: grid;
  grid-template-columns: 5px 1fr;
  width: min(270px, calc(100% - 44px));
  border: 1px solid var(--border-primary);
  background: var(--background-panel);
}

.node-context__accent {
  background: var(--node-color);
}

.node-context > div:last-child {
  padding: 14px;
}

.node-context__eyebrow {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

h2 {
  margin: 6px 0 10px;
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.2;
}

p {
  margin: 0 0 5px;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  text-transform: uppercase;
}

.node-context__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
