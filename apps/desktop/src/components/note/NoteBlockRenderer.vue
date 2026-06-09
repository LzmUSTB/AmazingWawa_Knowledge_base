<script setup>
import { computed, ref, watch } from "vue";
import { parseMarkdownTokens, parseNoteBlocks } from "../../content/note-block-parser.js";
import ExpressionVisualizerBlock from "./blocks/ExpressionVisualizerBlock.vue";
import ProcessFlowBlock from "./blocks/ProcessFlowBlock.vue";

const props = defineProps({
  markdown: {
    type: String,
    default: "",
  },
  searchQuery: {
    type: String,
    default: "",
  },
});

const revealedQuiz = ref({});
const activeCodeLine = ref({});
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

function conceptChips(data) {
  return normalizeConceptItems(data.tags || data.chips || data.domain || data.type).slice(0, 4);
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

function normalizeTableCell(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(normalizeTableCell).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.values(value).map(normalizeTableCell).filter(Boolean).join(", ");
  return String(value);
}

function rowCells(row, columns) {
  const columnList = columns || [];
  let cells = [];
  if (Array.isArray(row)) {
    cells = row.map(normalizeTableCell);
  } else if (row && typeof row === "object") {
    const hasColumnKeys = columnList.some((column) => Object.prototype.hasOwnProperty.call(row, column));
    cells = hasColumnKeys ? columnList.map((column) => normalizeTableCell(row[column])) : Object.values(row).map(normalizeTableCell);
  } else {
    cells = String(row || "").split(",").map((item) => item.trim());
  }
  if (!columnList.length) return cells;
  return columnList.map((_, index) => cells[index] || "");
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

function blockIntuition(data) {
  return data.key_intuition || data.intuition || data.core || "";
}

function compareColumns(data) {
  return Array.isArray(data.columns) ? data.columns : String(data.columns || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function compareRows(data) {
  const columns = compareColumns(data);
  return entries(data.rows).map(([label, row]) => ({
    label,
    cells: rowCells(row, columns),
  }));
}

function normalizeCodeLines(data) {
  const source = Array.isArray(data.code) ? data.code.join("\n") : String(data.code || "");
  return source.split(/\r?\n/).filter((line, index, lines) => line || index < lines.length - 1);
}

function lineExplanations(data) {
  return data.lines || data.line_explanations || data.explanations || {};
}

function selectCodeLine(blockIndex, lineIndex) {
  activeCodeLine.value = {
    ...activeCodeLine.value,
    [blockIndex]: lineIndex,
  };
}

function selectedCodeLine(blockIndex) {
  return activeCodeLine.value[blockIndex] || 0;
}

function codeLineExplanation(data, lineIndex) {
  const explanations = lineExplanations(data);
  const specific = explanations[lineIndex + 1] || explanations[String(lineIndex + 1)] || explanations[`line-${lineIndex + 1}`];
  return specific || codeExplanation(data) || "No line explanation was provided.";
}

function includesQuery(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").trim().toLowerCase());
}

function matchingCodeLineIndex(data, query) {
  if (!query.trim()) return -1;
  const lines = normalizeCodeLines(data);
  const explanations = lineExplanations(data);
  return lines.findIndex((line, index) => {
    const specific = explanations[index + 1] || explanations[String(index + 1)] || explanations[`line-${index + 1}`];
    return includesQuery(line, query) || includesQuery(specific, query) || includesQuery(codeExplanation(data), query);
  });
}

watch(
  () => [props.searchQuery, blocks.value],
  ([query]) => {
    if (!query.trim()) return;
    blocks.value.forEach((block, blockIndex) => {
      if (block.type === "code-explain") {
        const matchIndex = matchingCodeLineIndex(block.data, query);
        if (matchIndex >= 0) selectCodeLine(blockIndex, matchIndex);
      }
      if (block.type === "quiz" && includesQuery(block.data.answer, query)) {
        revealedQuiz.value = {
          ...revealedQuiz.value,
          [blockIndex]: true,
        };
      }
    });
  },
  { immediate: true },
);
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
        <div class="block-head">
          <div>
            <div class="block-kicker">concept-card</div>
            <h3>{{ conceptCardTitle(block) }}</h3>
          </div>
          <div v-if="conceptChips(block.data).length" class="chip-row">
            <span v-for="chip in conceptChips(block.data)" :key="chip" class="chip">{{ chip }}</span>
          </div>
        </div>
        <div class="field-grid">
          <article class="field-card">
            <strong>Summary</strong>
            <p>{{ blockSummary(block.data) }}</p>
          </article>
          <article v-if="blockWhy(block.data)" class="field-card">
            <strong>Why it matters</strong>
            <p>{{ blockWhy(block.data) }}</p>
          </article>
          <article v-if="blockIntuition(block.data) || conceptList(block.data).length" class="field-card">
            <strong>Key intuition</strong>
            <p v-if="blockIntuition(block.data)">{{ blockIntuition(block.data) }}</p>
            <ul v-if="conceptList(block.data).length" class="block-list">
              <li v-for="item in conceptList(block.data)" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </section>

      <ProcessFlowBlock v-else-if="block.type === 'process-flow'" :data="block.data" :search-query="searchQuery" />

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
          <pre class="code-panel"><button
            v-for="(line, lineIndex) in normalizeCodeLines(block.data)"
            :key="lineIndex"
            class="code-line"
            :class="{ 'is-active': selectedCodeLine(blockIndex) === lineIndex }"
            type="button"
            @click="selectCodeLine(blockIndex, lineIndex)"
          ><span class="line-no">{{ lineIndex + 1 }}</span><code>{{ line }}</code></button></pre>
          <div class="explain-panel">
            <h4>Line {{ selectedCodeLine(blockIndex) + 1 }}</h4>
            <p>{{ codeLineExplanation(block.data, selectedCodeLine(blockIndex)) }}</p>
          </div>
        </div>
      </section>

      <section v-else-if="block.type === 'quiz'" class="content-block quiz-block">
        <div class="block-kicker">Quiz</div>
        <div class="quiz-card">
          <div class="quiz-question">
            <div class="quiz-mark">Q</div>
            <h3>{{ block.data.question }}</h3>
          </div>
        </div>
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

      <section v-else class="markdown-document">
        <template v-for="(token, tokenIndex) in markdownTokens(block.raw)" :key="`fallback-${tokenIndex}`">
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

.block-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.chip {
  min-height: 24px;
  border: 1px solid var(--border-muted);
  border-left: 4px solid var(--note-color, var(--graphics));
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 5px 9px;
  text-transform: uppercase;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.field-card {
  display: grid;
  align-content: start;
  gap: 8px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 14px;
}

.field-card strong {
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
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

.code-panel {
  display: grid;
  align-content: start;
  overflow: auto;
  padding: 12px 0;
}

.code-line {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  width: max-content;
  min-width: 100%;
  border: 0;
  border-left: 4px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  line-height: 1.7;
  padding: 0 12px 0 8px;
  text-align: left;
}

.code-line:hover,
.code-line.is-active {
  border-left-color: var(--note-color, var(--simulation));
  background: rgba(124, 92, 255, 0.14);
  color: var(--text-primary);
}

.line-no {
  color: var(--text-muted);
  user-select: none;
}

.code-line code {
  overflow: visible;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  white-space: pre;
}

.explain-panel {
  display: grid;
  align-content: start;
  gap: 10px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  padding: 14px;
}

.explain-panel h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-ui);
  text-transform: uppercase;
}

.explain-panel p {
  margin: 0;
}

.quiz-card {
  border: 1px solid var(--border-primary);
  background: var(--background-main);
  padding: 16px;
}

.quiz-question {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.quiz-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--note-color, var(--quiz));
  color: var(--note-color, var(--quiz));
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-weight: 900;
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
