export const KNOWLEDGE_STATUS = {
  SEED: "seed",
  GROWING: "growing",
  EVERGREEN: "evergreen",
  DEPRECATED: "deprecated",
  ARCHIVE: "archive"
};

export function isValidKnowledgeStatus(status) {
  return Object.values(KNOWLEDGE_STATUS).includes(status);
}