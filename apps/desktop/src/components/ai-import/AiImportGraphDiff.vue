<script setup>
import { relationTheme } from "../../graph/graph-theme.js";

defineProps({
  diff: {
    type: Object,
    default: null,
  },
});

function relationStyle(edge) {
  return { "--relation-row-color": relationTheme[edge.relation]?.color || "var(--graphics)" };
}

function relationLabel(edge) {
  return relationTheme[edge.relation]?.label || edge.relation.toUpperCase();
}

function relationMiddleClass(edge) {
  return {
    "relation-middle--depends-on": edge.relation === "depends-on",
    "relation-middle--used-in": edge.relation === "used-in",
    "relation-middle--compares-with": edge.relation === "compares-with",
  };
}
</script>

<template>
  <section class="ai-panel graph-diff">
    <div class="section-label">Graph Diff</div>
    <div v-if="diff?.graphDiff?.length" class="diff-list">
      <article v-for="item in diff.graphDiff" :key="item.edge.id" class="relation-preview" :style="relationStyle(item.edge)">
        <div class="relation-action">{{ item.action }}</div>
        <div class="relation-row relation-row--direct">
          <span class="relation-endpoint">
            <strong>{{ item.edge.from }}</strong>
            <small>source</small>
          </span>
          <span class="relation-middle" :class="relationMiddleClass(item.edge)">
            <strong>{{ relationLabel(item.edge) }}</strong>
            <span class="relation-trace" aria-hidden="true">
              <span class="relation-arrow relation-arrow--left"></span>
              <span class="relation-arrow relation-arrow--right"></span>
            </span>
          </span>
          <span class="relation-endpoint">
            <strong>{{ item.edge.to }}</strong>
            <small>target</small>
          </span>
        </div>
        <p>{{ item.reason }}</p>
      </article>
    </div>
    <p v-else class="empty-line">No graph changes.</p>
  </section>
</template>

<style scoped>
.diff-list {
  display: grid;
  gap: 8px;
}

.relation-preview {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 9px;
}

.relation-action,
.relation-preview p,
.empty-line {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.relation-preview p {
  margin: 0;
  line-height: 1.45;
}

.relation-row--direct {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: stretch;
}

.relation-endpoint,
.relation-middle {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 5px;
  min-height: 48px;
}

.relation-endpoint strong,
.relation-middle strong {
  overflow: hidden;
  font-size: var(--font-size-small);
  font-weight: 900;
  line-height: 1.2;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.relation-endpoint strong {
  color: var(--text-primary);
}

.relation-middle {
  color: var(--relation-row-color, var(--text-primary));
  text-align: center;
}

.relation-middle strong {
  color: var(--relation-row-color, var(--text-primary));
}

.relation-endpoint small {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 700;
  text-transform: uppercase;
}

.relation-trace {
  display: block;
  width: 100%;
  height: 12px;
  position: relative;
}

.relation-trace::before {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  transform: translateY(-50%);
}

.relation-middle--depends-on .relation-trace::before {
  border-top-style: dashed;
}

.relation-middle--used-in .relation-trace::before {
  border-top-style: solid;
}

.relation-middle--compares-with .relation-trace::before {
  left: 12px;
  right: 12px;
  border-top-style: double;
  border-top-width: 4px;
}

.relation-arrow {
  display: none;
  position: absolute;
  top: 50%;
  width: 7px;
  height: 7px;
  border-top: 2px solid var(--relation-row-color, var(--border-primary));
  border-right: 2px solid var(--relation-row-color, var(--border-primary));
}

.relation-arrow--right {
  right: 2px;
  transform: translateY(-50%) rotate(45deg);
}

.relation-arrow--left {
  left: 2px;
  transform: translateY(-50%) rotate(-135deg);
}

.relation-middle--used-in .relation-arrow--right,
.relation-middle--compares-with .relation-arrow--left,
.relation-middle--compares-with .relation-arrow--right {
  display: block;
}

.empty-line {
  margin: 0;
}
</style>
