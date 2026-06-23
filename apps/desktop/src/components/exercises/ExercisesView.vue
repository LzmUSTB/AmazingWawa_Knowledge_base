<script setup>
import { computed, ref, watch } from "vue";
import {
  exercisePriority,
  exerciseProgressKey,
  exerciseStatus,
  rateExerciseProblem,
} from "../../../../../packages/knowledge-core/src/index.js";
import { findGraphNode, useActiveVault } from "../../graph/graph-data-store.js";
import NoteBlockRenderer from "../note/NoteBlockRenderer.vue";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  exerciseNodeId: { type: String, default: "" },
  canSave: { type: Boolean, default: false },
});

const emit = defineEmits(["delete-exercise-problem", "delete-exercise-set", "import-exercise-set", "open-exercises", "open-note", "open-scope", "save-progress"]);
const activeVault = useActiveVault();
const expandedProblems = ref(new Set());
const revealedHints = ref({});
const revealedAnswers = ref({});
const revealedSolutions = ref({});
const domainFilter = ref("all");
const setFilter = ref("all");
const statusFilter = ref("all");
const difficultyFilter = ref("all");
const typeFilter = ref("all");
const localProgress = ref({ version: 1, problems: {}, errors: [] });
const LOOSE_TEX_RUN = /\\(?:bar|vec|hat|tilde|overline|underline|mathbf|mathrm|mathit|mathbb|mathcal|frac|sqrt|sum|prod|int|lim|begin|end|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|cdot|times|leq|geq|neq|infty)(?:\s*[A-Za-z0-9_{}^=+\-*/(),.\\]+)*/g;
const MATH_SPAN = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;

watch(
  () => activeVault.value.exerciseProgress,
  (progress) => { localProgress.value = { version: 1, problems: {}, errors: [], ...(progress || {}) }; },
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

const filteredRows = computed(() => problemRows.value
  .filter((row) => domainFilter.value === "all" || row.owner?.domain === domainFilter.value)
  .filter((row) => setFilter.value === "all" || row.exerciseSet.nodeId === setFilter.value)
  .filter((row) => statusFilter.value === "all" || row.status === statusFilter.value)
  .filter((row) => difficultyFilter.value === "all" || row.problem.difficulty === difficultyFilter.value)
  .filter((row) => typeFilter.value === "all" || row.problem.type === typeFilter.value)
  .sort((a, b) => b.priority - a.priority || a.problem.title.localeCompare(b.problem.title)));

const stats = computed(() => {
  const rows = problemRows.value;
  const attempted = rows.filter((row) => row.progress?.attempts);
  const correct = attempted.reduce((sum, row) => sum + (Number(row.progress.correctCount) || 0), 0);
  const attempts = attempted.reduce((sum, row) => sum + (Number(row.progress.attempts) || 0), 0);
  const mastery = attempted.reduce((sum, row) => sum + (Number(row.progress.mastery) || 0), 0);
  return {
    total: rows.length,
    attempted: attempted.length,
    due: rows.filter((row) => row.status === "due").length,
    newCount: rows.filter((row) => row.status === "new").length,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    mastery: attempted.length ? Math.round((mastery / attempted.length) * 100) : 0,
  };
});

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

function rate(exerciseSet, problem, result) {
  if (!props.canSave) return;
  const key = exerciseProgressKey(exerciseSet.nodeId, problem.id);
  const current = localProgress.value.problems?.[key] || {};
  const nextEntry = rateExerciseProblem(current, result);
  const nextProgress = {
    version: 1,
    problems: {
      ...(localProgress.value.problems || {}),
      [key]: { ...nextEntry, exerciseSetNodeId: exerciseSet.nodeId, problemId: problem.id },
    },
  };
  localProgress.value = nextProgress;
  emit("save-progress", nextProgress);
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

function normalizeLooseExerciseMath(markdown = "") {
  let inCodeFence = false;
  return String(markdown || "").split(/\r?\n/).map((line) => {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      return line;
    }
    if (inCodeFence || !line.includes("\\") || MATH_SPAN.test(line)) {
      MATH_SPAN.lastIndex = 0;
      return line;
    }
    MATH_SPAN.lastIndex = 0;
    return line.split(MATH_SPAN).map((part, index) => {
      if (index % 2) return part;
      return part.replace(LOOSE_TEX_RUN, (match) => {
        const leading = match.match(/^\s*/)?.[0] || "";
        const trailing = match.match(/\s*$/)?.[0] || "";
        const body = match.trim();
        return body ? `${leading}\\(${body}\\)${trailing}` : match;
      });
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
      <div v-if="nodeSpecific && currentExerciseSet" class="header-actions">
        <button class="hud-button button-with-icon" type="button" style="--button-color: var(--simulation)" @click="$emit('open-note', exerciseNodeId)">
          <AppIcon name="file-text" /><span class="button-icon-label">Open Note</span>
        </button>
        <button class="hud-button button-with-icon" type="button" style="--button-color: var(--game-dev)" @click="$emit('delete-exercise-set', exerciseNodeId)">
          <AppIcon name="delete" /><span class="button-icon-label">Delete ExerciseSet</span>
        </button>
      </div>
    </header>

    <div v-if="nodeSpecific && !currentExerciseSet" class="exercise-empty">
      <h2>No ExerciseSet for this node.</h2>
      <p>Import an exercises.yaml file to attach an ExerciseSet to this node.</p>
      <button class="hud-button button-with-icon" type="button" :disabled="!canSave"
        style="--button-color: var(--career)" @click="$emit('import-exercise-set', exerciseNodeId)">
        <AppIcon name="import" /><span class="button-icon-label">Import ExerciseSet</span>
      </button>
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
        <article v-for="(problem, index) in currentExerciseSet.problems" :key="problem.id" class="problem-panel">
          <header class="problem-header">
            <div><span>Problem {{ String(index + 1).padStart(2, "0") }}</span><h2>{{ problem.title || problem.id }}</h2></div>
            <div class="problem-header-actions">
              <div class="problem-tags"><span>{{ problem.type }}</span><span>{{ problem.difficulty }}</span></div>
              <button class="problem-delete" type="button" :disabled="!canSave" title="Delete problem"
                @click="$emit('delete-exercise-problem', { nodeId: exerciseNodeId, problemId: problem.id })">
                <AppIcon name="delete" :size="15" />
              </button>
            </div>
          </header>
          <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.prompt)" :block-registry="activeVault.blockRegistry"
            :node="ownerNode" :vault-root-path="activeVault.vaultRootPath" />
          <div class="reveal-actions">
            <button v-if="problem.hints.length" class="hud-button" type="button" @click="toggleReveal('hints', problem.id)">{{ revealedHints[problem.id] ? "Hide Hint" : "Show Hint" }}</button>
            <button class="hud-button" type="button" @click="toggleReveal('answers', problem.id)">{{ revealedAnswers[problem.id] ? "Hide Answer" : "Show Answer" }}</button>
            <button class="hud-button" type="button" @click="toggleReveal('solutions', problem.id)">{{ revealedSolutions[problem.id] ? "Hide Solution" : "Show Solution" }}</button>
          </div>
          <section v-if="revealedHints[problem.id]" class="reveal-panel"><strong>Hints</strong><NoteBlockRenderer v-for="(hint, hintIndex) in problem.hints" :key="hintIndex" :markdown="normalizeLooseExerciseMath(hint)" /></section>
          <section v-if="revealedAnswers[problem.id]" class="reveal-panel"><strong>Answer</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.answer)" /></section>
          <section v-if="revealedSolutions[problem.id]" class="reveal-panel"><strong>Solution</strong><NoteBlockRenderer :markdown="normalizeLooseExerciseMath(problem.solution)" /></section>
          <footer class="rating-row">
            <div><span>Mastery {{ percent(progressFor(currentExerciseSet, problem)?.mastery) }}</span><span>Accuracy {{ accuracy(progressFor(currentExerciseSet, problem)) }}</span></div>
            <div class="rating-actions">
              <button type="button" :disabled="!canSave" class="rate-wrong" @click="rate(currentExerciseSet, problem, 'wrong')"><AppIcon name="emoji-wrong" :size="14" />Wrong</button>
              <button type="button" :disabled="!canSave" class="rate-hard" @click="rate(currentExerciseSet, problem, 'hard')"><AppIcon name="emoji-hard" :size="14" />Hard</button>
              <button type="button" :disabled="!canSave" class="rate-good" @click="rate(currentExerciseSet, problem, 'good')"><AppIcon name="emoji-good" :size="14" />Good</button>
              <button type="button" :disabled="!canSave" class="rate-easy" @click="rate(currentExerciseSet, problem, 'easy')"><AppIcon name="emoji-easy" :size="14" />Easy</button>
            </div>
          </footer>
        </article>
      </div>
    </template>

    <template v-else>
      <section class="stats-grid">
        <div><strong>{{ stats.total }}</strong><span>Total</span></div><div><strong>{{ stats.attempted }}</strong><span>Attempted</span></div>
        <div><strong>{{ stats.due }}</strong><span>Due</span></div><div><strong>{{ stats.newCount }}</strong><span>New</span></div>
        <div><strong>{{ stats.accuracy }}%</strong><span>Accuracy</span></div><div><strong>{{ stats.mastery }}%</strong><span>Avg Mastery</span></div>
      </section>
      <section class="exercise-filters">
        <label><span>Domain</span><select v-model="domainFilter"><option value="all">All Domains</option><option v-for="domain in domains" :key="domain.id" :value="domain.id">{{ domain.titleLocale || domain.title || domain.id }}</option></select></label>
        <label><span>ExerciseSet</span><select v-model="setFilter"><option value="all">All ExerciseSets</option><option v-for="set in exerciseSets" :key="set.nodeId" :value="set.nodeId">{{ set.title }} / {{ set.nodeId }}</option></select></label>
        <label><span>Status</span><select v-model="statusFilter"><option v-for="status in ['all','due','new','weak','completed']" :key="status" :value="status">{{ status }}</option></select></label>
        <label><span>Difficulty</span><select v-model="difficultyFilter"><option value="all">All</option><option v-for="difficulty in ['introductory','undergraduate','undergraduate-advanced','graduate','research-oriented']" :key="difficulty">{{ difficulty }}</option></select></label>
        <label><span>Type</span><select v-model="typeFilter"><option value="all">All</option><option v-for="type in ['conceptual','calculation','proof','derivation','application','comparison','implementation','diagnostic']" :key="type">{{ type }}</option></select></label>
      </section>
      <div class="overview-list">
        <article v-for="row in filteredRows" :key="row.key" class="overview-row">
          <button class="overview-main" type="button" @click="toggleExpanded(row.key)">
            <span class="status-mark" :class="`is-${row.status}`"></span>
            <span><strong>{{ row.problem.title || row.problem.id }}</strong><small>{{ row.exerciseSet.title }} / {{ displayTitle(row.owner, row.exerciseSet.nodeId) }}</small></span>
          </button>
          <div class="overview-meta"><span>{{ row.owner?.domain || '-' }}</span><span>{{ row.problem.type }}</span><span>{{ row.problem.difficulty }}</span><span>{{ percent(row.progress?.mastery) }}</span><span>{{ accuracy(row.progress) }}</span><span>{{ dueLabel(row.progress?.dueAt) }}</span><span>{{ row.progress?.lastResult || 'new' }}</span></div>
          <div v-if="expandedProblems.has(row.key)" class="overview-expanded">
            <NoteBlockRenderer :markdown="normalizeLooseExerciseMath(row.problem.prompt)" />
            <button class="hud-button button-with-icon" type="button" @click="$emit('open-exercises', row.exerciseSet.nodeId)"><AppIcon name="exercise" /><span class="button-icon-label">Open ExerciseSet</span></button>
          </div>
        </article>
        <p v-if="!filteredRows.length" class="no-results">No problems match these filters.</p>
      </div>
    </template>
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
.exercise-empty, .exercise-errors { margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); padding: 22px; }
.exercise-scope { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); }
.scope-group { min-width: 0; padding: 14px; border-right: 1px solid var(--border-muted); }
.scope-group:last-child { border-right: 0; }
.scope-links { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.scope-links button { border: 1px solid var(--border-muted); border-radius: 0; background: var(--background-main); color: var(--text-secondary); cursor: pointer; padding: 5px 7px; }
.exercise-errors { border-color: var(--game-dev); color: var(--game-dev); }
.exercise-errors p { margin: 6px 0 0; }
.problem-list { display: grid; gap: 18px; margin-top: 18px; }
.problem-panel { border: 1px solid var(--border-primary); background: var(--background-main); padding: 18px; }
.problem-header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-muted); margin-bottom: 18px; padding-bottom: 12px; }
.problem-header h2 { margin: 5px 0 0; color: var(--text-primary); font-size: var(--font-size-subtitle); }
.problem-header-actions { display: flex; align-items: flex-start; gap: 8px; }
.problem-delete { display: grid; flex: 0 0 30px; place-items: center; width: 30px; height: 30px; border: 1px solid var(--game-dev); border-radius: 0; background: transparent; color: var(--game-dev); cursor: pointer; padding: 0; }
.problem-delete:hover:not(:disabled) { background: color-mix(in srgb, var(--game-dev) 14%, transparent); }
.problem-delete:disabled { opacity: .4; cursor: not-allowed; }
.problem-tags, .rating-row > div, .rating-actions, .reveal-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.problem-tags span { border: 1px solid var(--border-muted); padding: 5px 7px; color: var(--text-muted); font-size: var(--font-size-small); text-transform: uppercase; }
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
.stats-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin-top: 18px; border: 1px solid var(--border-primary); background: var(--background-panel); }
.stats-grid div { display: grid; gap: 4px; border-right: 1px solid var(--border-muted); padding: 14px; }
.stats-grid div:last-child { border-right: 0; }
.stats-grid strong { color: var(--text-primary); font-size: var(--font-size-subtitle); }
.stats-grid span { color: var(--text-muted); font-size: var(--font-size-small); text-transform: uppercase; }
.exercise-filters { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 10px; margin-top: 14px; border: 1px solid var(--border-primary); background: var(--background-panel); padding: 14px; }
.exercise-filters label { display: grid; gap: 6px; min-width: 0; }
.exercise-filters select { min-width: 0; width: 100%; border: 1px solid var(--border-muted); border-radius: 0; background: var(--background-main); color: var(--text-primary); padding: 8px; }
.overview-list { display: grid; gap: 8px; margin-top: 14px; }
.overview-row { display: grid; grid-template-columns: minmax(260px, 1.3fr) minmax(420px, 1fr); border: 1px solid var(--border-muted); background: var(--background-panel); }
.overview-main { display: grid; grid-template-columns: 8px minmax(0, 1fr); gap: 10px; align-items: center; min-width: 0; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); cursor: pointer; padding: 12px; text-align: left; }
.overview-main span:last-child { display: grid; min-width: 0; }
.overview-main strong, .overview-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-main small { margin-top: 4px; color: var(--text-muted); }
.status-mark { width: 5px; height: 100%; background: var(--text-muted); }
.status-mark.is-due, .status-mark.is-weak { background: var(--game-dev); }.status-mark.is-new { background: var(--graphics); }.status-mark.is-completed { background: var(--career); }
.overview-meta { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); align-items: center; border-left: 1px solid var(--border-muted); color: var(--text-muted); font-size: var(--font-size-small); text-align: center; }
.overview-meta span { overflow: hidden; padding: 8px 5px; text-overflow: ellipsis; white-space: nowrap; }
.overview-expanded { grid-column: 1 / -1; border-top: 1px solid var(--border-muted); padding: 16px; }
.no-results { border: 1px solid var(--border-muted); background: var(--background-panel); padding: 18px; }
@media (max-width: 1100px) { .exercise-scope, .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.exercise-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }.overview-row { grid-template-columns: 1fr; }.overview-meta { border-left: 0; border-top: 1px solid var(--border-muted); } }
</style>
