export const GRAPH_RELATION = {
  CONTAINS: "contains",
  DEPENDS_ON: "depends-on",
  USED_IN: "used-in",
  COMPARES_WITH: "compares-with"
};

export function isValidGraphRelation(relation) {
  return Object.values(GRAPH_RELATION).includes(relation);
}