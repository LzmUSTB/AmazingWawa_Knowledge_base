<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import YAML from "yaml";
import {
  exercisePriority,
  exerciseProgressKey,
  exerciseStatus,
  rateExerciseProblem,
  savePracticeAnswer,
} from "@kinjito/protocol";
import { writeWrongPracticeExport, openWrongPracticeFolder } from "../../data/desktop-vault-adapter.js";
import { findGraphNode, useActiveVault } from "../../graph/graph-data-store.js";
import NoteBlockRenderer from "../note/NoteBlockRenderer.vue";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  exerciseNodeId: { type: String, default: "" },
  canSave: { type: Boolean, default: false },
});

const emit = defineEmits(["delete-exercise-problem", "delete-exercise-set", "import-exercise-set", "open-exercises", "open-note", "open-scope", "replace-exercise-solution", "save-progress"]);
const activeVault = useActiveVault();
const expandedProblems = ref(new Set());
const revealedHints = ref({});
const revealedAnswers = ref({});
const revealedSolutions = ref({});
const practiceAnswers = ref({});
const practiceEditing = ref({});
const activeOverviewTab = ref("all");
const domainFilter = ref("all");
const setFilter = ref("all");
const modeFilter = ref("all");
const statusFilter = ref("all");
const difficultyFilter = ref("all");
const typeFilter = ref("all");
const searchFilter = ref("");
const exportBusy = ref(false);
const exportResult = ref(null);
const copiedProblemId = ref("");
const savedSolutionProblemId = ref("");
const solutionEditorProblem = ref(null);
const solutionDraft = ref("");
const solutionSaving = ref(false);
const solutionSaveError = ref("");
const solutionTextarea = ref(null);
const localProgress = ref({ version: 2, problems: {}, errors: [] });
let copyFeedbackTimer = null;
let solutionFeedbackTimer = null;
const LOOSE_TEX_RUN = /\\(?:bar|vec|hat|tilde|overline|underline|mathbf|mathrm|mathit|mathbb|mathcal|frac|sqrt|sum|prod|int|lim|begin|end|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|cdot|times|quad|leq|geq|neq|infty)(?:\s*[A-Za-z0-9_{}^=+\-*/(),.]+)*/g;
const INLINE_MATH_SPAN = /(\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;

watch(
  () => activeVault.value.exerciseProgress,
  (progress) => {
    localProgress.value = {
      version: 2,
      errors: [],
      ...(progress || {}),
      problems: {
        ...(progress?.problems || {}),
        ...(localProgress.value.problems || {}),
      },
    };
    const answerPatch = {};
    Object.entries(localProgress.value.problems || {}).forEach(([key, entry]) => {
      if (entry?.mode === "practice" && practiceAnswers.value[key] === undefined) answerPatch[key] = entry.userAnswer || "";
    });
    if (Object.keys(answerPatch).length) practiceAnswers.value = { ...practiceAnswers.value, ...answerPatch };
  },
  { immediate: true },
);

const exerciseSets = computed(() => activeVault.value.exercises?.all || []);
const currentExerciseSet = computed(() => activeVault.value.exercises?.byNodeId?.[props.exerciseNodeId] || null);
const ownerNode = computed(() => findGraphNode(props.exerciseNodeId));
const nodeSpecific = computed(() => Boolean(props.exerciseNodeId));
const domains = computed(() => activeVault.value.domains || []);
const problemRows = computed(() => exerciseSets.value.flatMap((exerciseSet) => {
  const owner = findGraphNode(exerciseSet.nodeId);
  return exerciseSet.problems.map((problem) => {
    const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
    const progress = localProgress.value.problems?.[key] || null;
    return {
      key,
      exerciseSet,
      owner,
      problem,
      progress,
      status: exerciseStatus(progress),
      priority: exercisePriority(problem, progress),
    };
  });
}));

const filteredRows = computed(() => {
  const query = searchFilter.value.trim().toLowerCase();
  return problemRows.value
    .filter((row) => activeOverviewTab.value !== "memory" || row.problem.mode === "recall")
    .filter((row) => activeOverviewTab.value !== "wrong" || isWrongPractice(row))
    .filter((row) => domainFilter.value === "all" || row.owner?.domain === domainFilter.value)
    .filter((row) => setFilter.value === "all" || row.exerciseSet.nodeId === setFilter.value)
    .filter((row) => modeFilter.value === "all" || row.problem.mode === modeFilter.value)
    .filter((row) => statusFilter.value === "all" || row.status === statusFilter.value)
    .filter((row) => difficultyFilter.value === "all" || row.problem.difficulty === difficultyFilter.value)
    .filter((row) => typeFilter.value === "all" || row.problem.type === typeFilter.value)
    .filter((row) => !query || [row.problem.title, row.problem.id, row.problem.prompt, row.problem.answer, row.problem.solution, row.exerciseSet.title, displayTitle(row.owner, row.exerciseSet.nodeId)]
      .join("\n")
      .toLowerCase()
      .includes(query))
    .sort((a, b) => b.priority - a.priority || a.problem.title.localeCompare(b.problem.title));
});

const stats = computed(() => {
  const rows = filteredRows.value;
  const recallRows = rows.filter((row) => row.problem.mode === "recall");
  const practiceRows = rows.filter((row) => row.problem.mode === "practice");
  const completed = rows.filter((row) => row.problem.mode === "recall" ? row.progress?.attempts : row.progress?.result).length;
  return {
    total: rows.length,
    completed,
    unanswered: rows.length - completed,
    recall: recallRows.length,
    recallDue: recallRows.filter((row) => row.status === "due").length,
    recallNew: recallRows.filter((row) => row.status === "new").length,
    practice: practiceRows.length,
    wrongPractice: practiceRows.filter((row) => isWrongPractice(row)).length,
  };
});

const memoryQueue = computed(() => filteredRows.value
  .filter((row) => row.problem.mode === "recall")
  .filter((row) => ["due", "new"].includes(row.status))
  .sort((a, b) => (a.status === "due" ? -1 : 1) - (b.status === "due" ? -1 : 1) || b.priority - a.priority));
const activeMemoryRow = computed(() => memoryQueue.value[0] || filteredRows.value.find((row) => row.problem.mode === "recall") || null);
const originalSolution = computed(() => String(solutionEditorProblem.value?.solution || "").trim());
const normalizedSolutionDraft = computed(() => solutionDraft.value.trim());
const solutionChanged = computed(() => normalizedSolutionDraft.value !== originalSolution.value);
const canSaveSolution = computed(() => (
  props.canSave
  && !solutionSaving.value
  && Boolean(normalizedSolutionDraft.value)
  && solutionChanged.value
));

function displayTitle(node, fallback = "") {
  return node?.titleLocale || node?.title || node?.id || fallback;
}

function progressFor(exerciseSet, problem) {
  return localProgress.value.problems?.[exerciseProgressKey(exerciseSet.nodeId, problem.id)] || null;
}

function toggleReveal(kind, key) {
  const records = { hints: revealedHints, answers: revealedAnswers, solutions: revealedSolutions };
  const record = records[kind];
  record.value = { ...record.value, [key]: !record.value[key] };
}

function toggleExpanded(key) {
  const next = new Set(expandedProblems.value);
  if (next.has(key)) next.delete(key); else next.add(key);
  expandedProblems.value = next;
}

function patchProgress(key, progressEntry) {
  localProgress.value = {
    version: 2,
    problems: {
      ...(localProgress.value.problems || {}),
      [key]: progressEntry,
    },
  };
  emit("save-progress", { version: 2, problems: { [key]: progressEntry } });
}

function rateRecall(exerciseSet, problem, result) {
  if (!props.canSave) return;
  const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
  const current = localProgress.value.problems?.[key] || {};
  const nextEntry = rateExerciseProblem(current, result);
  patchProgress(key, { ...nextEntry, mode: "recall", exerciseSetNodeId: exerciseSet.nodeId, problemId: problem.id });
}

function ratePractice(exerciseSet, problem, result) {
  if (!props.canSave) return;
  const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
  const current = localProgress.value.problems?.[key] || {};
  const answerText = practiceAnswers.value[key] ?? current.userAnswer ?? "";
  if (!answerText.trim() && !window.confirm("You have not entered an answer. Save empty answer?")) return;
  const nextEntry = savePracticeAnswer({ ...current, exerciseSetNodeId: exerciseSet.nodeId, problemId: problem.id }, result, answerText);
  patchProgress(key, { ...nextEntry, mode: "practice", exerciseSetNodeId: exerciseSet.nodeId, problemId: problem.id });
  practiceEditing.value = { ...practiceEditing.value, [key]: false };
}

function accuracy(progress) {
  const attempts = Number(progress?.attempts) || 0;
  return attempts ? `${Math.round(((Number(progress.correctCount) || 0) / attempts) * 100)}%` : "-";
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function dueLabel(value) {
  if (!value) return "New";
  return new Date(value).toLocaleString();
}

function isWrongPractice(row) {
  if (row.problem.mode !== "practice") return false;
  return row.progress?.result === "wrong";
}

function exerciseCardState(problem, progress) {
  if (problem?.mode === "recall") {
    return { label: "Recall", className: "is-state-recall" };
  }
  if (progress?.result === "correct") {
    return { label: "Practice · Correct", className: "is-state-practice-correct" };
  }
  if (progress?.result === "wrong") {
    return { label: "Practice · Wrong", className: "is-state-practice-wrong" };
  }
  return { label: "Practice · Unanswered", className: "is-state-practice-unanswered" };
}

function exerciseCardStateClass(problem, progress) {
  return exerciseCardState(problem, progress).className;
}

function exerciseCardStateLabel(problem, progress) {
  return exerciseCardState(problem, progress).label;
}

function hasPracticeResult(exerciseSet, problem) {
  return Boolean(progressFor(exerciseSet, problem)?.result);
}

function isPracticeEditing(exerciseSet, problem) {
  const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
  return !hasPracticeResult(exerciseSet, problem) || practiceEditing.value[key];
}

function editPracticeAnswer(exerciseSet, problem) {
  const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
  const progress = progressFor(exerciseSet, problem);
  practiceAnswers.value = { ...practiceAnswers.value, [key]: progress?.userAnswer || "" };
  practiceEditing.value = { ...practiceEditing.value, [key]: true };
}

function exportFilters() {
  return {
    domain: domainFilter.value,
    exerciseSetNodeId: setFilter.value,
    mode: modeFilter.value,
    status: statusFilter.value,
    type: typeFilter.value,
    difficulty: difficultyFilter.value,
    search: searchFilter.value.trim(),
  };
}

function markdownForWrongPracticeExport(exportedAt, filters, items) {
  const filterText = Object.entries(filters).filter(([, value]) => value && value !== "all").map(([key, value]) => `${key}: ${value}`).join(", ") || "none";
  return [
    "# Wrong Practice Export",
    "",
    `Exported at: ${exportedAt}`,
    `Filters: ${filterText}`,
    "",
    ...items.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      `- ExerciseSet: ${item.exerciseSetNodeId}`,
      `- Problem: ${item.problemId}`,
      `- Type: ${item.type}`,
      `- Difficulty: ${item.difficulty}`,
      `- Result: ${item.result}`,
      "",
      "### Prompt",
      "",
      item.prompt,
      "",
      "### User Answer",
      "",
      item.userAnswer || "",
      "",
      "### Reference answer",
      "",
      item.answer,
      "",
      "### Solution",
      "",
      item.solution,
      "",
    ]),
  ].join("\n");
}

async function exportWrongPractice() {
  const items = filteredRows.value
    .filter(isWrongPractice)
    .map((row) => ({
      exerciseSetNodeId: row.exerciseSet.nodeId,
      problemId: row.problem.id,
      domain: row.owner?.domain || "",
      ownerNodeTitle: displayTitle(row.owner, row.exerciseSet.nodeId),
      title: row.problem.title,
      type: row.problem.type,
      difficulty: row.problem.difficulty,
      prompt: row.problem.prompt,
      answer: row.problem.answer,
      solution: row.problem.solution,
      userAnswer: row.progress?.userAnswer || "",
      result: row.progress?.result || "",
      answeredAt: row.progress?.answeredAt || "",
      updatedAt: row.progress?.updatedAt || "",
    }));
  if (!items.length) {
    window.alert("No wrong practice problems match the current filters.");
    return;
  }
  const exportedAt = new Date().toISOString();
  const filters = exportFilters();
  const yamlContent = YAML.stringify({ version: 1, kind: "wrong-practice-export", exportedAt, filters, items });
  const markdownContent = markdownForWrongPracticeExport(exportedAt, filters, items);
  exportBusy.value = true;
  try {
    exportResult.value = {
      ...(await writeWrongPracticeExport(activeVault.value.vaultRootPath, yamlContent, markdownContent, exportedAt)),
      markdownContent,
    };
  } catch (error) {
    console.error("[exercises] Failed to export wrong practice.", error);
    window.alert(`Failed to export wrong practice: ${error?.message || error}`);
  } finally {
    exportBusy.value = false;
  }
}

async function copyExportMarkdown() {
  if (!exportResult.value?.markdownContent) return;
  await navigator.clipboard?.writeText(exportResult.value.markdownContent);
}

function exerciseMarkdown(problem = {}) {
  const hints = Array.isArray(problem.hints) ? problem.hints.filter((hint) => String(hint || "").trim()) : [];
  return [
    `# ${problem.title || problem.id || "Exercise"}`,
    "",
    "## 题目",
    "",
    String(problem.prompt || "").trim(),
    "",
    "## 提示",
    "",
    ...(hints.length
      ? hints.flatMap((hint, index) => [`${index + 1}. ${String(hint).trim()}`, ""])
      : ["无", ""]),
    "## 答案",
    "",
    String(problem.answer || "").trim(),
    "",
    "## 解析",
    "",
    String(problem.solution || "").trim(),
    "",
  ].join("\n");
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard API is unavailable.");
}

async function copyExercise(problem) {
  try {
    await writeClipboardText(exerciseMarkdown(problem));
    copiedProblemId.value = problem.id;
    if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = window.setTimeout(() => {
      copiedProblemId.value = "";
      copyFeedbackTimer = null;
    }, 1800);
  } catch (error) {
    console.error("[exercises] Failed to copy exercise.", error);
    window.alert(`Failed to copy exercise: ${error?.message || error}`);
  }
}

function openSolutionEditor(problem) {
  solutionEditorProblem.value = problem;
  solutionDraft.value = String(problem.solution || "").trim();
  solutionSaveError.value = "";
  solutionSaving.value = false;
  nextTick(() => solutionTextarea.value?.focus());
}

function closeSolutionEditor(force = false) {
  if (solutionSaving.value) return;
  if (!force && solutionChanged.value && !window.confirm("Discard the unsaved replacement solution?")) return;
  solutionEditorProblem.value = null;
  solutionDraft.value = "";
  solutionSaveError.value = "";
}

function handleSolutionEditorKeydown(event) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closeSolutionEditor();
}

function saveReplacementSolution() {
  if (!canSaveSolution.value || !solutionEditorProblem.value) return;
  solutionSaving.value = true;
  solutionSaveError.value = "";
  const problemId = solutionEditorProblem.value.id;
  emit("replace-exercise-solution", {
    nodeId: props.exerciseNodeId,
    problemId,
    solution: normalizedSolutionDraft.value,
    onResult: ({ ok, error } = {}) => {
      solutionSaving.value = false;
      if (!ok) {
        solutionSaveError.value = error || "Failed to save the replacement solution.";
        return;
      }
      closeSolutionEditor(true);
      savedSolutionProblemId.value = problemId;
      if (solutionFeedbackTimer) window.clearTimeout(solutionFeedbackTimer);
      solutionFeedbackTimer = window.setTimeout(() => {
        savedSolutionProblemId.value = "";
        solutionFeedbackTimer = null;
      }, 1800);
    },
  });
}

onBeforeUnmount(() => {
  if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer);
  if (solutionFeedbackTimer) window.clearTimeout(solutionFeedbackTimer);
});

async function openExportFolder() {
  await openWrongPracticeFolder(activeVault.value.vaultRootPath);
}

function looksLikeFormulaOnlyLine(line = "") {
  const trimmed = line.trim();
  if (!trimmed || /[\u3040-\u30ff\u3400-\u9fff]/.test(trimmed)) return false;
  LOOSE_TEX_RUN.lastIndex = 0;
  const hasTexCommand = LOOSE_TEX_RUN.test(trimmed);
  LOOSE_TEX_RUN.lastIndex = 0;
  return hasTexCommand;
}

function normalizeLooseMathText(value = "") {
  return value.replace(LOOSE_TEX_RUN, (match) => {
    const leading = match.match(/^\s*/)?.[0] || "";
    const trailing = match.match(/\s*$/)?.[0] || "";
    const body = match.trim();
    return body ? `${leading}\\(${body}\\)${trailing}` : match;
  });
}

function normalizeLooseExerciseMath(markdown = "") {
  let inCodeFence = false;
  let inDisplayMath = false;
  return String(markdown || "").split(/\r?\n/).map((line) => {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      return line;
    }
    if (inCodeFence || !line.includes("\\")) return line;
    const normalizedLine = line.replace(/\\\\([()[\]])/g, "\\$1");
    if (inDisplayMath) {
      if (normalizedLine.includes("\\]")) inDisplayMath = false;
      return normalizedLine;
    }
    if (normalizedLine.includes("\\[")) {
      if (!normalizedLine.includes("\\]")) inDisplayMath = true;
      return normalizedLine;
    }
    const hasInlineMath = INLINE_MATH_SPAN.test(normalizedLine);
    INLINE_MATH_SPAN.lastIndex = 0;
    if (!hasInlineMath && looksLikeFormulaOnlyLine(normalizedLine)) {
      const leading = normalizedLine.match(/^\s*/)?.[0] || "";
      const trailing = normalizedLine.match(/\s*$/)?.[0] || "";
      return `${leading}\\(${normalizedLine.trim()}\\)${trailing}`;
    }
    return normalizedLine.split(INLINE_MATH_SPAN).map((part, index) => {
      if (index % 2) return part;
      return normalizeLooseMathText(part);
    }).join("");
  }).join("\n");
}
</script>

<template>
  <section class="exercises-view technical-grid">
    <header class="exercises-header">
      <div class="exercises-heading">
        <AppIcon name="exercise" :size="22" />
        <div>
          <div class="section-kicker">Exercises</div>
          <h1>{{ nodeSpecific ? (currentExerciseSet?.title || `${displayTitle(ownerNode, exerciseNodeId)} Exercises`) : "Exercises Overview" }}</h1>
          <p v-if="currentExerciseSet?.summary">{{ currentExerciseSet.summary }}</p>
        </div>
      </div>
      <div v-if="nodeSpecific" class="header-actions">
        <button v-if="currentExerciseSet" class="hud-button button-with-icon" type="button" style="--button-color: var(--simulation)" @click="$emit('open-note', exerciseNodeId)">
          <AppIcon name="file-text" /><span class="button-icon-label">Open Note</span>
        </button>
        <button class="hud-button button-with-icon" type="button" :disabled="!canSave" style="--button-color: var(--career)" @click="$emit('import-exercise-set', exerciseNodeId)">
          <AppIcon name="import" /><span class="button-icon-label">Import ExerciseSet</span>
        </button>
        <button v-if="currentExerciseSet" class="hud-button button-with-icon" type="button" style="--button-color: var(--game-dev)" @click="$emit('delete-exercise-set', exerciseNodeId)">
          <AppIcon name="delete" /><span class="button-icon-label">Delete ExerciseSet</span>
        </button>
      </div>
    </header>

    <div v-if="nodeSpecific && !currentExerciseSet" class="exercise-empty">
      <h2>No ExerciseSet for this node.</h2>
      <p>Import an exercises.yaml file to attach an ExerciseSet to this node.</p>
    </div>

    <template v-else-if="nodeSpecific && currentExerciseSet">
      <section class="exercise-scope">
        <div v-for="(items, label) in {
          Coverage: currentExerciseSet.scope.coverageNodeIds,
          Prerequisites: currentExerciseSet.scope.prerequisiteNodeIds,
          Related: currentExerciseSet.scope.relatedNodeIds,
        }" :key="label" class="scope-group">
          <strong>{{ label }}</strong>
          <div class="scope-links">
            <button v-for="nodeId in items" :key="nodeId" type="button" @click="$emit('open-scope', nodeId)">
              {{ displayTitle(findGraphNode(nodeId), nodeId) }}
            </button>
            <span v-if="!items.length">None</span>
          </div>
        </div>
      </section>

      <div v-if="currentExerciseSet.errors.length" class="exercise-errors">
        <strong>ExerciseSet validation errors</strong>
        <p v-for="error in currentExerciseSet.errors" :key="error">{{ error }}</p>
      </div>

      <div class="problem-list">
        <article v-for="(problem, index) in currentExerciseSet.problems" :key="problem.id" class="problem-panel"
          :class="[`is-${problem.mode}`, exerciseCardStateClass(problem, progressFor(currentExerciseSet, problem))]">
          <header class="problem-header">
            <div><span>Problem {{ String(index + 1).padStart(2, "0") }}</span><h2>{{ problem.title || problem.id }}</h2></div>
            <div class="problem-header-actions">
              <span class="problem-state-label" :class="exerciseCardStateClass(problem, progressFor(currentExerciseSet, problem))">
                {{ exerciseCardStateLabel(problem, progressFor(currentExerciseSet, problem)) }}
              </span>
              <div class="problem-tags"><span>{{ problem.mode }}</span><span>{{ problem.type }}</span><span>{{ problem.difficulty }}</span></div>
              <button v-if="problem.mode === 'practice' && hasPracticeResult(currentExerciseSet, problem)" class="problem-edit" type="button" title="Edit saved answer"
                @click="editPracticeAnswer(currentExerciseSet, problem)">
                <AppIcon name="edit" :size="15" />
              </button>
              <button class="problem-copy" :class="{ 'is-copied': copiedProblemId === problem.id }" type="button"
                :title="copiedProblemId === problem.id ? 'Exercise copied' : 'Copy complete exercise as Markdown'"
                :aria-label="copiedProblemId === problem.id ? 'Exercise copied' : 'Copy complete exercise as Markdown'"
                @click="copyExercise(problem)">
                <AppIcon :name="copiedProblemId === problem.id ? 'check' : 'file-text'" :size="15" />
              </button>
              <button class="problem-solution-edit" :class="{ 'is-saved': savedSolutionProblemId === problem.id }"
                type="button" :disabled="!canSave"
                :title="savedSolutionProblemId === problem.id ? 'Replacement solution saved' : 'Replace solution'"
                :aria-label="savedSolutionProblemId === problem.id ? 'Replacement solution saved' : 'Replace solution'"
                @click="openSolutionEditor(problem)">
                <AppIcon :name="savedSolutionProblemId === problem.id ? 'check' : 'file-plus'" :size="15" />
              </button>
              <button class="problem-delete" type="button" :disabled="!canSave" title="Delete problem"
                @click="$emit('delete-exercise-problem', { nodeId: exerciseNodeId, problemId: problem.id })">
                <AppIcon name="delete" :size="15" />
              </button>
            </div>
          </header>
          <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.prompt)" :block-registry="activeVault.blockRegistry"
            :node="ownerNode" :vault-root-path="activeVault.vaultRootPath" />
          <section v-if="problem.mode === 'practice' && hasPracticeResult(currentExerciseSet, problem) && !isPracticeEditing(currentExerciseSet, problem)" class="practice-saved">
            <div><strong>Saved as {{ progressFor(currentExerciseSet, problem)?.result === 'correct' ? 'Correct' : 'Wrong' }}</strong><span>Last updated: {{ progressFor(currentExerciseSet, problem)?.updatedAt || progressFor(currentExerciseSet, problem)?.answeredAt }}</span></div>
            <pre>{{ progressFor(currentExerciseSet, problem)?.userAnswer || "No answer text saved." }}</pre>
          </section>
          <label v-else-if="problem.mode === 'practice'" class="practice-answer">
            <span>Your Answer</span>
            <textarea v-model="practiceAnswers[exerciseProgressKey(currentExerciseSet.nodeId, problem.id)]" rows="6" placeholder="Write your answer before checking the reference." />
          </label>
          <div class="reveal-actions">
            <button v-if="problem.hints.length" class="hud-button" type="button" @click="toggleReveal('hints', problem.id)">{{ revealedHints[problem.id] ? "Hide Hint" : "Show Hint" }}</button>
            <button class="hud-button" type="button" @click="toggleReveal('answers', problem.id)">{{ revealedAnswers[problem.id] ? "Hide Answer" : "Show Answer" }}</button>
            <button class="hud-button" type="button" @click="toggleReveal('solutions', problem.id)">{{ revealedSolutions[problem.id] ? "Hide Solution" : "Show Solution" }}</button>
          </div>
          <section v-if="revealedHints[problem.id]" class="reveal-panel"><strong>Hints</strong><NoteBlockRenderer v-for="(hint, hintIndex) in problem.hints" :key="hintIndex" :markdown="normalizeLooseExerciseMath(hint)" /></section>
          <section v-if="revealedAnswers[problem.id]" class="reveal-panel"><strong>Answer</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.answer)" /></section>
          <section v-if="revealedSolutions[problem.id]" class="reveal-panel"><strong>Solution</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.solution)" /></section>
          <footer class="rating-row">
            <div v-if="problem.mode === 'recall'"><span>Mastery {{ percent(progressFor(currentExerciseSet, problem)?.mastery) }}</span><span>Accuracy {{ accuracy(progressFor(currentExerciseSet, problem)) }}</span></div>
            <div v-else><span>{{ progressFor(currentExerciseSet, problem)?.result ? `Saved as ${progressFor(currentExerciseSet, problem)?.result}` : "Unanswered" }}</span><span v-if="progressFor(currentExerciseSet, problem)?.updatedAt">Last updated {{ progressFor(currentExerciseSet, problem)?.updatedAt }}</span></div>
            <div v-if="problem.mode === 'recall'" class="rating-actions">
              <button type="button" :disabled="!canSave" class="rate-wrong" @click="rateRecall(currentExerciseSet, problem, 'wrong')"><AppIcon name="emoji-wrong" :size="14" />Wrong</button>
              <button type="button" :disabled="!canSave" class="rate-hard" @click="rateRecall(currentExerciseSet, problem, 'hard')"><AppIcon name="emoji-hard" :size="14" />Hard</button>
              <button type="button" :disabled="!canSave" class="rate-good" @click="rateRecall(currentExerciseSet, problem, 'good')"><AppIcon name="emoji-good" :size="14" />Good</button>
              <button type="button" :disabled="!canSave" class="rate-easy" @click="rateRecall(currentExerciseSet, problem, 'easy')"><AppIcon name="emoji-easy" :size="14" />Easy</button>
            </div>
            <div v-else-if="isPracticeEditing(currentExerciseSet, problem)" class="rating-actions">
              <button type="button" :disabled="!canSave" class="rate-wrong" @click="ratePractice(currentExerciseSet, problem, 'wrong')"><AppIcon name="emoji-wrong" :size="14" />Wrong</button>
              <button type="button" :disabled="!canSave" class="rate-easy" @click="ratePractice(currentExerciseSet, problem, 'correct')"><AppIcon name="check" :size="14" />Correct</button>
            </div>
          </footer>
        </article>
      </div>
    </template>

    <template v-else>
      <nav class="exercise-tabs" aria-label="Exercise sections">
        <button type="button" :class="{ 'is-active': activeOverviewTab === 'all' }" @click="activeOverviewTab = 'all'">All Exercises</button>
        <button type="button" :class="{ 'is-active': activeOverviewTab === 'memory' }" @click="activeOverviewTab = 'memory'">Memory Mode</button>
        <button type="button" :class="{ 'is-active': activeOverviewTab === 'wrong' }" @click="activeOverviewTab = 'wrong'">Wrong Practice</button>
      </nav>
      <section class="stats-grid">
        <div><strong>{{ stats.total }}</strong><span>Total</span></div><div><strong>{{ stats.completed }}</strong><span>Completed</span></div>
        <div><strong>{{ stats.unanswered }}</strong><span>Unanswered</span></div><div><strong>{{ stats.recall }}</strong><span>Recall</span></div>
        <div><strong>{{ stats.recallDue }}</strong><span>Recall Due</span></div><div><strong>{{ stats.recallNew }}</strong><span>Recall New</span></div>
        <div><strong>{{ stats.practice }}</strong><span>Practice</span></div>
        <div><strong>{{ stats.wrongPractice }}</strong><span>Wrong Practice</span></div>
      </section>
      <section class="exercise-filters">
        <label><span>Domain</span><select v-model="domainFilter"><option value="all">All Domains</option><option v-for="domain in domains" :key="domain.id" :value="domain.id">{{ domain.titleLocale || domain.title || domain.id }}</option></select></label>
        <label><span>ExerciseSet</span><select v-model="setFilter"><option value="all">All ExerciseSets</option><option v-for="set in exerciseSets" :key="set.nodeId" :value="set.nodeId">{{ set.title }} / {{ set.nodeId }}</option></select></label>
        <label><span>Mode</span><select v-model="modeFilter"><option value="all">All</option><option value="recall">Recall</option><option value="practice">Practice</option></select></label>
        <label><span>Status</span><select v-model="statusFilter"><option v-for="status in ['all','due','new','weak','wrong','completed']" :key="status" :value="status">{{ status }}</option></select></label>
        <label><span>Difficulty</span><select v-model="difficultyFilter"><option value="all">All</option><option v-for="difficulty in ['introductory','undergraduate','undergraduate-advanced','graduate','research-oriented']" :key="difficulty">{{ difficulty }}</option></select></label>
        <label><span>Type</span><select v-model="typeFilter"><option value="all">All</option><option v-for="type in ['conceptual','calculation','proof','derivation','application','comparison','implementation','diagnostic']" :key="type">{{ type }}</option></select></label>
        <label class="search-filter"><span>Search</span><input v-model="searchFilter" type="search" placeholder="Filter problems" /></label>
        <button v-if="activeOverviewTab === 'wrong'" class="hud-button button-with-icon export-wrong-button" type="button" :disabled="exportBusy" @click="exportWrongPractice">
          <AppIcon name="export" /><span class="button-icon-label">Export Wrong Practice</span>
        </button>
      </section>
      <section v-if="exportResult" class="export-result">
        <strong>Exported wrong practice context</strong>
        <span>{{ exportResult.yamlPath }}</span>
        <span>{{ exportResult.markdownPath }}</span>
        <div>
          <button class="hud-button" type="button" @click="openExportFolder">Open Folder</button>
          <button class="hud-button" type="button" @click="copyExportMarkdown">Copy Markdown</button>
        </div>
      </section>
      <section v-if="activeOverviewTab === 'memory'" class="memory-review">
        <article v-if="activeMemoryRow" class="problem-panel is-recall memory-card" :class="exerciseCardStateClass(activeMemoryRow.problem, activeMemoryRow.progress)">
          <header class="problem-header">
            <div><span>{{ activeMemoryRow.status }} recall</span><h2>{{ activeMemoryRow.problem.title || activeMemoryRow.problem.id }}</h2></div>
            <div class="problem-header-actions">
              <span class="problem-state-label" :class="exerciseCardStateClass(activeMemoryRow.problem, activeMemoryRow.progress)">
                {{ exerciseCardStateLabel(activeMemoryRow.problem, activeMemoryRow.progress) }}
              </span>
              <div class="problem-tags"><span>{{ activeMemoryRow.problem.type }}</span><span>{{ activeMemoryRow.problem.difficulty }}</span></div>
            </div>
          </header>
          <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(activeMemoryRow.problem.prompt)" :block-registry="activeVault.blockRegistry"
            :node="activeMemoryRow.owner" :vault-root-path="activeVault.vaultRootPath" />
          <div class="reveal-actions">
            <button class="hud-button" type="button" @click="toggleReveal('answers', activeMemoryRow.key)">{{ revealedAnswers[activeMemoryRow.key] ? "Hide Answer" : "Show Answer" }}</button>
            <button class="hud-button" type="button" @click="toggleReveal('solutions', activeMemoryRow.key)">{{ revealedSolutions[activeMemoryRow.key] ? "Hide Solution" : "Show Solution" }}</button>
          </div>
          <section v-if="revealedAnswers[activeMemoryRow.key]" class="reveal-panel"><strong>Answer</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(activeMemoryRow.problem.answer)" /></section>
          <section v-if="revealedSolutions[activeMemoryRow.key]" class="reveal-panel"><strong>Solution</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(activeMemoryRow.problem.solution)" /></section>
          <footer class="rating-row">
            <div><span>Queue {{ memoryQueue.length }}</span><span>Mastery {{ percent(activeMemoryRow.progress?.mastery) }}</span></div>
            <div class="rating-actions">
              <button type="button" :disabled="!canSave" class="rate-wrong" @click="rateRecall(activeMemoryRow.exerciseSet, activeMemoryRow.problem, 'wrong')"><AppIcon name="emoji-wrong" :size="14" />Wrong</button>
              <button type="button" :disabled="!canSave" class="rate-hard" @click="rateRecall(activeMemoryRow.exerciseSet, activeMemoryRow.problem, 'hard')"><AppIcon name="emoji-hard" :size="14" />Hard</button>
              <button type="button" :disabled="!canSave" class="rate-good" @click="rateRecall(activeMemoryRow.exerciseSet, activeMemoryRow.problem, 'good')"><AppIcon name="emoji-good" :size="14" />Good</button>
              <button type="button" :disabled="!canSave" class="rate-easy" @click="rateRecall(activeMemoryRow.exerciseSet, activeMemoryRow.problem, 'easy')"><AppIcon name="emoji-easy" :size="14" />Easy</button>
            </div>
          </footer>
        </article>
        <p v-else class="no-results">No recall cards due under current filters.</p>
      </section>
      <div v-else class="overview-list">
        <article v-for="row in filteredRows" :key="row.key" class="overview-row" :class="exerciseCardStateClass(row.problem, row.progress)">
          <button class="overview-main" type="button" @click="toggleExpanded(row.key)">
            <span class="status-mark" :class="`is-${row.status}`"></span>
            <span>
              <strong>{{ row.problem.title || row.problem.id }}</strong>
              <span class="problem-state-label overview-state-label" :class="exerciseCardStateClass(row.problem, row.progress)">
                {{ exerciseCardStateLabel(row.problem, row.progress) }}
              </span>
              <small>{{ row.problem.mode }} / {{ row.exerciseSet.title }} / {{ displayTitle(row.owner, row.exerciseSet.nodeId) }}</small>
            </span>
          </button>
          <div class="overview-meta"><span>{{ row.owner?.domain || '-' }}</span><span>{{ row.problem.mode }}</span><span>{{ row.problem.type }}</span><span>{{ row.problem.difficulty }}</span><span>{{ row.problem.mode === 'recall' ? percent(row.progress?.mastery) : (row.progress?.result || 'unanswered') }}</span><span>{{ row.problem.mode === 'recall' ? accuracy(row.progress) : (row.progress?.updatedAt || row.progress?.answeredAt || 'new') }}</span><span>{{ row.problem.mode === 'recall' ? dueLabel(row.progress?.dueAt) : (row.progress?.userAnswer || '').slice(0, 40) }}</span><span>{{ row.progress?.result || row.progress?.lastResult || 'new' }}</span></div>
          <div v-if="expandedProblems.has(row.key)" class="overview-expanded">
            <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(row.problem.prompt)" />
            <button class="hud-button button-with-icon" type="button" @click="$emit('open-exercises', row.exerciseSet.nodeId)"><AppIcon name="exercise" /><span class="button-icon-label">Open ExerciseSet</span></button>
          </div>
        </article>
        <p v-if="!filteredRows.length" class="no-results">No problems match these filters.</p>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="solutionEditorProblem" class="solution-editor-overlay" @click.self="closeSolutionEditor()"
        @keydown="handleSolutionEditorKeydown">
        <section class="solution-editor-dialog" role="dialog" aria-modal="true"
          :aria-labelledby="`solution-editor-title-${solutionEditorProblem.id}`">
          <header class="solution-editor-header">
            <div>
              <span>Replace Solution</span>
              <h2 :id="`solution-editor-title-${solutionEditorProblem.id}`">{{ solutionEditorProblem.title || solutionEditorProblem.id }}</h2>
              <p>Paste Markdown generated elsewhere. Only this exercise's solution will be replaced.</p>
            </div>
            <button type="button" title="Close" aria-label="Close solution editor" :disabled="solutionSaving"
              @click="closeSolutionEditor()">
              <AppIcon name="x" :size="16" />
            </button>
          </header>

          <details class="original-solution">
            <summary>View original solution</summary>
            <div class="original-solution-content">
              <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(originalSolution)"
                :block-registry="activeVault.blockRegistry" :node="ownerNode"
                :vault-root-path="activeVault.vaultRootPath" />
            </div>
          </details>

          <div class="solution-editor-grid">
            <label class="solution-editor-input">
              <span>Replacement Markdown</span>
              <textarea ref="solutionTextarea" v-model="solutionDraft" rows="20"
                placeholder="Paste the replacement solution here. Use Ctrl+A, then Ctrl+V to overwrite the original text." />
            </label>
            <section class="solution-editor-preview">
              <span>Rendered Preview</span>
              <div class="solution-preview-content">
                <NoteBlockRenderer v-if="normalizedSolutionDraft"
                  :markdown="normalizeLooseExerciseMath(solutionDraft)"
                  :block-registry="activeVault.blockRegistry" :node="ownerNode"
                  :vault-root-path="activeVault.vaultRootPath" />
                <p v-else class="solution-preview-empty">Paste a solution to preview its rendered result.</p>
              </div>
            </section>
          </div>

          <p v-if="solutionSaveError" class="solution-save-error">{{ solutionSaveError }}</p>
          <footer class="solution-editor-footer">
            <span v-if="!normalizedSolutionDraft">Solution cannot be empty.</span>
            <span v-else-if="!solutionChanged">Make a change before saving.</span>
            <span v-else>Ready to replace the saved solution.</span>
            <div>
              <button class="hud-button button-with-icon" type="button" :disabled="solutionSaving"
                @click="closeSolutionEditor()">
                <AppIcon name="x" /><span class="button-icon-label">Cancel</span>
              </button>
              <button class="hud-button button-with-icon" type="button" :disabled="!canSaveSolution"
                style="--button-color: var(--career)" @click="saveReplacementSolution">
                <AppIcon name="save" /><span class="button-icon-label">{{ solutionSaving ? "Saving..." : "Replace Solution" }}</span>
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.exercises-view { flex: 1; min-width: 0; min-height: 0; overflow: auto; padding: 24px; color: var(--text-secondary); }
.exercises-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border: 1px solid var(--border-primary); border-left: 5px solid var(--career); background: var(--background-panel); padding: 20px; }
.exercises-heading { display: flex; align-items: flex-start; gap: 14px; min-width: 0; color: var(--career); }
.exercises-heading h1 { margin: 4px 0 0; color: var(--text-primary); font-size: var(--font-size-title); }
.exercises-heading p { margin: 8px 0 0; color: var(--text-secondary); }
.header-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.section-kicker, .problem-header span, label > span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.exercise-empty, .exercise-errors, .export-result { margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); padding: 22px; }
.exercise-scope { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); }
.scope-group { min-width: 0; padding: 14px; border-right: 1px solid var(--border-muted); }
.scope-group:last-child { border-right: 0; }
.scope-links { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.scope-links button { border: 1px solid var(--border-muted); border-radius: 0; background: var(--background-main); color: var(--text-secondary); cursor: pointer; padding: 5px 7px; }
.exercise-errors { border-color: var(--game-dev); color: var(--game-dev); }
.exercise-errors p { margin: 6px 0 0; }
.problem-list { display: grid; gap: 18px; margin-top: 18px; }
.problem-panel { border: 1px solid var(--border-primary); background: var(--background-main); padding: 18px; }
.problem-panel.is-practice { border-left: 5px solid var(--career); }
.problem-panel.is-recall { border-left: 5px solid var(--simulation); }
.problem-panel.is-state-practice-unanswered { border-left-color: var(--graphics); }
.problem-panel.is-state-practice-correct { border-left-color: var(--career); }
.problem-panel.is-state-practice-wrong { border-left-color: var(--game-dev); }
.problem-header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-muted); margin-bottom: 18px; padding-bottom: 12px; }
.problem-header h2 { margin: 5px 0 0; color: var(--text-primary); font-size: var(--font-size-subtitle); }
.problem-header-actions { display: flex; align-items: flex-start; gap: 8px; }
.problem-delete, .problem-edit, .problem-copy, .problem-solution-edit { display: grid; flex: 0 0 30px; place-items: center; width: 30px; height: 30px; border: 1px solid var(--game-dev); border-radius: 0; background: transparent; color: var(--game-dev); cursor: pointer; padding: 0; }
.problem-edit { border-color: var(--career); color: var(--career); }
.problem-copy { border-color: var(--tools); color: var(--tools); }
.problem-copy.is-copied { border-color: var(--career); color: var(--career); }
.problem-solution-edit { border-color: var(--simulation); color: var(--simulation); }
.problem-solution-edit.is-saved { border-color: var(--career); color: var(--career); }
.problem-delete:hover:not(:disabled) { background: color-mix(in srgb, var(--game-dev) 14%, transparent); }
.problem-edit:hover, .problem-copy.is-copied:hover, .problem-solution-edit.is-saved:hover { background: color-mix(in srgb, var(--career) 14%, transparent); }
.problem-copy:hover:not(.is-copied) { background: color-mix(in srgb, var(--tools) 14%, transparent); }
.problem-solution-edit:hover:not(.is-saved):not(:disabled) { background: color-mix(in srgb, var(--simulation) 14%, transparent); }
.problem-delete:disabled, .problem-solution-edit:disabled { opacity: .4; cursor: not-allowed; }
.problem-tags, .rating-row > div, .rating-actions, .reveal-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.problem-tags span { border: 1px solid var(--border-muted); padding: 5px 7px; color: var(--text-muted); font-size: var(--font-size-small); text-transform: uppercase; }
.problem-state-label { display: inline-flex; align-items: center; min-height: 30px; border: 1px solid currentColor; background: color-mix(in srgb, currentColor 10%, transparent); color: var(--exercise-state-color, var(--text-muted)); font-size: var(--font-size-small); font-weight: 900; letter-spacing: .02em; padding: 5px 8px; text-transform: uppercase; white-space: nowrap; }
.problem-state-label.is-state-recall { --exercise-state-color: var(--simulation); }
.problem-state-label.is-state-practice-unanswered { --exercise-state-color: var(--graphics); }
.problem-state-label.is-state-practice-correct { --exercise-state-color: var(--career); }
.problem-state-label.is-state-practice-wrong { --exercise-state-color: var(--game-dev); }
.practice-answer { display: grid; gap: 8px; margin-top: 16px; }
.practice-answer textarea, .search-filter input { width: 100%; border: 1px solid var(--border-muted); border-radius: 0; background: var(--background-main); color: var(--text-primary); font: inherit; line-height: 1.5; padding: 10px; resize: vertical; }
.practice-saved { display: grid; gap: 10px; margin-top: 16px; border: 1px solid var(--border-muted); border-left: 4px solid var(--career); background: var(--background-panel); padding: 12px; }
.practice-saved div { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text-muted); }
.practice-saved strong { color: var(--text-primary); }
.practice-saved pre { overflow: auto; max-height: 180px; margin: 0; white-space: pre-wrap; color: var(--text-secondary); font: inherit; }
.reveal-actions { margin-top: 16px; }
.reveal-panel { margin-top: 10px; border-left: 4px solid var(--career); background: var(--background-panel); padding: 14px; }
.rating-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--border-muted); margin-top: 16px; padding-top: 14px; }
.rating-actions { gap: 0; }
.rating-actions button { display: inline-flex; align-items: center; gap: 5px; border: 0; border-left: 1px solid var(--border-muted); border-radius: 0; background: transparent; color: var(--text-muted); cursor: pointer; padding: 7px 10px; }
.rating-actions button:first-child { border-left: 0; }
.rating-actions button:hover:not(:disabled) { color: var(--exercise-rate-color, var(--career)); background: color-mix(in srgb, var(--exercise-rate-color, var(--career)) 10%, transparent); }
.rating-actions .rate-wrong { --exercise-rate-color: #ff3b30; }
.rating-actions .rate-hard { --exercise-rate-color: #ff8f1f; }
.rating-actions .rate-good { --exercise-rate-color: #b8ff12; }
.rating-actions .rate-easy { --exercise-rate-color: #39ff14; }
.rating-actions button:disabled { cursor: not-allowed; opacity: .4; }
.exercise-tabs { display: flex; flex-wrap: wrap; gap: 0; margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); }
.exercise-tabs button { border: 0; border-right: 1px solid var(--border-muted); border-radius: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: 900; padding: 12px 16px; text-transform: uppercase; }
.exercise-tabs button.is-active, .exercise-tabs button:hover { background: var(--background-main); color: var(--career); }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); }
.stats-grid div { display: grid; gap: 4px; border-right: 1px solid var(--border-muted); border-bottom: 1px solid var(--border-muted); padding: 14px; }
.stats-grid strong { color: var(--text-primary); font-size: var(--font-size-subtitle); }
.stats-grid span { color: var(--text-muted); font-size: var(--font-size-small); text-transform: uppercase; }
.exercise-filters { display: grid; grid-template-columns: repeat(8, minmax(120px, 1fr)); gap: 10px; margin-top: 14px; border: 1px solid var(--border-primary); background: var(--background-panel); padding: 14px; }
.exercise-filters label { display: grid; gap: 6px; min-width: 0; }
.exercise-filters select { min-width: 0; width: 100%; border: 1px solid var(--border-muted); border-radius: 0; background: var(--background-main); color: var(--text-primary); padding: 8px; }
.search-filter { grid-column: span 2; }
.export-wrong-button { align-self: end; justify-content: center; }
.export-result { display: grid; gap: 8px; border-left: 5px solid var(--career); }
.export-result span { color: var(--text-muted); font-family: var(--font-mono); }
.export-result div { display: flex; gap: 8px; flex-wrap: wrap; }
.overview-list { display: grid; gap: 8px; margin-top: 14px; }
.memory-review { display: grid; margin-top: 14px; }
.memory-card { max-width: 920px; margin: 0 auto; width: 100%; }
.overview-row { display: grid; grid-template-columns: minmax(260px, 1.3fr) minmax(520px, 1fr); border: 1px solid var(--border-muted); background: var(--background-panel); }
.overview-main { display: grid; grid-template-columns: 8px minmax(0, 1fr); gap: 10px; align-items: center; min-width: 0; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); cursor: pointer; padding: 12px; text-align: left; }
.overview-main span:last-child { display: grid; min-width: 0; }
.overview-main strong, .overview-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-main small { margin-top: 4px; color: var(--text-muted); }
.overview-state-label { justify-self: start; min-height: 22px; margin-top: 6px; padding: 3px 6px; }
.status-mark { width: 5px; height: 100%; background: var(--text-muted); }
.status-mark.is-due, .status-mark.is-weak, .status-mark.is-wrong { background: var(--game-dev); }.status-mark.is-new { background: var(--graphics); }.status-mark.is-completed { background: var(--career); }
.overview-meta { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); align-items: center; border-left: 1px solid var(--border-muted); color: var(--text-muted); font-size: var(--font-size-small); text-align: center; }
.overview-meta span { overflow: hidden; padding: 8px 5px; text-overflow: ellipsis; white-space: nowrap; }
.overview-expanded { grid-column: 1 / -1; border-top: 1px solid var(--border-muted); padding: 16px; }
.no-results { border: 1px solid var(--border-muted); background: var(--background-panel); padding: 18px; }
.solution-editor-overlay { position: fixed; z-index: 1200; inset: 0; display: grid; place-items: center; background: rgb(0 0 0 / 72%); padding: 24px; }
.solution-editor-dialog { display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto auto; width: min(1180px, calc(100vw - 48px)); max-height: calc(100vh - 48px); overflow: hidden; border: 1px solid var(--border-primary); border-left: 5px solid var(--simulation); background: var(--background-panel); box-shadow: 0 24px 80px rgb(0 0 0 / 48%); color: var(--text-secondary); }
.solution-editor-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--border-muted); padding: 18px 20px; }
.solution-editor-header span, .solution-editor-input > span, .solution-editor-preview > span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.solution-editor-header h2 { margin: 5px 0 0; color: var(--text-primary); font-size: var(--font-size-subtitle); }
.solution-editor-header p { margin: 7px 0 0; }
.solution-editor-header button { display: grid; flex: 0 0 32px; place-items: center; width: 32px; height: 32px; border: 1px solid var(--border-muted); border-radius: 0; background: transparent; color: var(--text-muted); cursor: pointer; }
.solution-editor-header button:hover:not(:disabled) { border-color: var(--game-dev); color: var(--game-dev); }
.original-solution { margin: 14px 20px 0; border: 1px solid var(--border-muted); background: var(--background-main); }
.original-solution summary { cursor: pointer; color: var(--text-primary); font-weight: 800; padding: 10px 12px; }
.original-solution-content { max-height: 220px; overflow: auto; border-top: 1px solid var(--border-muted); padding: 14px; }
.solution-editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; min-height: 0; padding: 14px 20px 18px; }
.solution-editor-input, .solution-editor-preview { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 8px; min-width: 0; min-height: 0; }
.solution-editor-input textarea { min-height: 360px; width: 100%; resize: none; border: 1px solid var(--border-muted); border-radius: 0; outline: 0; background: var(--background-main); color: var(--text-primary); font-family: var(--font-mono); font-size: var(--font-size-ui); line-height: 1.55; padding: 14px; }
.solution-editor-input textarea:focus { border-color: var(--simulation); }
.solution-preview-content { min-height: 360px; overflow: auto; border: 1px solid var(--border-muted); background: var(--background-main); padding: 14px; }
.solution-preview-empty { color: var(--text-muted); }
.solution-save-error { margin: 0 20px 14px; border-left: 4px solid var(--game-dev); background: color-mix(in srgb, var(--game-dev) 10%, var(--background-main)); color: var(--game-dev); padding: 10px 12px; }
.solution-editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--border-muted); padding: 14px 20px; }
.solution-editor-footer > span { color: var(--text-muted); font-size: var(--font-size-small); }
.solution-editor-footer > div { display: flex; gap: 8px; }
.solution-editor-footer button:disabled, .solution-editor-header button:disabled { cursor: not-allowed; opacity: .42; }
@media (max-width: 1300px) { .exercise-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); }.search-filter { grid-column: span 2; } }
@media (max-width: 1100px) { .exercise-scope, .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.exercise-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }.overview-row { grid-template-columns: 1fr; }.overview-meta { border-left: 0; border-top: 1px solid var(--border-muted); } }
@media (max-width: 820px) {
  .solution-editor-overlay { align-items: stretch; padding: 10px; }
  .solution-editor-dialog { width: 100%; max-height: calc(100vh - 20px); }
  .solution-editor-grid { grid-template-columns: 1fr; overflow: auto; }
  .solution-editor-input textarea, .solution-preview-content { min-height: 260px; }
  .solution-editor-footer { align-items: stretch; flex-direction: column; }
  .solution-editor-footer > div { justify-content: flex-end; }
}
</style>
