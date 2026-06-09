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

const FLOW_NODE_WIDTH = 180;
const FLOW_NODE_HEIGHT = 64;
const FLOW_X_GAP = 110;
const FLOW_Y_GAP = 40;
const FLOW_PADDING = 48;

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
    group.forEach((id, index) => {
      laneMap.set(id, index);
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
  edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]));
  const nodesByLevel = new Map();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    nodesByLevel.set(level, [...(nodesByLevel.get(level) || []), node]);
  });

  const placed = [];
  let maxRows = 1;
  [...nodesByLevel.entries()].forEach(([level, levelNodes]) => {
    const sorted = [...levelNodes].sort((a, b) => {
      const aLane = laneMap.has(a.id) ? laneMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bLane = laneMap.has(b.id) ? laneMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (aLane !== bLane) return aLane - bLane;
      return a.id.localeCompare(b.id);
    });
    maxRows = Math.max(maxRows, sorted.length);
    sorted.forEach((node, rowIndex) => {
      placed.push({
        ...node,
        x: FLOW_PADDING + level * (FLOW_NODE_WIDTH + FLOW_X_GAP),
        y: FLOW_PADDING + rowIndex * (FLOW_NODE_HEIGHT + FLOW_Y_GAP),
        width: FLOW_NODE_WIDTH,
        height: FLOW_NODE_HEIGHT,
        isParallel: laneMap.has(node.id) || node.kind === "parallel",
        isOutput: node.kind === "output" || !(outgoing.get(node.id) || []).length,
      });
    });
  });

  const width = FLOW_PADDING * 2 + (maxLevel + 1) * FLOW_NODE_WIDTH + maxLevel * FLOW_X_GAP;
  const height = FLOW_PADDING * 2 + maxRows * FLOW_NODE_HEIGHT + Math.max(0, maxRows - 1) * FLOW_Y_GAP;

  return {
    width,
    height,
    nodes: placed,
    edges,
    nodesById: new Map(placed.map((node) => [node.id, node])),
    lanes: [...new Set(placed.filter((node) => node.isParallel && node.lane).map((node) => node.lane))],
  };
}

function flowBoardStyle(layout) {
  return {
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };
}

function flowNodeStyle(node) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
  };
}

function flowEdgePath(edge, layout) {
  const source = layout.nodesById.get(edge.source);
  const target = layout.nodesById.get(edge.target);
  if (!source || !target) return "";
  const sourceRight = source.x + source.width;
  const sourceCenterY = source.y + source.height / 2;
  const targetLeft = target.x;
  const targetCenterY = target.y + target.height / 2;
  const midX = (sourceRight + targetLeft) / 2;
  return `M ${sourceRight} ${sourceCenterY} L ${midX} ${sourceCenterY} L ${midX} ${targetCenterY} L ${targetLeft} ${targetCenterY}`;
}

function fallbackNode(id) {
  return {
    id,
    label: id,
    description: "",
    kind: "",
    lane: "",
    x: null,
    y: null,
  };
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

function flowLanes(layout) {
  const rows = new Map();
  layout.nodes
    .filter((node) => node.isParallel && node.lane)
    .forEach((node) => rows.set(node.lane, node.y));
  return [...rows.entries()].map(([label, y]) => ({ label, y }));
}

function flowLaneStyle(lane) {
  return { top: `${lane.y - 24}px` };
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
          <div class="flow-canvas-scroll">
            <div class="flow-canvas-board" :style="flowBoardStyle(flowLayout(block.data))">
              <svg
                class="flow-lines"
                :height="flowLayout(block.data).height"
                :viewBox="`0 0 ${flowLayout(block.data).width} ${flowLayout(block.data).height}`"
                :width="flowLayout(block.data).width"
                aria-hidden="true"
              >
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
              <div
                v-for="lane in flowLanes(flowLayout(block.data))"
                :key="lane.label"
                class="flow-lane-label"
                :style="flowLaneStyle(lane)"
              >
                {{ lane.label }}
              </div>
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

.flow-canvas-scroll {
  max-width: 100%;
  min-height: 390px;
  overflow: auto;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.flow-canvas-board {
  position: relative;
  min-width: 100%;
  min-height: 390px;
  background: var(--background-main);
}

.flow-canvas-board::before {
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
  left: 0;
  top: 0;
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
  .code-explain-grid,
  .flow-layout {
    grid-template-columns: 1fr;
  }

  .flow-canvas-scroll,
  .flow-canvas-board {
    min-height: 340px;
  }
}
</style>
