<script setup>
import { computed, onMounted, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { vaultGit } from "../../data/desktop-vault-adapter.js";
import AppIcon from "../ui/AppIcon.vue";

const emit = defineEmits(["vault-changed"]);
const available = ref(true);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const status = ref({ isRepo: false, clean: true, branch: "", remoteUrl: "", groups: {}, conflicts: [] });
const history = ref([]);
const remoteUrl = ref("");
const commitMessage = ref("");
const includeKnowledge = ref(true);
const includeLayout = ref(true);
const includeProgress = ref(true);
const includeOther = ref(false);

const groups = computed(() => ({
  knowledge: status.value.groups?.knowledge || [],
  layout: status.value.groups?.layout || [],
  progress: status.value.groups?.progress || [],
  ignoredOrGenerated: status.value.groups?.ignoredOrGenerated || [],
  other: status.value.groups?.other || [],
}));
const allChanges = computed(() => Object.values(groups.value).flat());
const selectedPaths = computed(() => [
  ...(includeKnowledge.value ? groups.value.knowledge : []),
  ...(includeLayout.value ? groups.value.layout : []),
  ...(includeProgress.value ? groups.value.progress : []),
  ...(includeOther.value ? groups.value.other : []),
].map((item) => item.path));
const layoutOnly = computed(() => groups.value.layout.length > 0
  && !groups.value.knowledge.length && !groups.value.progress.length && !groups.value.other.length);
const canCommit = computed(() => status.value.isRepo && commitMessage.value.trim() && selectedPaths.value.length
  && !status.value.conflicts?.length && !busy.value);

function applyDefaultSelections() {
  const hasKnowledge = groups.value.knowledge.length > 0;
  const onlyLayout = layoutOnly.value;
  includeKnowledge.value = hasKnowledge;
  includeLayout.value = hasKnowledge || (!onlyLayout && groups.value.layout.length > 0);
  includeProgress.value = hasKnowledge || groups.value.progress.length > 0;
  includeOther.value = false;
}

async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    available.value = await vaultGit.isAvailable();
    if (!available.value) return;
    status.value = await vaultGit.status();
    remoteUrl.value = status.value.remoteUrl || "";
    history.value = status.value.isRepo ? await vaultGit.log().catch(() => []) : [];
    applyDefaultSelections();
  } catch (caught) {
    error.value = String(caught?.message || caught);
  } finally {
    loading.value = false;
  }
}

async function run(action, successMessage, { reloadVault = false } = {}) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await action();
    notice.value = successMessage;
    if (reloadVault) emit("vault-changed");
    await refresh();
  } catch (caught) {
    error.value = String(caught?.message || caught);
  } finally {
    busy.value = false;
  }
}

function initGit() {
  run(() => vaultGit.init(), "Git repository initialized.");
}

function commitSelected() {
  const message = commitMessage.value.trim();
  run(async () => {
    await vaultGit.addSelected(selectedPaths.value);
    await vaultGit.commit(message);
    commitMessage.value = "";
  }, "Selected changes committed.");
}

function setRemote() {
  run(() => vaultGit.remoteSet(remoteUrl.value), "Origin remote updated.");
}

function testRemote() {
  run(() => vaultGit.remoteTest(), "Remote is reachable.");
}

function pull() {
  run(() => vaultGit.pull(), "Pull with rebase completed.", { reloadVault: true });
}

function push() {
  run(() => vaultGit.push(), "Push completed.");
}

function sync() {
  if (status.value.clean) {
    run(() => vaultGit.sync(), "Sync completed.", { reloadVault: true });
    return;
  }
  if (!layoutOnly.value) {
    error.value = "Commit or create a checkpoint before syncing knowledge, progress, or other changes.";
    return;
  }
  if (!window.confirm("You have layout-only changes. Temporarily stash layout during sync?")) return;
  run(async () => {
    await vaultGit.stashLayout();
    try {
      await vaultGit.sync();
    } finally {
      await vaultGit.unstash();
    }
  }, "Sync completed and layout changes were reapplied.", { reloadVault: true });
}

function checkpoint(reason = "manual checkpoint") {
  run(() => vaultGit.checkpoint(reason), "Checkpoint created.");
}

async function restore(entry) {
  if (!status.value.clean) {
    if (!window.confirm("Working tree has changes. Create a checkpoint before restore?")) return;
    await run(() => vaultGit.checkpoint("restore"), "Checkpoint created.");
    if (!status.value.clean) return;
  }
  if (!window.confirm(`This will replace current vault files with snapshot ${entry.shortHash}. Continue?`)) return;
  run(() => vaultGit.restore(entry.hash), `Restored snapshot ${entry.shortHash}.`, { reloadVault: true });
}

function openRemote() {
  let url = remoteUrl.value.trim();
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  if (/^https:\/\//i.test(url)) openUrl(url.replace(/\.git$/, ""));
}

onMounted(refresh);
</script>

<template>
  <section class="vault-git technical-grid">
    <header class="git-header">
      <div><div class="section-kicker">Vault Git</div><h1>Version & Sync</h1><p>Every operation is scoped to the configured active vault.</p></div>
      <button class="hud-button button-with-icon" type="button" :disabled="loading || busy" @click="refresh"><AppIcon name="refresh" /><span>Refresh</span></button>
    </header>

    <div v-if="!available" class="git-message git-message--error">Git is not installed or not available in PATH.</div>
    <template v-else>
      <section class="git-band status-band">
        <div><span>Status</span><strong>{{ status.isRepo ? (status.clean ? "CLEAN" : "CHANGES") : "NOT INITIALIZED" }}</strong></div>
        <div><span>Branch</span><strong>{{ status.branch || "-" }}</strong></div>
        <div><span>Remote</span><strong>{{ status.remoteUrl || "NOT SET" }}</strong></div>
        <button v-if="!status.isRepo" class="hud-button init-button" type="button" :disabled="busy" @click="initGit">INIT GIT</button>
        <button v-else class="hud-button" type="button" :disabled="busy || status.clean" @click="checkpoint()">CREATE CHECKPOINT</button>
      </section>

      <template v-if="status.isRepo">
        <section class="git-band changes-band">
          <div class="band-heading"><div><span>Changes</span><strong>{{ allChanges.length }} FILES</strong></div><strong v-if="status.conflicts?.length" class="conflict-label">{{ status.conflicts.length }} CONFLICTS</strong></div>
          <div v-if="allChanges.length" class="change-groups">
            <div v-for="group in [
              ['Knowledge Changes', groups.knowledge], ['Layout Changes', groups.layout],
              ['Progress Changes', groups.progress], ['Other Changes', groups.other],
              ['Tracked Generated Files', groups.ignoredOrGenerated],
            ]" :key="group[0]" v-show="group[1].length" class="change-group">
              <strong>{{ group[0] }}</strong>
              <div v-for="change in group[1]" :key="change.path" class="change-row" :title="change.path"><code>{{ change.status }}</code><span>{{ change.path }}</span></div>
            </div>
          </div>
          <p v-else>No working tree changes.</p>
        </section>

        <section class="git-band commit-band">
          <div class="band-heading"><div><span>Commit</span><strong>SELECT GROUPS</strong></div></div>
          <div class="commit-controls">
            <input v-model="commitMessage" placeholder="Commit message" />
            <div class="group-checks">
              <label><input v-model="includeKnowledge" type="checkbox" :disabled="!groups.knowledge.length" /> Knowledge</label>
              <label><input v-model="includeLayout" type="checkbox" :disabled="!groups.layout.length" /> Layout</label>
              <label><input v-model="includeProgress" type="checkbox" :disabled="!groups.progress.length" /> Progress</label>
              <label><input v-model="includeOther" type="checkbox" :disabled="!groups.other.length" /> Other</label>
            </div>
            <button class="hud-button commit-button" type="button" :disabled="!canCommit" @click="commitSelected">COMMIT SELECTED</button>
          </div>
        </section>

        <section class="git-band remote-band">
          <div class="band-heading"><div><span>Remote</span><strong>ORIGIN</strong></div></div>
          <div class="remote-row"><input v-model.trim="remoteUrl" placeholder="https://github.com/owner/vault.git" /><button class="hud-button" :disabled="busy" @click="setRemote">SET REMOTE</button><button class="hud-button" :disabled="busy || !status.remoteUrl" @click="testRemote">TEST</button><button class="hud-button button-with-icon" :disabled="!remoteUrl" @click="openRemote"><AppIcon name="url-link" /><span>Open</span></button></div>
        </section>

        <section class="git-band sync-band">
          <div class="band-heading"><div><span>Sync</span><strong>PULL / PUSH</strong></div></div>
          <div class="sync-actions"><button class="hud-button" :disabled="busy || !status.remoteUrl || !status.clean" @click="pull">PULL --REBASE</button><button class="hud-button" :disabled="busy || !status.remoteUrl" @click="push">PUSH</button><button class="hud-button sync-button" :disabled="busy || !status.remoteUrl" @click="sync">SYNC</button></div>
        </section>

        <section class="git-band history-band">
          <div class="band-heading"><div><span>History / Danger</span><strong>RESTORE SNAPSHOT</strong></div></div>
          <div class="history-list">
            <article v-for="entry in history" :key="entry.hash" class="history-row"><code>{{ entry.shortHash }}</code><div><strong>{{ entry.message }}</strong><span>{{ entry.date }}</span></div><button class="hud-button" :disabled="busy" @click="restore(entry)">RESTORE SNAPSHOT</button></article>
            <p v-if="!history.length">No commits yet.</p>
          </div>
        </section>
      </template>
    </template>

    <div v-if="notice" class="git-message">{{ notice }}</div>
    <pre v-if="error" class="git-message git-message--error">{{ error }}</pre>
  </section>
</template>

<style scoped>
.vault-git { height: 100%; overflow: auto; padding: 24px; }
.git-header, .band-heading, .status-band { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.git-header { border-bottom: 1px solid var(--border-primary); padding-bottom: 18px; }
.section-kicker, .git-band span, .status-band span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
h1 { margin: 7px 0; color: var(--text-primary); font-size: var(--font-size-title); text-transform: uppercase; }
p { color: var(--text-secondary); }
.git-band { border-bottom: 1px solid var(--border-muted); padding: 18px 0; }
.status-band { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; }
.status-band > div { display: grid; gap: 6px; min-width: 0; }
.status-band strong { overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.init-button, .commit-button, .sync-button { --button-color: var(--career); }
.change-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 14px; }
.change-group { min-width: 0; border: 1px solid var(--border-muted); background: var(--background-panel); padding: 12px; }
.change-row { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; margin-top: 8px; color: var(--text-secondary); }
.change-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: none; }
.conflict-label { color: var(--game-dev); }
.commit-controls { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: 12px; margin-top: 14px; }
input { min-width: 0; border: 1px solid var(--border-primary); border-radius: 0; background: var(--background-panel); color: var(--text-primary); font: inherit; padding: 11px; }
.group-checks { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.group-checks label { color: var(--text-secondary); font-size: var(--font-size-small); text-transform: uppercase; }
.remote-row { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto auto; gap: 10px; margin-top: 14px; }
.sync-actions { display: flex; gap: 10px; margin-top: 14px; }
.history-list { display: grid; gap: 8px; margin-top: 14px; }
.history-row { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; align-items: center; gap: 12px; border: 1px solid var(--border-muted); background: var(--background-panel); padding: 10px; }
.history-row > div { display: grid; min-width: 0; }
.history-row strong { overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.git-message { margin-top: 14px; border: 1px solid var(--career); color: var(--text-secondary); background: var(--background-panel); padding: 12px; white-space: pre-wrap; }
.git-message--error { border-color: var(--game-dev); color: var(--game-dev); }
@media (max-width: 980px) { .status-band, .commit-controls, .remote-row { grid-template-columns: 1fr; } .history-row { grid-template-columns: 72px minmax(0, 1fr); } .history-row button { grid-column: 1 / -1; } }
</style>
