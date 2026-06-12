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

function htmlToSearchText(html = "") {
  const source = String(html || "").trim();
  if (!source) return "";
  if (typeof document === "undefined") {
    return compactText(source.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  }

  const template = document.createElement("template");
  template.innerHTML = source;
  template.content.querySelectorAll("script, style, noscript").forEach((element) => element.remove());
  const attributeText = [...template.content.querySelectorAll("[alt], [title], [aria-label]")]
    .flatMap((element) => [element.getAttribute("alt"), element.getAttribute("title"), element.getAttribute("aria-label")])
    .filter(Boolean)
    .join(" ");
  return compactText(`${template.content.textContent || ""} ${attributeText}`);
}

function splitSearchText(text, { maxLength = 1800, overlap = 160 } = {}) {
  const compacted = compactText(text);
  if (!compacted) return [];
  if (compacted.length <= maxLength) return [compacted];

  const chunks = [];
  let start = 0;
  while (start < compacted.length) {
    let end = Math.min(compacted.length, start + maxLength);
    if (end < compacted.length) {
      const softBreak = compacted.lastIndexOf(" ", end);
      if (softBreak > start + Math.floor(maxLength * 0.65)) end = softBreak;
    }
    chunks.push(compacted.slice(start, end).trim());
    if (end >= compacted.length) break;
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }
  return chunks.filter(Boolean);
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

function htmlChunks(node, nodeId, html) {
  const text = htmlToSearchText(html);
  return splitSearchText(text).map((chunkText, chunkIndex) => (
    baseChunk(node, nodeId, 0, chunkIndex, "html", chunkIndex ? `HTML note ${chunkIndex + 1}` : "HTML note", chunkText)
  ));
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

function chunksForNote(nodeId, note) {
  const node = findGraphNode(nodeId);
  if (!node) return [];
  if (note?.format === "html" || note?.html) return htmlChunks(node, nodeId, note?.html || "");
  return parseNoteBlocks(note?.markdown || "", { blockRegistry: getActiveVault().blockRegistry || {} }).flatMap((block, blockIndex) => {
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
    .flatMap(([nodeId, note]) => chunksForNote(nodeId, note || {}))
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
