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

function normalizeFlowNodes(data) {
  const nodeEntries = entries(data.nodes);
  if (nodeEntries.length) {
    return nodeEntries.map(([id, node]) => ({
      id,
      label: typeof node === "string" ? node : node.label || node.title || id,
      description: typeof node === "string" ? "" : node.description || node.text || node.summary || "",
      kind: typeof node === "string" ? "" : node.kind || "",
      lane: typeof node === "string" ? "" : node.lane || "",
      x: typeof node === "string" ? null : numberOrNull(node.x),
      y: typeof node === "string" ? null : numberOrNull(node.y),
    }));
  }
  const steps = Array.isArray(data.steps) ? data.steps : [];
  return steps.map((step, index) => ({
    id: `step-${index + 1}`,
    label: typeof step === "string" ? step : step.label || `Step ${index + 1}`,
    description: typeof step === "string" ? "" : step.description || "",
    kind: "",
    lane: "",
    x: null,
    y: null,
  }));
}

function numberOrNull(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

function normalizeFlowEdges(data) {
  const rawEdges = Array.isArray(data.edges)
    ? data.edges
    : typeof data.edges === "string"
      ? [data.edges]
      : entries(data.edges).map(([source, target]) => ({ source, target }));
  const parsed = rawEdges
    .map((edge) => {
      if (Array.isArray(edge)) return { source: String(edge[0] || "").trim(), target: String(edge[1] || "").trim() };
      if (edge && typeof edge === "object") {
        return {
          source: String(edge.source || edge.from || "").trim(),
          target: String(edge.target || edge.to || "").trim(),
        };
      }
      const match = String(edge).match(/^\s*(.+?)\s*(?:->|=>|→)\s*(.+?)\s*$/);
      return match ? { source: match[1].trim(), target: match[2].trim() } : null;
    })
    .filter((edge) => edge?.source && edge?.target);
  if (parsed.length) return parsed;
  const steps = normalizeFlowNodes(data);
  return steps.slice(1).map((node, index) => ({ source: steps[index].id, target: node.id }));
}

function selectFlowNode(blockIndex, nodeId) {
  activeFlowNode.value = {
    ...activeFlowNode.value,
    [blockIndex]: nodeId,
  };
}

function flowMarkerId(blockIndex) {
  return `flow-arrow-${blockIndex}`;
}

function flowParallelLaneMap(data) {
  const laneMap = new Map();
  normalizeParallelGroups(data).forEach((group) => {
    const spacing = group.length > 1 ? 50 / (group.length - 1) : 0;
    group.forEach((id, index) => {
      laneMap.set(id, group.length === 1 ? 50 : 25 + spacing * index);
    });
  });
  return laneMap;
}

function flowNodeLevels(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id));
  edges.forEach((edge) => {
    ids.add(edge.source);
    ids.add(edge.target);
  });
  const levels = new Map([...ids].map((id) => [id, 0]));
  for (let pass = 0; pass < ids.size + 2; pass += 1) {
    let changed = false;
    edges.forEach((edge) => {
      const nextLevel = (levels.get(edge.source) || 0) + 1;
      if (nextLevel > (levels.get(edge.target) || 0)) {
        levels.set(edge.target, nextLevel);
        changed = true;
      }
    });
    if (!changed) break;
  }
  return levels;
}

function flowLayout(data) {
  const baseNodes = normalizeFlowNodes(data);
  const edges = normalizeFlowEdges(data);
  const nodesById = new Map(baseNodes.map((node) => [node.id, node]));
  edges.forEach((edge) => {
    if (!nodesById.has(edge.source)) nodesById.set(edge.source, fallbackNode(edge.source));
    if (!nodesById.has(edge.target)) nodesById.set(edge.target, fallbackNode(edge.target));
  });
  const nodes = [...nodesById.values()];
  const levels = flowNodeLevels(nodes, edges);
  const maxLevel = Math.max(1, ...[...levels.values()]);
  const laneMap = flowParallelLaneMap(data);
  const outgoing = new Map();
  const incoming = new Map();
  edges.forEach((edge) => {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]);
    incoming.set(edge.target, [...(incoming.get(edge.target) || []), edge.source]);
  });

  const placed = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    return {
      ...node,
      x: node.x ?? 10 + (level / maxLevel) * 80,
      y: node.y ?? laneMap.get(node.id) ?? null,
      isParallel: laneMap.has(node.id) || node.kind === "parallel",
      isOutput: node.kind === "output" || !(outgoing.get(node.id) || []).length,
    };
  });

  const byId = new Map(placed.map((node) => [node.id, node]));
  for (let pass = 0; pass < placed.length + 2; pass += 1) {
    placed.forEach((node) => {
      if (node.y !== null) return;
      const sourceYs = (incoming.get(node.id) || []).map((id) => byId.get(id)?.y).filter((value) => value !== null && value !== undefined);
      if (sourceYs.length === 1) {
        node.y = sourceYs[0];
      } else if (sourceYs.length > 1) {
        node.y = sourceYs.reduce((sum, value) => sum + value, 0) / sourceYs.length;
      }
    });
  }

  const levelGroups = new Map();
  placed.forEach((node) => {
    if (node.y === null) {
      const level = levels.get(node.id) || 0;
      levelGroups.set(level, [...(levelGroups.get(level) || []), node]);
    }
  });
  levelGroups.forEach((group) => {
    const spacing = group.length > 1 ? 44 / (group.length - 1) : 0;
    group.forEach((node, index) => {
      node.y = group.length === 1 ? 50 : 28 + spacing * index;
    });
  });

  return {
    nodes: placed,
    edges,
    nodesById: new Map(placed.map((node) => [node.id, node])),
    lanes: [...new Set(placed.filter((node) => node.isParallel && node.lane).map((node) => node.lane))],
  };
}

function flowNodeStyle(node) {
  return {
    left: `${node.x}%`,
    top: `${node.y}%`,
  };
}

function flowEdgePath(edge, layout) {
  const source = layout.nodesById.get(edge.source);
  const target = layout.nodesById.get(edge.target);
  if (!source || !target) return "";
  const midX = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
}

function flowDetail(blockIndex, data) {
  const layout = flowLayout(data);
  const selectedId = selectedFlowNodeId(blockIndex, data);
  return layout.nodesById.get(selectedId) || layout.nodes[0] || fallbackNode("No step");
}

function selectedFlowNodeId(blockIndex, data) {
  const layout = flowLayout(data);
  return activeFlowNode.value[blockIndex] || layout.nodes[0]?.id || "";
}

function isSelectedFlowNode(blockIndex, data, nodeId) {
  return selectedFlowNodeId(blockIndex, data) === nodeId;
}

function isSelectedFlowEdge(blockIndex, data, edge) {
  const selectedId = selectedFlowNodeId(blockIndex, data);
  return edge.source === selectedId || edge.target === selectedId;
}

function flowNodeClass(blockIndex, data, node) {
  return {
    "is-active": isSelectedFlowNode(blockIndex, data, node.id),
    "is-parallel": node.isParallel,
    "is-output": node.isOutput,
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

function blockIntuition(data) {
  return data.key_intuition || data.intuition || data.core || "";
}

function normalizeEdgeLabel(edge) {
  return `${edge.source} -> ${edge.target}`;
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

      <section v-else-if="block.type === 'process-flow'" class="content-block process-flow">
        <div class="block-kicker">Process Flow</div>
        <h3>{{ processTitle(block.data) }}</h3>
        <div class="flow-layout">
          <div class="flow-canvas">
            <svg class="flow-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker :id="flowMarkerId(blockIndex)" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
                  <path d="M 0 0 L 7 3.5 L 0 7 z" fill="currentColor" />
                </marker>
              </defs>
              <path
                v-for="edge in flowLayout(block.data).edges"
                :key="normalizeEdgeLabel(edge)"
                class="flow-line"
                :class="{ 'is-muted': !isSelectedFlowEdge(blockIndex, block.data, edge) }"
                :d="flowEdgePath(edge, flowLayout(block.data))"
                :marker-end="`url(#${flowMarkerId(blockIndex)})`"
              />
            </svg>
            <div v-for="lane in flowLayout(block.data).lanes" :key="lane" class="flow-lane-label">{{ lane }}</div>
            <button
              v-for="flowNode in flowLayout(block.data).nodes"
              :key="flowNode.id"
              class="flow-node"
              :class="flowNodeClass(blockIndex, block.data, flowNode)"
              :style="flowNodeStyle(flowNode)"
              type="button"
              :aria-label="flowNodeAriaLabel(flowNode)"
              :aria-selected="isSelectedFlowNode(blockIndex, block.data, flowNode.id)"
              @click="selectFlowNode(blockIndex, flowNode.id)"
            >
              <strong>{{ flowNode.label }}</strong>
            </button>
          </div>
          <aside class="flow-detail">
            <div class="flow-detail-meta">
              <span>{{ flowDetail(blockIndex, block.data).lane || "flow node" }}</span>
              <span>click node to inspect</span>
            </div>
            <h4>{{ flowDetail(blockIndex, block.data).label }}</h4>
            <p>{{ flowDetail(blockIndex, block.data).description || "No description was provided for this step." }}</p>
          </aside>
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

.flow-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 320px);
  gap: 18px;
}

.flow-canvas {
  position: relative;
  min-height: 390px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.flow-canvas::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(237, 237, 237, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(237, 237, 237, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

.flow-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--note-color, var(--career));
  pointer-events: none;
}

.flow-line {
  fill: none;
  stroke: currentColor;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 1.7;
  opacity: 0.82;
  vector-effect: non-scaling-stroke;
}

.flow-line.is-muted {
  stroke: rgba(237, 237, 237, 0.32);
}

.flow-lane-label {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 1;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.flow-node {
  position: absolute;
  z-index: 2;
  width: 150px;
  min-height: 54px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--note-color, var(--career));
  background: var(--background-panel);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
  line-height: 1.25;
  padding: 8px 10px;
  text-align: center;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
}

.flow-node:hover,
.flow-node.is-active {
  border-color: var(--border-primary);
  background: var(--background-panel);
  color: var(--text-primary);
}

.flow-node.is-parallel {
  border-left-color: var(--career);
}

.flow-node.is-output {
  border-left-color: var(--quiz);
}

.flow-node strong {
  font-size: var(--font-size-small);
}

.flow-detail {
  display: grid;
  align-content: start;
  gap: 12px;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
  padding: 18px;
}

.flow-detail h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: calc(20px * var(--ui-font-scale));
  line-height: 1.15;
  text-transform: uppercase;
}

.flow-detail-meta {
  display: grid;
  gap: 6px;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
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
  padding: 12px 0;
}

.code-line {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  width: 100%;
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
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-overflow: ellipsis;
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
  .code-explain-grid,
  .flow-layout {
    grid-template-columns: 1fr;
  }

  .flow-canvas {
    min-height: 340px;
  }
}
</style>
