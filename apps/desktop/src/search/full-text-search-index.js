import { parseMarkdownTokens, parseNoteBlocks } from "../content/note-block-parser.js";
import { findGraphNode, getActiveVault } from "../graph/graph-data-store.js";
import { makeSnippet, scoreFullTextChunk } from "./full-text-search-score.js";

const MAX_RESULTS = 30;
const MAX_RESULTS_PER_NODE = 5;
const SUPPORTED_CONTENT_BLOCKS = new Set([
  "concept-card",
  "process-flow",
  "compare-table",
  "code-explain",
  "quiz",
  "expression-visualizer",
]);

function nodeTitle(node, nodeId) {
  return node?.title || node?.name || nodeId;
}

function nodeSummary(node) {
  return node?.summary || node?.description || node?.definition || "";
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeStringify(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(safeStringify).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value)
      .flatMap(([key, child]) => [key, safeStringify(child)])
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function tokenText(token) {
  if (token.type === "heading" || token.type === "paragraph" || token.type === "code") return token.text || "";
  if (token.type === "list") return (token.items || []).join(" ");
  return "";
}

function markdownChunks(node, nodeId, block, blockIndex) {
  const tokens = parseMarkdownTokens(block.markdown || "");
  const chunks = [];
  let section = "Markdown";
  let buffer = [];
  let chunkIndex = 0;

  function flush() {
    const text = compactText(buffer.join(" "));
    if (text) {
      chunks.push(baseChunk(node, nodeId, blockIndex, chunkIndex, "markdown", section, text));
      chunkIndex += 1;
    }
    buffer = [];
  }

  tokens.forEach((token) => {
    if (token.type === "heading") {
      flush();
      section = token.text || "Markdown";
      buffer.push(token.text || "");
      return;
    }
    buffer.push(tokenText(token));
  });
  flush();
  return chunks;
}

function contentBlockSection(block) {
  const data = block.data || {};
  return data.title || data.name || data.question || data.formula || data.language || data.lang || block.sourceType || block.type;
}

function contentBlockText(block) {
  const data = block.data || {};
  if (block.type === "expression-visualizer") {
    return safeStringify({
      title: data.title || data.name,
      formula: data.formula || data.expression,
      parameters: data.parameters || data.params,
      variables: data.variables,
    });
  }
  return safeStringify(data);
}

function contentBlockChunks(node, nodeId, block, blockIndex) {
  if (!SUPPORTED_CONTENT_BLOCKS.has(block.type)) return [];
  const text = compactText(`${block.sourceType || block.type} ${contentBlockText(block)}`);
  if (!text) return [];
  return [baseChunk(node, nodeId, blockIndex, 0, block.type, contentBlockSection(block), text)];
}

function baseChunk(node, nodeId, blockIndex, chunkIndex, blockType, section, text) {
  return {
    id: `fulltext:${nodeId}:${blockIndex}:${chunkIndex}`,
    kind: "full-text",
    nodeId,
    targetId: nodeId,
    title: nodeTitle(node, nodeId),
    domain: node?.domain || "",
    type: node?.type || "",
    nodeSummary: nodeSummary(node),
    section: section || blockType,
    blockType,
    text,
    snippet: "",
    score: 0,
  };
}

function chunksForNote(nodeId, markdown) {
  const node = findGraphNode(nodeId);
  if (!node) return [];
  return parseNoteBlocks(markdown || "", { blockRegistry: getActiveVault().blockRegistry || {} }).flatMap((block, blockIndex) => {
    if (block.type === "markdown") return markdownChunks(node, nodeId, block, blockIndex);
    return contentBlockChunks(node, nodeId, block, blockIndex);
  });
}

function sortByScore(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.title !== b.title) return a.title.localeCompare(b.title);
  return String(a.section || "").localeCompare(String(b.section || ""));
}

export function buildFullTextSearchResults(query) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];
  const notes = getActiveVault().notes || {};
  const perNodeCount = new Map();
  const scored = Object.entries(notes)
    .flatMap(([nodeId, note]) => chunksForNote(nodeId, note?.markdown || ""))
    .map((chunk) => {
      const score = scoreFullTextChunk(normalizedQuery, chunk);
      return {
        ...chunk,
        score,
        snippet: makeSnippet(chunk.text, normalizedQuery),
        subtitle: `${chunk.nodeId} / ${chunk.domain || "unknown"} / ${chunk.type || "node"}`,
        summary: chunk.section || chunk.blockType,
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort(sortByScore);

  const results = [];
  scored.forEach((chunk) => {
    const nodeCount = perNodeCount.get(chunk.nodeId) || 0;
    if (nodeCount >= MAX_RESULTS_PER_NODE || results.length >= MAX_RESULTS) return;
    perNodeCount.set(chunk.nodeId, nodeCount + 1);
    results.push(chunk);
  });
  return results;
}
