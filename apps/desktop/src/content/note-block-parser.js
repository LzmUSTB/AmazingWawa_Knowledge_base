const SUPPORTED_BLOCKS = new Set([
  "concept-card",
  "process-flow",
  "compare-table",
  "code-explain",
  "quiz",
  "expression-visualizer",
]);

function parseScalar(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const numberValue = Number(item);
        return Number.isFinite(numberValue) ? numberValue : item;
      });
  }
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) && /^-?\d+(?:\.\d+)?$/.test(trimmed) ? numberValue : trimmed;
}

function getIndent(line = "") {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}

function stripCommonIndent(lines) {
  const nonEmptyIndents = lines
    .filter((line) => line.trim())
    .map(getIndent);
  const commonIndent = nonEmptyIndents.length ? Math.min(...nonEmptyIndents) : 0;
  return lines.map((line) => line.slice(Math.min(commonIndent, getIndent(line))));
}

function foldBlockScalar(lines) {
  const paragraphs = [];
  let current = [];
  lines.forEach((line) => {
    if (!line.trim()) {
      if (current.length) paragraphs.push(current.join(" "));
      current = [];
      return;
    }
    current.push(line.trim());
  });
  if (current.length) paragraphs.push(current.join(" "));
  return paragraphs.join("\n\n");
}

function parseBlockScalar(lines, style) {
  const stripped = stripCommonIndent(lines);
  return style === ">" ? foldBlockScalar(stripped) : stripped.join("\n").replace(/\s+$/, "");
}

function parseKeyValueLines(lines) {
  const data = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const [, key, value] = match;
    const trimmedValue = value.trim();
    if (trimmedValue === "|" || trimmedValue === ">") {
      const blockLines = [];
      index += 1;
      while (
        index < lines.length &&
        (lines[index].trim() === "" || /^\s+/.test(lines[index]) || !/^[A-Za-z0-9_-]+:\s*/.test(lines[index]))
      ) {
        blockLines.push(lines[index]);
        index += 1;
      }
      data[key] = parseBlockScalar(blockLines, trimmedValue);
      continue;
    }

    if (value.trim()) {
      data[key] = parseScalar(value);
      index += 1;
      continue;
    }

    const nested = [];
    index += 1;
    while (
      index < lines.length &&
      (lines[index].trim() === "" || /^\s+/.test(lines[index]) || !/^[A-Za-z0-9_-]+:\s*/.test(lines[index]))
    ) {
      if (lines[index].trim()) nested.push(lines[index]);
      index += 1;
    }
    data[key] = parseNestedValue(nested);
  }

  return data;
}

function parseNestedValue(lines) {
  if (!lines.length) return "";
  if (lines.every((line) => line.trim().startsWith("- "))) {
    return lines.map((line) => parseScalar(line.trim().slice(2)));
  }
  if (!lines.some((line) => /^([^:\n]+):\s*(.*)$/.test(line.trim()))) {
    return lines.map((line) => line.trim()).filter(Boolean);
  }

  const result = {};
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].replace(/^ {2}/, "");
    const match = line.match(/^([^:\n]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const key = match[1].trim();
    if (!key) {
      index += 1;
      continue;
    }
    const value = match[2].trim();
    if (value) {
      result[key] = parseScalar(value);
      index += 1;
      continue;
    }

    const child = [];
    index += 1;
    while (index < lines.length && /^ {4}/.test(lines[index])) {
      child.push(lines[index].replace(/^ {4}/, ""));
      index += 1;
    }
    result[key] = parseNestedValue(child);
  }
  return result;
}

function parseCustomBlock(type, raw) {
  try {
    return {
      type: SUPPORTED_BLOCKS.has(type) ? type : "fallback",
      sourceType: type,
      data: parseKeyValueLines(raw.split(/\r?\n/)),
      raw,
    };
  } catch (error) {
    return {
      type: "fallback",
      sourceType: type,
      data: {},
      raw,
      error: String(error?.message || error),
    };
  }
}

export function parseNoteBlocks(markdown = "") {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let markdownBuffer = [];
  let index = 0;

  function flushMarkdown() {
    const markdownText = markdownBuffer.join("\n").trim();
    if (markdownText) blocks.push({ type: "markdown", markdown: markdownText });
    markdownBuffer = [];
  }

  while (index < lines.length) {
    const openMatch = lines[index].match(/^:::([A-Za-z0-9_-]+)\s*$/);
    if (!openMatch) {
      markdownBuffer.push(lines[index]);
      index += 1;
      continue;
    }

    flushMarkdown();
    const blockType = openMatch[1];
    const body = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== ":::") {
      const inlineCloseMatch = lines[index].match(/^(.*):::\s*$/);
      if (inlineCloseMatch) {
        if (inlineCloseMatch[1].trim()) body.push(inlineCloseMatch[1]);
        index += 1;
        break;
      }
      body.push(lines[index]);
      index += 1;
    }
    if (index < lines.length && lines[index].trim() === ":::") index += 1;
    blocks.push(parseCustomBlock(blockType, body.join("\n")));
  }

  flushMarkdown();
  return blocks;
}

export function parseMarkdownTokens(markdown = "") {
  const tokens = [];
  const lines = markdown.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      tokens.push({ type: "code", language: fenceMatch[1], text: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      tokens.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      tokens.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      tokens.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^```/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    tokens.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return tokens;
}
