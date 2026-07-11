export const RELATION_TYPES = [
  "contains",
  "depends-on",
  "used-in",
  "compares-with",
];

export const KNOWLEDGE_TYPES = [
  "domain",
  "topic",
  "concept",
  "skill",
  "project",
  "tool",
  "paper",
  "question",
  "note",
];

export const KNOWLEDGE_STATUS = [
  "domain",
  "seed",
  "growing",
  "evergreen",
  "deprecated",
  "archive",
];

export const DEFAULT_BOARD_SIZE = {
  width: 2400,
  height: 1600,
  grid: 32,
};

export function isAllowedRelationType(relation) {
  return RELATION_TYPES.includes(relation);
}

export function isAllowedKnowledgeType(type) {
  return KNOWLEDGE_TYPES.includes(type);
}

export function isAllowedKnowledgeStatus(status) {
  return KNOWLEDGE_STATUS.includes(status);
}
