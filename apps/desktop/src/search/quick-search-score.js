export function normalizeSearchText(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function scoreQuickSearchField(query, value, { exact = 90, prefix = 68, includes = 38 } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedQuery || !normalizedValue) return 0;
  if (normalizedValue === normalizedQuery) return exact;
  if (normalizedValue.startsWith(normalizedQuery)) return prefix;
  if (normalizedValue.includes(normalizedQuery)) return includes;
  return 0;
}

export function scoreQuickSearchItem(query, fields = []) {
  return fields.reduce((best, field) => {
    const fieldScore = scoreQuickSearchField(query, field.value, field.weights);
    return Math.max(best, fieldScore + (field.boost || 0));
  }, 0);
}
