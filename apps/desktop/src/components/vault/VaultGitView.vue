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
const remoteError = ref("");
const remoteNotice = ref("");
const busyAction = ref("");
const discardingPath = ref("");
const status = ref({ isRepo: false, clean: true, branch: "", remoteUrl: "", groups: {}, conflicts: [] });
const history = ref([]);
const remoteUrl = ref("");
const commitMessage = ref("");
const includeKnowledge = ref(true);
const includeLayout = ref(true);
const includeProgress = ref(true);
const includeOther = ref(false);
const layoutStashRef = ref("");

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
const remoteBusy = computed(() => busy.value && ["pull", "push", "sync", "remote"].includes(busyAction.value));

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

async function run(action, successMessage, { reloadVault = false, busyLabel = "" } = {}) {
  if (busy.value) return;
  busy.value = true;
  busyAction.value = busyLabel;
  error.value = "";
  notice.value = "";
  if (["pull", "push", "sync", "remote"].includes(busyLabel)) {
    remoteError.value = "";
    remoteNotice.value = "";
  }
  try {
    await action();
    if (["pull", "push", "sync", "remote"].includes(busyLabel)) remoteNotice.value = successMessage;
    else notice.value = successMessage;
    if (reloadVault) emit("vault-changed");
    await refresh();
  } catch (caught) {
    const message = String(caught?.message || caught);
    if (["pull", "push", "sync", "remote"].includes(busyLabel)) remoteError.value = message;
    else error.value = message;
  } finally {
    busy.value = false;
    busyAction.value = "";
  }
}

function initGit() {
  run(() => vaultGit.init(), "Git repository initialized.");
}

function addAppVaultIgnore() {
  run(() => vaultGit.ensureAppRepoIgnore(), "Application repository now ignores /vault/.");
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
  run(() => vaultGit.remoteSet(remoteUrl.value), "Origin remote updated.", { busyLabel: "remote" });
}

function testRemote() {
  run(() => vaultGit.remoteTest(), "Remote is reachable.", { busyLabel: "remote" });
}

function pull() {
  run(() => vaultGit.pull(), "Pull with rebase completed.", { reloadVault: true, busyLabel: "pull" });
}

function push() {
  run(() => vaultGit.push(), "Push completed.", { busyLabel: "push" });
}

function sync() {
  if (status.value.clean) {
    run(() => vaultGit.sync(), "Sync completed.", { reloadVault: true, busyLabel: "sync" });
    return;
  }
  if (!layoutOnly.value) {
    error.value = "Commit or create a checkpoint before syncing knowledge, progress, or other changes.";
    return;
  }
  if (!window.confirm("You have layout-only changes. Temporarily stash layout during sync?")) return;
  run(async () => {
    layoutStashRef.value = await vaultGit.stashLayout();
    if (!layoutStashRef.value) throw new Error("No layout stash was created. Sync was cancelled to avoid touching existing stashes.");
    try {
      await vaultGit.pull();
    } finally {
      const stashRef = layoutStashRef.value;
      layoutStashRef.value = "";
      await vaultGit.unstash(stashRef);
    }
    await vaultGit.push();
  }, "Sync completed and layout changes were reapplied.", { reloadVault: true, busyLabel: "sync" });
}

function checkpoint(reason = "manual checkpoint") {
  run(() => vaultGit.checkpoint(reason), "Checkpoint created.");
}

function discardChange(change) {
  if (!change?.path || busy.value) return;
  const action = change.status === "??" ? "remove this untracked file" : "revert this file to HEAD";
  if (!window.confirm(`Discard ${change.path}?\n\nThis will ${action}.`)) return;
  discardingPath.value = change.path;
  run(
    () => vaultGit.discardPath(change.path, change.status),
    `Discarded ${change.path}.`,
    { reloadVault: true },
  ).finally(() => {
    discardingPath.value = "";
  });
}

async function restore(entry) {
  if (!status.value.clean) {
    if (!window.confirm("Working tree has changes. Create a checkpoint before restore?")) return;
    await run(() => vaultGit.checkpoint("restore"), "Checkpoint created.");
    if (!status.value.clean) return;
  }
  if (!window.confirm(`Restore tracked vault files to snapshot ${entry.shortHash}. Untracked files may remain. Continue?`)) return;
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
    <div class="git-feedback-slot" :class="{ 'has-message': notice || error || (busy && !remoteBusy) }">
      <div v-if="busy && !remoteBusy" class="git-message git-message--busy">
        <span class="git-spinner" aria-hidden="true"></span>
        <span>{{ busyAction ? `Running ${busyAction}...` : "Running Git operation..." }}</span>
      </div>
      <div v-else-if="notice" class="git-message">{{ notice }}</div>
      <pre v-else-if="error" class="git-message git-message--error">{{ error }}</pre>
    </div>

    <div v-if="!available" class="git-message git-message--error">Git is not installed or not available in PATH.</div>
    <template v-else>
      <section class="git-band status-band">
        <div><span>Status</span><strong>{{ status.isRepo ? (status.clean ? "CLEAN" : "CHANGES") : "NOT INITIALIZED" }}</strong></div>
        <div><span>Branch</span><strong>{{ status.branch || "-" }}</strong></div>
        <div><span>Remote</span><strong>{{ status.remoteUrl || "NOT SET" }}</strong></div>
        <button v-if="!status.isRepo" class="hud-button init-button" type="button" :disabled="busy" @click="initGit">INIT GIT</button>
        <button v-else class="hud-button" type="button" :disabled="busy || status.clean" @click="checkpoint()">CREATE CHECKPOINT</button>
      </section>

      <section v-if="status.vaultLocation?.insideAppRepo" class="git-band location-band">
        <div class="band-heading">
          <div><span>Vault Location</span><strong>{{ status.vaultLocation.standardRepoVault ? "APP REPO / VAULT" : "INSIDE APP REPO" }}</strong></div>
        </div>
        <div class="location-grid">
          <div><span>Path</span><code>{{ status.vaultLocation.activeVaultPath }}</code></div>
          <div><span>Ignored by app Git</span><strong>{{ status.vaultLocation.ignoredByAppGit ? "YES" : "NO" }}</strong></div>
          <div><span>Tracked by app Git</span><strong>{{ status.vaultLocation.trackedByAppGitCount || 0 }} FILES</strong></div>
        </div>
        <div v-if="status.vaultLocation.warning" class="git-message git-message--warning">{{ status.vaultLocation.warning }}</div>
        <button v-if="status.vaultLocation.standardRepoVault && !status.vaultLocation.ignoredByAppGit" class="hud-button" type="button" :disabled="busy" @click="addAppVaultIgnore">ADD /vault/ TO APP .gitignore</button>
        <pre v-if="status.vaultLocation.trackedByAppGitCount" class="git-message git-message--error">Some vault files are already tracked by the application repository.
Run manually from the app repository:
git rm -r --cached vault
git commit -m "stop tracking local vault"</pre>
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
              <div v-for="change in group[1]" :key="change.path" class="change-row" :title="change.path">
                <code>{{ change.status }}</code>
                <span>{{ change.path }}</span>
                <button class="change-discard button-with-icon" type="button"
                  :disabled="busy"
                  :title="change.status === '??' ? 'Remove untracked file' : 'Revert file changes'"
                  @click="discardChange(change)">
                  <span v-if="discardingPath === change.path" class="git-spinner git-spinner--small" aria-hidden="true"></span>
                  <AppIcon v-else name="back" :size="13" />
                </button>
              </div>
            </div>
          </div>
          <p v-else>No working tree changes.</p>
        </section>

        <section class="git-band commit-band">
          <div class="band-heading"><div><span>Commit</span><strong>SELECT GROUPS</strong></div></div>
          <p class="commit-note">Kinjito stages the selected files. Already staged vault files are also included in the commit.</p>
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
          <div class="remote-progress" :class="{ 'is-active': remoteBusy, 'has-notice': remoteNotice, 'has-error': remoteError }" aria-live="polite">
            <span></span>
            <strong>{{ remoteBusy ? `Running ${busyAction}...` : (remoteError || remoteNotice || "Remote operations idle") }}</strong>
          </div>
        </section>

        <section class="git-band history-band">
          <div class="band-heading"><div><span>History / Danger</span><strong>RESTORE SNAPSHOT</strong></div></div>
          <p class="commit-note">Restore tracked vault files to a snapshot. Untracked files may remain.</p>
          <div class="history-list">
            <article v-for="entry in history" :key="entry.hash" class="history-row"><code>{{ entry.shortHash }}</code><div><strong>{{ entry.message }}</strong><span>{{ entry.date }}</span></div><button class="hud-button" :disabled="busy" @click="restore(entry)">RESTORE SNAPSHOT</button></article>
            <p v-if="!history.length">No commits yet.</p>
          </div>
        </section>
      </template>
    </template>

  </section>
</template>

<style scoped>
.vault-git { height: 100%; overflow: auto; padding: 24px; }
.git-header, .band-heading, .status-band { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.git-header { border-bottom: 1px solid var(--border-primary); padding-bottom: 18px; }
.band-heading > div { display: flex; min-width: 0; align-items: baseline; gap: 12px; }
.band-heading > div > span,
.band-heading > div > strong { min-width: 0; }
.section-kicker, .git-band span, .status-band span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
h1 { margin: 7px 0; color: var(--text-primary); font-size: var(--font-size-title); text-transform: uppercase; }
p { color: var(--text-secondary); }
.git-feedback-slot { display: grid; min-height: 48px; align-items: center; }
.git-feedback-slot .git-message { margin-top: 0; }
.git-band { border-bottom: 1px solid var(--border-muted); padding: 18px 0; }
.status-band { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; }
.status-band > div { display: grid; gap: 6px; min-width: 0; }
.status-band strong { overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.init-button, .commit-button, .sync-button { --button-color: var(--career); }
.location-band { display: grid; gap: 12px; }
.location-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(140px, .5fr) minmax(140px, .5fr); gap: 10px; }
.location-grid > div { min-width: 0; border: 1px solid var(--border-muted); background: var(--background-panel); padding: 10px; }
.location-grid code, .location-grid strong { display: block; overflow: hidden; margin-top: 5px; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.change-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 14px; }
.change-group { min-width: 0; border: 1px solid var(--border-muted); background: var(--background-panel); padding: 12px; }
.change-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) 28px; align-items: center; gap: 8px; margin-top: 8px; color: var(--text-secondary); }
.change-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: none; }
.change-discard { display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid var(--border-muted); background: transparent; color: var(--text-muted); cursor: pointer; padding: 0; }
.change-discard:hover:not(:disabled) { border-color: var(--game-dev); color: var(--game-dev); }
.change-discard:disabled { cursor: not-allowed; opacity: .45; }
.conflict-label { color: var(--game-dev); }
.commit-controls { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: 12px; margin-top: 14px; }
input { min-width: 0; border: 1px solid var(--border-primary); border-radius: 0; background: var(--background-panel); color: var(--text-primary); font: inherit; padding: 11px; }
.group-checks { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.group-checks label { color: var(--text-secondary); font-size: var(--font-size-small); text-transform: uppercase; }
.commit-note { margin: 10px 0 0; color: var(--text-muted); font-size: var(--font-size-small); }
.remote-row { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto auto; gap: 10px; margin-top: 14px; }
.sync-actions { display: flex; gap: 10px; margin-top: 14px; }
.remote-progress { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 30px; margin-top: 12px; color: var(--text-muted); font-size: var(--font-size-small); text-transform: uppercase; }
.remote-progress > span { position: relative; height: 3px; overflow: hidden; border: 1px solid var(--border-muted); background: var(--background-main); }
.remote-progress > span::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 0; background: var(--career); opacity: .32; }
.remote-progress.is-active > span::before { width: 38%; opacity: 1; animation: remote-progress-slide 1.1s linear infinite; }
.remote-progress.is-active strong { color: var(--career); }
.remote-progress.has-notice:not(.is-active) strong { color: var(--career); }
.remote-progress.has-notice:not(.is-active) > span::before { width: 100%; opacity: 1; }
.remote-progress.has-error:not(.is-active) strong { color: var(--game-dev); }
.remote-progress.has-error:not(.is-active) > span { border-color: var(--game-dev); }
.remote-progress.has-error:not(.is-active) > span::before { width: 100%; background: var(--game-dev); opacity: .45; }
.history-list { display: grid; gap: 8px; margin-top: 14px; }
.history-row { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; align-items: center; gap: 12px; border: 1px solid var(--border-muted); background: var(--background-panel); padding: 10px; }
.history-row > div { display: grid; min-width: 0; }
.history-row strong { overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.git-message { margin-top: 14px; border: 1px solid var(--career); color: var(--text-secondary); background: var(--background-panel); padding: 12px; white-space: pre-wrap; }
.git-message--busy { display: inline-flex; align-items: center; gap: 10px; color: var(--career); }
.git-message--warning { border-color: var(--career); color: var(--career); }
.git-message--error { border-color: var(--game-dev); color: var(--game-dev); }
.git-spinner { width: 13px; height: 13px; border: 2px solid color-mix(in srgb, var(--career), transparent 62%); border-top-color: var(--career); animation: git-spin .8s linear infinite; }
.git-spinner--small { width: 11px; height: 11px; border-width: 2px; }
@keyframes git-spin { to { transform: rotate(360deg); } }
@keyframes remote-progress-slide { 0% { transform: translateX(-105%); } 100% { transform: translateX(270%); } }
@media (max-width: 980px) { .status-band, .commit-controls, .remote-row, .location-grid { grid-template-columns: 1fr; } .history-row { grid-template-columns: 72px minmax(0, 1fr); } .history-row button { grid-column: 1 / -1; } }
</style>
