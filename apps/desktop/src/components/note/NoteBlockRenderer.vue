<script setup>
import { computed, ref } from "vue";
import { parseMarkdownTokens, parseNoteBlocks } from "../../content/note-block-parser.js";
import ExpressionVisualizerBlock from "./blocks/ExpressionVisualizerBlock.vue";

const props = defineProps({
  markdown: {
    type: String,
    default: "",
  },
});

const revealedQuiz = ref({});
const activeFlowNode = ref({});
const blocks = computed(() => parseNoteBlocks(props.markdown));

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownTokens(markdown) {
  return parseMarkdownTokens(markdown);
}

function entries(value = {}) {
  return Object.entries(value || {});
}

function normalizeFlowNodes(data) {
  const nodeEntries = entries(data.nodes);
  if (nodeEntries.length) {
    return nodeEntries.map(([id, node]) => ({
      id,
      label: node.label || id,
      description: node.description || "",
    }));
  }
  const steps = Array.isArray(data.steps) ? data.steps : [];
  return steps.map((step, index) => ({
    id: `step-${index + 1}`,
    label: typeof step === "string" ? step : step.label || `Step ${index + 1}`,
    description: typeof step === "string" ? "" : step.description || "",
  }));
}

function normalizeParallelGroups(data) {
  const raw = data.parallel;
  if (!raw) return [];
  const groups = Array.isArray(raw) ? raw : [raw];
  return groups
    .map((group) => {
      if (Array.isArray(group)) return group;
      return String(group)
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    })
    .filter((group) => group.length);
}

function flowRows(data) {
  const nodes = normalizeFlowNodes(data);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const used = new Set();
  const rows = normalizeParallelGroups(data).map((group) => {
    const row = group
      .map((id) => nodesById.get(id) || { id, label: id, description: "" })
      .filter(Boolean);
    row.forEach((node) => used.add(node.id));
    return row;
  });
  nodes.filter((node) => !used.has(node.id)).forEach((node) => rows.push([node]));
  return rows;
}

function normalizeFlowEdges(data) {
  if (Array.isArray(data.edges)) return data.edges;
  if (typeof data.edges === "string") return [data.edges];
  return entries(data.edges).map(([source, target]) => `${source} -> ${target}`);
}

function toggleFlowNode(blockIndex, nodeId) {
  activeFlowNode.value = {
    ...activeFlowNode.value,
    [blockIndex]: activeFlowNode.value[blockIndex] === nodeId ? "" : nodeId,
  };
}

function flowNodeStyle(nodeIndex, rowLength) {
  return {
    "--flow-node-offset": rowLength > 1 ? `${nodeIndex * 10}px` : "0px",
  };
}

function normalizeConceptItems(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function conceptList(data) {
  return normalizeConceptItems(data.points || data.items || data.key_points);
}

function codeExplanation(data) {
  return data.explain || data.explanation || data.notes || "";
}

function quizChoices(data) {
  return normalizeConceptItems(data.choices || data.options);
}

function conceptTitle(data, fallback) {
  return data.title || data.name || fallback;
}

function processTitle(data) {
  return conceptTitle(data, "Process");
}

function flowNodeAriaLabel(node) {
  return node.description ? `${node.label}: ${node.description}` : node.label;
}

function isActiveFlowNode(blockIndex, nodeId) {
  return activeFlowNode.value[blockIndex] === nodeId;
}

function normalizeTableCell(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "");
}

function rowCells(row) {
  return Array.isArray(row) ? row.map(normalizeTableCell) : String(row).split(",").map((item) => item.trim());
}

function conceptCardTitle(block) {
  return conceptTitle(block.data, block.sourceType);
}

function codeLanguage(data) {
  return data.language || data.lang || "text";
}

function blockSummary(data) {
  return data.summary || data.definition || data.description || "";
}

function blockWhy(data) {
  return data.why || data.problem || data.use_case || "";
}

function normalizeEdgeLabel(edge) {
  if (Array.isArray(edge)) return edge.join(" -> ");
  return String(edge);
}

function nodeRows(data) {
  return flowRows(data).filter((row) => row.length);
}

function fallbackNode(id) {
  return {
    id,
    label: id,
    description: "",
  };
}

function compareColumns(data) {
  return Array.isArray(data.columns) ? data.columns : String(data.columns || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function compareRows(data) {
  return entries(data.rows).map(([label, row]) => ({
    label,
    cells: rowCells(row),
  }));
}
</script>

<template>
  <div class="note-renderer">
    <template v-for="(block, blockIndex) in blocks" :key="`${block.type}-${blockIndex}`">
      <section v-if="block.type === 'markdown'" class="markdown-document">
        <template v-for="(token, tokenIndex) in markdownTokens(block.markdown)" :key="tokenIndex">
          <component
            :is="`h${Math.min(token.level || 2, 4)}`"
            v-if="token.type === 'heading'"
            class="doc-heading"
            v-html="inlineMarkdown(token.text)"
          />
          <p v-else-if="token.type === 'paragraph'" class="doc-paragraph" v-html="inlineMarkdown(token.text)" />
          <pre v-else-if="token.type === 'code'" class="doc-code"><code>{{ token.text }}</code></pre>
          <ol v-else-if="token.type === 'list' && token.ordered" class="doc-list">
            <li v-for="(item, itemIndex) in token.items" :key="itemIndex" v-html="inlineMarkdown(item)" />
          </ol>
          <ul v-else-if="token.type === 'list'" class="doc-list">
            <li v-for="(item, itemIndex) in token.items" :key="itemIndex" v-html="inlineMarkdown(item)" />
          </ul>
        </template>
      </section>

      <section v-else-if="block.type === 'concept-card'" class="content-block concept-card">
        <div class="block-kicker">Concept Card</div>
        <h3>{{ conceptCardTitle(block) }}</h3>
        <p>{{ blockSummary(block.data) }}</p>
        <ul v-if="conceptList(block.data).length" class="block-list">
          <li v-for="item in conceptList(block.data)" :key="item">{{ item }}</li>
        </ul>
        <div v-if="blockWhy(block.data)" class="why-line">
          <span>Why</span>
          <p>{{ blockWhy(block.data) }}</p>
        </div>
      </section>

      <section v-else-if="block.type === 'process-flow'" class="content-block process-flow">
        <div class="block-kicker">Process Flow</div>
        <h3>{{ processTitle(block.data) }}</h3>
        <div class="flowchart">
          <div
            v-for="(row, rowIndex) in nodeRows(block.data)"
            :key="row.map((flowNode) => flowNode.id).join('-')"
            class="flow-row"
            :class="{ 'flow-row--parallel': row.length > 1 }"
          >
            <button
              v-for="(flowNode, nodeIndex) in row"
              :key="flowNode.id"
              class="flow-node"
              :class="{ 'is-active': isActiveFlowNode(blockIndex, flowNode.id) }"
              :style="flowNodeStyle(nodeIndex, row.length)"
              type="button"
              :aria-label="flowNodeAriaLabel(flowNode)"
              @click="toggleFlowNode(blockIndex, flowNode.id)"
            >
              <strong>{{ flowNode.label }}</strong>
              <p v-if="flowNode.description && (row.length === 1 || isActiveFlowNode(blockIndex, flowNode.id))">
                {{ flowNode.description }}
              </p>
            </button>
            <span v-if="rowIndex < nodeRows(block.data).length - 1" class="flow-downline" aria-hidden="true"></span>
          </div>
        </div>
        <div v-if="normalizeFlowEdges(block.data).length" class="flow-edges">
          <span v-for="edge in normalizeFlowEdges(block.data)" :key="normalizeEdgeLabel(edge)">{{ normalizeEdgeLabel(edge) }}</span>
        </div>
      </section>

      <section v-else-if="block.type === 'compare-table'" class="content-block compare-table-block">
        <div class="block-kicker">Compare Table</div>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th v-for="column in compareColumns(block.data)" :key="column">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows(block.data)" :key="row.label">
              <th>{{ row.label }}</th>
              <td v-for="(cell, index) in row.cells" :key="index">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="block.type === 'code-explain'" class="content-block code-explain">
        <div class="block-kicker">Code Explain / {{ codeLanguage(block.data) }}</div>
        <div class="code-explain-grid">
          <pre><code>{{ block.data.code }}</code></pre>
          <div class="explain-panel">{{ codeExplanation(block.data) }}</div>
        </div>
      </section>

      <section v-else-if="block.type === 'quiz'" class="content-block quiz-block">
        <div class="block-kicker">Quiz</div>
        <h3>{{ block.data.question }}</h3>
        <ol v-if="quizChoices(block.data).length" class="block-list quiz-choices">
          <li v-for="choice in quizChoices(block.data)" :key="choice">{{ choice }}</li>
        </ol>
        <button class="hud-button" style="--button-color: var(--career)" @click="revealedQuiz[blockIndex] = !revealedQuiz[blockIndex]">
          {{ revealedQuiz[blockIndex] ? "Hide Answer" : "Show Answer" }}
        </button>
        <p v-if="revealedQuiz[blockIndex]" class="answer-line">{{ block.data.answer }}</p>
      </section>

      <ExpressionVisualizerBlock
        v-else-if="block.type === 'expression-visualizer'"
        :data="block.data"
      />

      <section v-else class="content-block fallback-block">
        <div class="block-kicker">Unsupported Block / {{ block.sourceType }}</div>
        <pre>{{ block.raw }}</pre>
      </section>
    </template>
  </div>
</template>

<style scoped>
.note-renderer {
  display: grid;
  gap: 24px;
  width: min(980px, 100%);
  margin: 0 auto;
}

.markdown-document {
  display: grid;
  gap: 14px;
}

.doc-heading {
  margin: 12px 0 0;
  border-bottom: 1px solid var(--border-muted);
  border-left: 5px solid var(--note-color, var(--graphics));
  color: var(--text-primary);
  line-height: 1.2;
  padding: 0 0 8px 12px;
}

h1.doc-heading {
  display: none;
}

h2.doc-heading {
  font-size: calc(24px * var(--ui-font-scale));
}

h3.doc-heading,
h4.doc-heading {
  font-size: calc(18px * var(--ui-font-scale));
}

.doc-paragraph,
.doc-list {
  margin: 0;
  color: var(--text-secondary);
  font-size: calc(15px * var(--ui-font-scale));
  line-height: 1.78;
}

.doc-list {
  padding-left: 24px;
}

.doc-code,
.code-explain pre,
.fallback-block pre {
  overflow: auto;
  margin: 0;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-mono);
  line-height: 1.55;
  padding: 14px;
}

:deep(code) {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
  padding: 1px 5px;
}

.content-block {
  display: grid;
  gap: 12px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--note-color, var(--graphics));
  background: var(--background-panel);
  padding: 16px;
}

.block-kicker {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.content-block h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.2;
}

.content-block p,
.explain-panel,
.answer-line,
.block-list {
  margin: 0;
  color: var(--text-secondary);
  font-size: calc(14px * var(--ui-font-scale));
  line-height: 1.65;
}

.block-list {
  padding-left: 20px;
}

.why-line {
  display: grid;
  gap: 6px;
  border-top: 1px solid var(--border-muted);
  padding-top: 10px;
}

.why-line span {
  color: var(--note-color, var(--graphics));
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.flowchart {
  display: grid;
  gap: 18px;
  padding: 4px 0;
}

.flow-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  position: relative;
}

.flow-row--parallel {
  border: 1px dashed var(--border-muted);
  background: var(--background-main);
  padding: 10px;
}

.flow-downline {
  position: absolute;
  bottom: -18px;
  left: 50%;
  width: 1px;
  height: 18px;
  background: var(--border-primary);
}

.flow-downline::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: -4px;
  width: 7px;
  height: 7px;
  border-right: 1px solid var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
  transform: rotate(45deg);
}

.flow-node {
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  gap: 6px;
  min-height: 64px;
  padding: 10px;
  text-align: left;
  transform: translateY(var(--flow-node-offset, 0));
}

.flow-node:hover,
.flow-node.is-active {
  border-color: var(--note-color, var(--graphics));
  background: var(--background-panel);
}

.flow-node strong {
  color: var(--text-primary);
  font-size: var(--font-size-ui);
}

.flow-node p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-small);
  line-height: 1.55;
}

.flow-edges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flow-edges span {
  border: 1px solid var(--border-muted);
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 5px 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
}

th,
td {
  border: 1px solid var(--border-muted);
  padding: 10px;
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--text-primary);
  background: var(--background-main);
}

.code-explain-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 12px;
}

.explain-panel {
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 14px;
}

.quiz-block .hud-button {
  width: max-content;
}

@media (max-width: 900px) {
  .code-explain-grid {
    grid-template-columns: 1fr;
  }
}
</style>
