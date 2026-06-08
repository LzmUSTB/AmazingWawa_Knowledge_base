<script setup>
import { computed } from "vue";
import { getActiveVault } from "../../graph/graph-data-store.js";
import { getDomainColor } from "../../graph/graph-theme.js";

defineEmits(["show-graph"]);

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const noteBlocks = computed(() => {
  const markdown = getActiveVault().notes[props.node.id]?.markdown || "";
  if (!markdown) return [{ label: "Summary", body: props.node.summary }];
  return markdown
    .split(/\n(?=##\s+)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((block, index) => {
      const lines = block.split("\n");
      return {
        label: index === 0 && lines[0].startsWith("# ") ? "Note" : lines[0].replace(/^#+\s*/, ""),
        body: lines.slice(1).join("\n").trim(),
      };
    });
});
</script>

<template>
  <main class="mobile-screen" :style="{ '--mobile-color': getDomainColor(node.domain) }">
    <header class="mobile-top">
      <strong>Knowledge Viewer</strong>
    </header>
    <nav class="mobile-crumb">
      <span></span>
      {{ node.domain }} / {{ node.title }}
    </nav>
    <article class="mobile-note technical-grid">
      <h1>{{ node.title }}</h1>
      <div class="mobile-chips">
        <span>{{ node.domain }}</span>
        <span>{{ node.type }}</span>
        <span>{{ node.status }}</span>
      </div>
      <section v-for="section in noteBlocks" :key="section.label">
        <div class="panel-label" :style="{ '--label-color': getDomainColor(node.domain) }">
          {{ section.label }}
        </div>
        <p>{{ section.body }}</p>
      </section>
      <button class="hud-button graph-jump" style="--button-color: var(--mobile-color)" @click="$emit('show-graph')">
        Local Graph
      </button>
    </article>
  </main>
</template>

<style scoped>
.mobile-screen {
  min-height: 100vh;
  border-inline: 1px solid var(--border-primary);
  background: var(--background-main);
}

.mobile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
  text-transform: uppercase;
}

.mobile-top strong {
  font-size: 12px;
}

.mobile-crumb {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-muted);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.mobile-crumb span {
  width: 8px;
  height: 8px;
  background: var(--mobile-color);
}

.mobile-note {
  display: grid;
  gap: 20px;
  padding: 28px 18px 40px;
}

h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 30px;
  line-height: 1.08;
}

.mobile-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mobile-chips span {
  padding: 5px 9px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--mobile-color);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

section {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 16px;
}

p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.7;
}

.graph-jump {
  justify-self: start;
}
</style>
