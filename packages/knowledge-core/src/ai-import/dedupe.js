function normalizeText(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const text = normalizeText(value).replace(/\s+/g, "");
  if (text.length < 2) return new Set(text ? [text] : []);
  const pairs = new Set();
  for (let index = 0; index < text.length - 1; index += 1) {
    pairs.add(text.slice(index, index + 2));
  }
  return pairs;
}

export function simpleStringSimilarity(left, right) {
  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  if (!leftPairs.size && !rightPairs.size) return 1;
  if (!leftPairs.size || !rightPairs.size) return 0;
  const intersection = [...leftPairs].filter((item) => rightPairs.has(item)).length;
  return (2 * intersection) / (leftPairs.size + rightPairs.size);
}

export function potentialDuplicateNodeWarnings(currentVault, candidate, packageCandidates = []) {
  const warnings = [];
  const normalizedTitle = normalizeText(candidate.title);
  const aliases = new Set((candidate.aliases || []).map(normalizeText).filter(Boolean));
  const nodes = [...(currentVault.nodes || []), ...packageCandidates].filter((node) => node.id !== candidate.id);

  nodes.forEach((node) => {
    if (node.id === candidate.id) warnings.push(`Potential duplicate: exact id "${candidate.id}".`);
    if (normalizeText(node.title) && normalizeText(node.title) === normalizedTitle) {
      warnings.push(`Potential duplicate: exact title "${candidate.title}" matches "${node.id}".`);
    }
    const nodeAliases = new Set((node.aliases || []).map(normalizeText).filter(Boolean));
    [...aliases].forEach((alias) => {
      if (nodeAliases.has(alias) || normalizeText(node.title) === alias) {
        warnings.push(`Potential duplicate: alias "${alias}" matches "${node.id}".`);
      }
    });
    if (
      candidate.domain &&
      node.domain === candidate.domain &&
      normalizedTitle &&
      simpleStringSimilarity(candidate.title, node.title) >= 0.82
    ) {
      warnings.push(`Potential duplicate: "${candidate.title}" is similar to "${node.title}" in ${candidate.domain}.`);
    }
  });

  return [...new Set(warnings)];
}
