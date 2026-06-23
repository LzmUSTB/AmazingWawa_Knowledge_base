import { EXERCISE_DIFFICULTIES } from "./build-exercise-index.js";

const RESULTS = new Set(["wrong", "hard", "good", "easy"]);
const PRACTICE_RESULTS = new Set(["correct", "wrong"]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

export function exerciseProgressKey(exerciseSetNodeId, problemId) {
  return `${exerciseSetNodeId}/${problemId}`;
}

export function rateExerciseProblem(current = {}, result, now = new Date()) {
  if (!RESULTS.has(result)) throw new Error(`Unsupported exercise result "${result}".`);
  const next = {
    attempts: Number(current.attempts) || 0,
    correctCount: Number(current.correctCount) || 0,
    wrongCount: Number(current.wrongCount) || 0,
    ease: Number.isFinite(Number(current.ease)) ? Number(current.ease) : 2.3,
    intervalDays: Number(current.intervalDays) || 0,
    mastery: Number(current.mastery) || 0,
  };
  next.attempts += 1;
  if (result === "wrong") {
    next.wrongCount += 1;
    next.ease = clamp(next.ease - 0.2, 1.3, 3);
    next.intervalDays = 1;
    next.mastery = clamp(next.mastery - 0.18, 0, 1);
  } else {
    next.correctCount += 1;
    if (result === "hard") {
      next.ease = clamp(next.ease - 0.1, 1.3, 3);
      next.intervalDays = Math.max(1, Math.round(next.intervalDays * 1.2) || 1);
      next.mastery = clamp(next.mastery + 0.08, 0, 1);
    } else if (result === "good") {
      next.ease = clamp(next.ease, 1.3, 3);
      next.intervalDays = Math.max(2, Math.round((next.intervalDays || 1) * next.ease));
      next.mastery = clamp(next.mastery + 0.14, 0, 1);
    } else {
      next.ease = clamp(next.ease + 0.1, 1.3, 3);
      next.intervalDays = Math.max(3, Math.round((next.intervalDays || 1) * next.ease * 1.3));
      next.mastery = clamp(next.mastery + 0.2, 0, 1);
    }
  }
  const timestamp = now instanceof Date ? now : new Date(now);
  const due = new Date(timestamp.getTime() + next.intervalDays * 86400000);
  return {
    ...current,
    mode: "recall",
    ...next,
    ease: rounded(next.ease),
    mastery: rounded(next.mastery),
    lastResult: result,
    recentResults: [...(Array.isArray(current.recentResults) ? current.recentResults : []), result].slice(-10),
    dueAt: due.toISOString(),
    lastAttemptAt: timestamp.toISOString(),
  };
}

export function savePracticeAnswer(current = {}, result, userAnswer = "", now = new Date()) {
  if (!PRACTICE_RESULTS.has(result)) throw new Error(`Unsupported practice result "${result}".`);
  const timestamp = now instanceof Date ? now : new Date(now);
  const nowIso = timestamp.toISOString();
  return {
    mode: "practice",
    exerciseSetNodeId: String(current.exerciseSetNodeId || ""),
    problemId: String(current.problemId || ""),
    lastResult: result,
    result,
    userAnswer: String(userAnswer || ""),
    answeredAt: current.answeredAt || nowIso,
    updatedAt: nowIso,
  };
}

export function exerciseStatus(progress, now = new Date()) {
  if (progress?.mode === "practice") {
    if (!progress?.result) return "new";
    return progress.result === "wrong" ? "wrong" : "completed";
  }
  if (!progress?.attempts) return "new";
  if (progress.dueAt && new Date(progress.dueAt).getTime() <= new Date(now).getTime()) return "due";
  if ((Number(progress.mastery) || 0) < 0.5 || progress.lastResult === "wrong") return "weak";
  return "completed";
}

export function exercisePriority(problem, progress, now = new Date()) {
  const status = exerciseStatus(progress, now);
  const statusWeight = { due: 500, weak: 400, wrong: 450, new: 300, completed: 100 }[status] || 0;
  const masteryWeight = problem?.mode === "practice" ? 0 : Math.round((1 - (Number(progress?.mastery) || 0)) * 100);
  const wrongWeight = progress?.lastResult === "wrong" || progress?.result === "wrong" ? 50 : 0;
  const difficultyWeight = Math.max(0, EXERCISE_DIFFICULTIES.indexOf(problem?.difficulty)) * 5;
  return statusWeight + masteryWeight + wrongWeight + difficultyWeight;
}
