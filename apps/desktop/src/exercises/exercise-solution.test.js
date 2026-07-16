import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExerciseSolution, updateExerciseProblemSolution } from "./exercise-solution.js";

test("normalizeExerciseSolution trims pasted Markdown without changing its body", () => {
  assert.equal(normalizeExerciseSolution("\n  ## Analysis\n\nKeep **Markdown**.\n"), "## Analysis\n\nKeep **Markdown**.");
});

test("updateExerciseProblemSolution changes only the target solution", () => {
  const exerciseSet = {
    version: 1,
    title: "Set",
    problems: [
      { id: "one", title: "One", prompt: "P1", answer: "A1", solution: "Old one" },
      { id: "two", title: "Two", prompt: "P2", answer: "A2", solution: "Old two" },
    ],
  };

  const updated = updateExerciseProblemSolution(exerciseSet, "two", "\nNew **solution**\n");

  assert.notEqual(updated, exerciseSet);
  assert.deepEqual(updated.problems[0], exerciseSet.problems[0]);
  assert.deepEqual(updated.problems[1], {
    id: "two",
    title: "Two",
    prompt: "P2",
    answer: "A2",
    solution: "New **solution**",
  });
  assert.equal(exerciseSet.problems[1].solution, "Old two");
});

test("updateExerciseProblemSolution rejects empty and unknown replacements", () => {
  const exerciseSet = { problems: [{ id: "one", solution: "Old" }] };
  assert.throws(() => updateExerciseProblemSolution(exerciseSet, "one", " \n "), /cannot be empty/);
  assert.throws(() => updateExerciseProblemSolution(exerciseSet, "missing", "New"), /was not found/);
});
