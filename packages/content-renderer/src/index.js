export const CONTENT_BLOCK_TYPE = {
  CONCEPT_CARD: "concept-card",
  PROCESS_FLOW: "process-flow",
  COMPARE_TABLE: "compare-table",
  CODE_EXPLAIN: "code-explain",
  FORMULA_BLOCK: "formula-block",
  QUIZ: "quiz"
};

export function isCustomContentBlock(type) {
  return Object.values(CONTENT_BLOCK_TYPE).includes(type);
}