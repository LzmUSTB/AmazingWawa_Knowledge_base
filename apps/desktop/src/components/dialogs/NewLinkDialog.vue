<script setup>
import { computed } from "vue";
import { getGraphNodes } from "../../graph/graph-data-store.js";
import { relationTheme } from "../../graph/graph-theme.js";

defineProps({
  selectedNodeId: {
    type: String,
    required: true,
  },
});

defineEmits(["close"]);

const relationTypes = ["contains", "depends-on", "used-in", "compares-with"];
const graphNodes = computed(() => getGraphNodes());
</script>

<template>
  <div class="dialog-card new-link">
    <div class="dialog-accent"></div>
    <header>
      <h2>New Graph Link</h2>
      <p>The confirmed relation appends one index-level edge to graph.yaml.</p>
    </header>

    <label>
      <span>Source Node</span>
      <select :value="selectedNodeId">
        <option v-for="node in graphNodes" :key="node.id" :value="node.id">
          {{ node.domain }} / {{ node.id }}
        </option>
      </select>
    </label>

    <label>
      <span>Target Node</span>
      <select value="gradient-descent">
        <option v-for="node in graphNodes" :key="node.id" :value="node.id">
          {{ node.domain }} / {{ node.id }}
        </option>
      </select>
    </label>

    <div class="relation-options">
      <button
        v-for="relation in relationTypes"
        :key="relation"
        class="relation-button"
        :class="`relation-button--${relation}`"
        :style="{ '--relation-color': relationTheme[relation].color }"
      >
        <svg viewBox="0 0 128 24" aria-hidden="true">
          <path
            v-if="relation !== 'compares-with'"
            d="M 8 12 H 120"
            :stroke-dasharray="relationTheme[relation].dash"
          />
          <path v-else d="M 8 9 H 120 M 8 15 H 120" stroke-dasharray="3 5" />
          <path v-if="relation === 'depends-on'" d="M 112 5 L 121 12 L 112 19" />
        </svg>
        <span>{{ relationTheme[relation].label }}</span>
      </button>
    </div>

    <div class="graph-yaml-note">
      <span>graph.yaml</span>
      <code>source + target + relation must be unique</code>
    </div>

    <footer>
      <button class="hud-button" @click="$emit('close')">Cancel</button>
      <button class="hud-button" style="--button-color: var(--career)" @click="$emit('close')">
        Create Link
      </button>
    </footer>
  </div>
</template>

<style scoped>
.new-link {
  width: 560px;
}

.relation-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.relation-button {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 12px;
  align-items: center;
  min-height: 52px;
  border: 1px solid var(--relation-color);
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;
}

.relation-button:hover {
  border-color: var(--border-primary);
  background: var(--background-panel);
}

.relation-button svg {
  width: 128px;
  height: 24px;
}

.relation-button path {
  fill: none;
  stroke: var(--relation-color);
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 2;
}

.relation-button span {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.graph-yaml-note {
  display: grid;
  gap: 6px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--career);
  background: var(--background-main);
  padding: 12px;
}

.graph-yaml-note span {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.graph-yaml-note code {
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
}
</style>
