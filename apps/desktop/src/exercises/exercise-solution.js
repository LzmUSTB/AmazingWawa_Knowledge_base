export function normalizeExerciseSolution(value) {
  return String(value ?? "").trim();
}

export function updateExerciseProblemSolution(exerciseSet, problemId, solution) {
  const normalizedProblemId = String(problemId || "").trim();
  const normalizedSolution = normalizeExerciseSolution(solution);
  if (!exerciseSet || !Array.isArray(exerciseSet.problems)) {
    throw new Error("A valid ExerciseSet is required.");
  }
  if (!normalizedProblemId) throw new Error("Exercise problem id is required.");
  if (!normalizedSolution) throw new Error("Exercise solution cannot be empty.");
  if (!exerciseSet.problems.some((problem) => problem.id === normalizedProblemId)) {
    throw new Error(`Exercise problem "${normalizedProblemId}" was not found.`);
  }
  return {
    ...exerciseSet,
    problems: exerciseSet.problems.map((problem) => (
      problem.id === normalizedProblemId
        ? { ...problem, solution: normalizedSolution }
        : problem
    )),
  };
}
