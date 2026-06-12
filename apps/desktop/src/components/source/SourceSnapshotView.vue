<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { captureSourceSnapshot } from "../../data/desktop-vault-adapter.js";

const sourceUrl = ref("");
const capturing = ref(false);
const progress = ref(0);
const statusText = ref("Ready");
const errorText = ref("");
const result = ref(null);
let progressTimer = null;

const normalizedUrl = computed(() => normalizeUrl(sourceUrl.value));
const canCapture = computed(() => Boolean(normalizedUrl.value) && !capturing.value);

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function startProgressLoop() {
  stopProgressLoop();
  progress.value = 4;
  statusText.value = "Preparing Chromium capture...";
  const stages = [
    { at: 10, label: "Opening page..." },
    { at: 24, label: "Waiting for network idle..." },
    { at: 42, label: "Scrolling page to trigger lazy resources..." },
    { at: 58, label: "Collecting original HTML, JS, CSS, media and runtime assets..." },
    { at: 74, label: "Rewriting local resource references..." },
    { at: 88, label: "Compressing snapshot zip..." },
  ];
  let stageIndex = 0;

  progressTimer = window.setInterval(() => {
    const nextTarget = stages[Math.min(stageIndex, stages.length - 1)];
    if (progress.value < nextTarget.at) {
      progress.value += Math.max(1, Math.round((nextTarget.at - progress.value) * 0.16));
      statusText.value = nextTarget.label;
      return;
    }
    if (stageIndex < stages.length - 1) {
      stageIndex += 1;
      statusText.value = stages[stageIndex].label;
      return;
    }
    if (progress.value < 94) progress.value += 1;
  }, 420);
}

function stopProgressLoop() {
  if (!progressTimer) return;
  window.clearInterval(progressTimer);
  progressTimer = null;
}

async function startCapture() {
  const url = normalizedUrl.value;
  if (!url || capturing.value) return;

  capturing.value = true;
  errorText.value = "";
  result.value = null;
  startProgressLoop();

  try {
    const captureResult = await captureSourceSnapshot(url);
    stopProgressLoop();
    progress.value = 100;
    statusText.value = "Snapshot completed.";
    result.value = captureResult;
  } catch (error) {
    stopProgressLoop();
    progress.value = 0;
    statusText.value = "Capture failed.";
    errorText.value = String(error?.message || error);
  } finally {
    capturing.value = false;
  }
}

onBeforeUnmount(() => {
  stopProgressLoop();
});
</script>

<template>
  <section class="snapshot-view">
    <div class="snapshot-header">
      <div>
        <p class="eyebrow">SOURCE SNAPSHOT</p>
        <h1>Capture a web page as a local snapshot zip</h1>
        <p class="snapshot-summary">
          Uses local Chromium via Playwright when available. Output is written to the project-local
          <code>snapshot/</code> folder, which is ignored by Git.
        </p>
      </div>
    </div>

    <form class="snapshot-form" @submit.prevent="startCapture">
      <label class="snapshot-label" for="snapshot-url">Source URL</label>
      <div class="snapshot-input-row">
        <input
          id="snapshot-url"
          v-model="sourceUrl"
          class="snapshot-input"
          type="url"
          placeholder="https://ciechanow.ski/cameras-and-lenses/"
          :disabled="capturing"
        />
        <button class="hud-button snapshot-submit" style="--button-color: var(--shader)" :disabled="!canCapture">
          {{ capturing ? "Capturing..." : "Start Capture" }}
        </button>
      </div>
      <p class="snapshot-hint">
        If you omit <code>https://</code>, it will be added automatically.
      </p>
    </form>

    <div class="snapshot-progress-card">
      <div class="snapshot-progress-meta">
        <span>{{ statusText }}</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="snapshot-progress-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <div class="snapshot-progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <div v-if="errorText" class="snapshot-message is-error">
      <strong>Capture failed</strong>
      <p>{{ errorText }}</p>
    </div>

    <div v-if="result" class="snapshot-message is-success">
      <strong>Snapshot zip created</strong>
      <dl>
        <div>
          <dt>URL</dt>
          <dd>{{ result.url }}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{{ result.mode || "unknown" }}</dd>
        </div>
        <div>
          <dt>Files</dt>
          <dd>{{ result.fileCount || 0 }}</dd>
        </div>
        <div>
          <dt>Zip size</dt>
          <dd>{{ formatBytes(result.totalSize) }}</dd>
        </div>
        <div>
          <dt>Zip path</dt>
          <dd><code>{{ result.zipPath }}</code></dd>
        </div>
      </dl>
    </div>

    <section class="snapshot-notes">
      <h2>Notes</h2>
      <ul>
        <li>The snapshot writes the original document HTML when possible, so initialized controls are not duplicated by rehydration.</li>
        <li>Playwright capture scrolls through the page to trigger lazy-loaded assets before writing the snapshot.</li>
        <li>Some JavaScript-generated network URLs may still require manual fixes if the page constructs them dynamically at runtime.</li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.snapshot-view {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: auto;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    var(--background-main);
  background-size: 32px 32px;
  color: var(--text-primary);
}

.snapshot-header,
.snapshot-form,
.snapshot-progress-card,
.snapshot-message,
.snapshot-notes {
  border: 1px solid var(--border-primary);
  background: rgba(12, 12, 12, 0.92);
  box-shadow: 6px 6px 0 rgba(255, 255, 255, 0.08);
}

.snapshot-header {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--shader);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
  letter-spacing: 0.14em;
}

h1,
h2 {
  margin: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 880px;
  font-size: var(--font-size-title);
  line-height: 1.1;
}

h2 {
  font-size: var(--font-size-ui);
}

.snapshot-summary,
.snapshot-hint,
.snapshot-notes li,
.snapshot-message p,
dd,
dt {
  font-size: var(--font-size-ui);
  line-height: 1.65;
}

.snapshot-summary {
  max-width: 900px;
  margin: 14px 0 0;
  color: var(--text-secondary);
}

.snapshot-form,
.snapshot-progress-card,
.snapshot-message,
.snapshot-notes {
  padding: 22px;
}

.snapshot-label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.snapshot-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.snapshot-input {
  min-width: 0;
  border: 1px solid var(--border-primary);
  background: #050505;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-ui);
  padding: 10px 12px;
  outline: none;
}

.snapshot-input:focus {
  box-shadow: 0 0 0 2px var(--shader);
}

.snapshot-submit {
  white-space: nowrap;
}

.snapshot-hint {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.snapshot-progress-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.snapshot-progress-track {
  height: 14px;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  background: #050505;
}

.snapshot-progress-fill {
  height: 100%;
  width: 0;
  background: var(--shader);
  transition: width 260ms ease;
}

.snapshot-message strong {
  display: block;
  margin-bottom: 12px;
  font-size: var(--font-size-ui);
  text-transform: uppercase;
}

.snapshot-message.is-error {
  border-color: var(--game-dev);
}

.snapshot-message.is-error strong {
  color: var(--game-dev);
}

.snapshot-message.is-success {
  border-color: var(--language);
}

.snapshot-message.is-success strong {
  color: var(--language);
}

.snapshot-message dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

.snapshot-message dl > div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}

dt {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-weight: 900;
  text-transform: uppercase;
}

dd {
  min-width: 0;
  margin: 0;
  word-break: break-all;
}

code {
  color: var(--shader);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
}

.snapshot-notes ul {
  margin: 14px 0 0;
  padding-left: 1.2em;
  color: var(--text-secondary);
}
</style>
