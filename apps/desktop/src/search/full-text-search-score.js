export function normalizeFullText(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function queryTerms(query = "") {
  return normalizeFullText(query).split(/\s+/).filter(Boolean);
}

function includesAllTerms(text, terms) {
  return terms.length > 0 && terms.every((term) => text.includes(term));
}

function occurrenceBonus(text, query) {
  const index = text.indexOf(query);
  if (index < 0) return 0;
  return Math.max(0, 10 - Math.floor(index / 80));
}

export function scoreFullTextChunk(query, chunk) {
  const normalizedQuery = normalizeFullText(query);
  if (!normalizedQuery) return 0;
  const terms = queryTerms(query);
  const title = normalizeFullText(chunk.title);
  const section = normalizeFullText(chunk.section);
  const blockType = normalizeFullText(chunk.blockType);
  const text = normalizeFullText(chunk.text);
  const summary = normalizeFullText(chunk.nodeSummary);
  const meta = normalizeFullText(`${chunk.domain || ""} ${chunk.type || ""}`);
  let score = 0;

  if (title === normalizedQuery) score += 120;
  else if (title.includes(normalizedQuery)) score += 80;
  if (section.includes(normalizedQuery)) score += 70;
  if (blockType.includes(normalizedQuery)) score += 30;
  if (text === normalizedQuery || text.includes(normalizedQuery)) score += text === normalizedQuery ? 60 : 40;
  if (includesAllTerms(text, terms)) score += 20;
  if (summary.includes(normalizedQuery)) score += 25;
  if (meta.includes(normalizedQuery)) score += 15;
  score += occurrenceBonus(text, normalizedQuery);

  return score;
}

export function makeSnippet(text, query, { min = 140, max = 220 } = {}) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const normalizedText = cleaned.toLowerCase();
  const normalizedQuery = normalizeFullText(query);
  const firstTerm = queryTerms(query)[0] || normalizedQuery;
  const matchIndex = normalizedQuery ? normalizedText.indexOf(normalizedQuery) : -1;
  const termIndex = firstTerm ? normalizedText.indexOf(firstTerm) : -1;
  const center = matchIndex >= 0 ? matchIndex : termIndex >= 0 ? termIndex : 0;
  const targetLength = Math.min(max, Math.max(min, normalizedQuery.length + 120));
  const start = Math.max(0, center - Math.floor(targetLength / 2));
  const end = Math.min(cleaned.length, start + targetLength);
  const snippet = cleaned.slice(start, end);
  return `${start > 0 ? "..." : ""}${snippet}${end < cleaned.length ? "..." : ""}`;
}
