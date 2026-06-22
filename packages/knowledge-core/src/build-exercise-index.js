import { parseYaml } from "./parse-yaml.js";

export const EXERCISE_TYPES = [
  "conceptual",
  "calculation",
  "proof",
  "derivation",
  "application",
  "comparison",
  "implementation",
  "diagnostic",
];

export const EXERCISE_DIFFICULTIES = [
  "introductory",
  "undergraduate",
  "undergraduate-advanced",
  "graduate",
  "research-oriented",
];

function asStringArray(value, fieldName, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export function idFromExercisePath(filePath = "") {
  const normalized = String(filePath).replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized.match(/^content\/[^/]+\/([^/]+)\/exercises\.yaml$/)?.[1] || "";
}

function normalizeProblem(problem = {}, index, seenIds, errors) {
  const problemErrors = [];
  const id = String(problem?.id || "").trim();
  if (!id) problemErrors.push(`problems[${index}].id is required.`);
  if (id && seenIds.has(id)) problemErrors.push(`Duplicate problem id "${id}".`);
  if (id) seenIds.add(id);
  if (!EXERCISE_TYPES.includes(problem?.type)) problemErrors.push(`Problem "${id || index}" has unsupported type "${problem?.type || ""}".`);
  if (!EXERCISE_DIFFICULTIES.includes(problem?.difficulty)) problemErrors.push(`Problem "${id || index}" has unsupported difficulty "${problem?.difficulty || ""}".`);
  if (!String(problem?.title || "").trim()) problemErrors.push(`Problem "${id || index}" title is required.`);
  ["prompt", "answer", "solution"].forEach((field) => {
    if (!String(problem?.[field] || "").trim()) problemErrors.push(`Problem "${id || index}" ${field} is required.`);
  });
  errors.push(...problemErrors);
  return {
    id,
    type: problem?.type || "conceptual",
    difficulty: problem?.difficulty || "undergraduate",
    title: String(problem?.title || ""),
    prompt: String(problem?.prompt || ""),
    hints: Array.isArray(problem?.hints) ? problem.hints.map((hint) => String(hint || "")).filter(Boolean) : [],
    answer: String(problem?.answer || ""),
    solution: String(problem?.solution || ""),
  };
}

function normalizeExerciseSet(filePath, raw) {
  const errors = [];
  const warnings = [];
  const pathNodeId = idFromExercisePath(filePath);
  let source = {};
  try {
    source = parseYaml(raw, filePath);
  } catch (error) {
    errors.push(error.message);
  }
  if (!source || Array.isArray(source) || typeof source !== "object") {
    errors.push("exercises.yaml must contain a YAML object.");
    source = {};
  }
  if (!pathNodeId) errors.push("Exercise path must match content/<domain>/<nodeId>/exercises.yaml.");
  const declaredNodeId = String(source.nodeId || "").trim();
  if (!declaredNodeId && pathNodeId) warnings.push(`nodeId was missing and defaulted to "${pathNodeId}".`);
  if (declaredNodeId && pathNodeId && declaredNodeId !== pathNodeId) errors.push(`nodeId "${declaredNodeId}" does not match path nodeId "${pathNodeId}".`);
  if (!Number.isFinite(Number(source.version))) errors.push("version is required and must be a number.");
  if (!String(source.title || "").trim()) errors.push("title is required.");
  if (!Array.isArray(source.problems)) errors.push("problems is required and must be an array.");
  const scope = source.scope && typeof source.scope === "object" && !Array.isArray(source.scope) ? source.scope : {};
  const seenIds = new Set();
  const nodeId = pathNodeId || declaredNodeId;
  return {
    id: nodeId,
    nodeId,
    filePath,
    version: Number(source.version) || 1,
    title: String(source.title || nodeId || "Exercises"),
    locale: String(source.locale || "zh-CN"),
    summary: String(source.summary || ""),
    scope: {
      coverageNodeIds: asStringArray(scope.coverageNodeIds, "scope.coverageNodeIds", errors),
      prerequisiteNodeIds: asStringArray(scope.prerequisiteNodeIds, "scope.prerequisiteNodeIds", errors),
      relatedNodeIds: asStringArray(scope.relatedNodeIds, "scope.relatedNodeIds", errors),
    },
    problems: (Array.isArray(source.problems) ? source.problems : []).map((problem, index) => normalizeProblem(problem, index, seenIds, errors)),
    errors,
    warnings,
  };
}

export function buildExerciseIndex(exerciseFiles = {}) {
  const all = Object.entries(exerciseFiles)
    .map(([filePath, raw]) => normalizeExerciseSet(filePath, raw))
    .filter((exerciseSet) => exerciseSet.nodeId);
  const seenNodeIds = new Set();
  all.forEach((exerciseSet) => {
    if (seenNodeIds.has(exerciseSet.nodeId)) exerciseSet.errors.push(`Multiple ExerciseSet files resolve to node "${exerciseSet.nodeId}".`);
    seenNodeIds.add(exerciseSet.nodeId);
  });
  return {
    byNodeId: Object.fromEntries(all.map((exerciseSet) => [exerciseSet.nodeId, exerciseSet])),
    all,
  };
}

export function parseExerciseProgress(raw = "") {
  if (!String(raw || "").trim()) return { version: 1, problems: {}, errors: [] };
  try {
    const parsed = parseYaml(raw, ".kinjito/exercise-progress.yaml");
    const problems = parsed?.problems && typeof parsed.problems === "object" && !Array.isArray(parsed.problems)
      ? parsed.problems
      : {};
    return { version: Number(parsed?.version) || 1, problems, errors: [] };
  } catch (error) {
    return { version: 1, problems: {}, errors: [error.message] };
  }
}
