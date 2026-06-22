<script setup>
import { onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  chooseVaultRoot,
  cloneVaultFromRemote,
  createNewVaultAt,
  importVaultToActiveLocation,
  resolveDefaultVaultPath,
} from "../../data/desktop-vault-adapter.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  error: { type: String, default: "" },
  replacement: { type: Boolean, default: false },
});
const emit = defineEmits(["activated", "close"]);

const mode = ref("create");
const destinationPath = ref("");
const sourcePath = ref("");
const remoteUrl = ref("");
const busy = ref(false);
const localError = ref("");
const appWindow = getCurrentWindow();

onMounted(async () => {
  try {
    destinationPath.value = await resolveDefaultVaultPath();
  } catch (error) {
    console.warn("[vault-setup] Failed to resolve suggested path.", error);
  }
});

async function browse(target) {
  const path = await chooseVaultRoot();
  if (!path) return;
  if (target === "source") sourcePath.value = path;
  else destinationPath.value = path;
}

async function submit() {
  if (busy.value) return;
  if (props.replacement && !window.confirm("This will replace the active vault path after the new vault is verified. Continue?")) return;
  busy.value = true;
  localError.value = "";
  try {
    let vault;
    if (mode.value === "create") vault = await createNewVaultAt(destinationPath.value);
    else if (mode.value === "clone") vault = await cloneVaultFromRemote(remoteUrl.value, destinationPath.value);
    else vault = await importVaultToActiveLocation(sourcePath.value, destinationPath.value);
    emit("activated", vault);
  } catch (error) {
    localError.value = String(error?.message || error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="vault-setup technical-grid" :class="{ 'is-replacement': replacement }">
    <div v-if="!replacement" class="setup-window-controls">
      <button type="button" title="Minimize" @click="appWindow.minimize()"><AppIcon name="window-minimize" :size="13" /></button>
      <button type="button" title="Maximize" @click="appWindow.toggleMaximize()"><AppIcon name="window-maximize" :size="13" /></button>
      <button type="button" title="Close" @click="appWindow.close()"><AppIcon name="x" :size="11" /></button>
    </div>
    <header class="setup-header">
      <div>
        <div class="section-kicker">Single Vault Setup</div>
        <h1>{{ replacement ? "Replace Active Vault" : "Configure Kinjito Vault" }}</h1>
        <p>Kinjito maintains one active vault path. A new path becomes active only after its structure is verified.</p>
      </div>
      <button v-if="replacement" class="hud-button button-with-icon" type="button" @click="$emit('close')">
        <AppIcon name="x" /><span>Close</span>
      </button>
    </header>

    <div class="setup-tabs" role="tablist">
      <button v-for="option in [
        ['create', 'Create New Vault'],
        ['clone', 'Clone From Git Remote'],
        ['import', 'Import Existing Vault'],
      ]" :key="option[0]" type="button" :class="{ 'is-active': mode === option[0] }" @click="mode = option[0]">
        {{ option[1] }}
      </button>
    </div>

    <form class="setup-form" @submit.prevent="submit">
      <label v-if="mode === 'clone'">
        <span>Remote URL</span>
        <input v-model.trim="remoteUrl" type="text" placeholder="https://github.com/owner/vault.git" required />
      </label>
      <label v-if="mode === 'import'">
        <span>Source Vault</span>
        <div class="path-input"><input v-model.trim="sourcePath" type="text" required /><button class="hud-button" type="button" @click="browse('source')">Browse</button></div>
      </label>
      <label>
        <span>{{ mode === 'import' ? 'Active Vault Destination' : 'Local Vault Path' }}</span>
        <div class="path-input"><input v-model.trim="destinationPath" type="text" required /><button class="hud-button" type="button" @click="browse('destination')">Browse</button></div>
        <small>The selected folder must be empty or not yet exist.</small>
      </label>

      <div class="operation-summary">
        <strong>{{ mode === 'create' ? 'CREATE' : mode === 'clone' ? 'CLONE + VERIFY' : 'COPY + VERIFY' }}</strong>
        <span v-if="mode === 'create'">Creates the minimum vault files and activates the verified path.</span>
        <span v-else-if="mode === 'clone'">Clones with the system Git CLI, verifies the vault, then activates it.</span>
        <span v-else>Copies the source vault, including .git, then activates the verified copy.</span>
      </div>

      <pre v-if="localError || error" class="error-block">{{ localError || error }}</pre>
      <button class="hud-button submit-button" type="submit" :disabled="busy">
        {{ busy ? "WORKING..." : mode === 'create' ? "CREATE VAULT" : mode === 'clone' ? "CLONE VAULT" : "IMPORT VAULT" }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.vault-setup { min-height: 100vh; overflow: auto; background: var(--background-main); padding: 42px; }
.vault-setup.is-replacement { min-height: 0; height: 100%; }
.setup-window-controls { position: fixed; top: 0; right: 0; display: grid; grid-template-columns: repeat(3, 42px); height: 36px; border: 1px solid var(--border-muted); background: var(--background-panel); }
.setup-window-controls button { display: grid; place-items: center; width: 42px; border: 0; border-radius: 0; background: transparent; color: var(--text-secondary); cursor: pointer; }
.setup-window-controls button:hover { background: var(--background-elevated); color: var(--text-primary); }
.setup-header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid var(--border-primary); padding-bottom: 24px; }
.section-kicker, label > span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
h1 { margin: 8px 0; color: var(--text-primary); font-size: var(--font-size-title); text-transform: uppercase; }
p, small { color: var(--text-secondary); line-height: 1.6; }
.setup-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 26px; border: 1px solid var(--border-primary); }
.setup-tabs button { min-height: 48px; border: 0; border-right: 1px solid var(--border-muted); border-radius: 0; background: var(--background-panel); color: var(--text-muted); cursor: pointer; font: inherit; font-weight: 800; text-transform: uppercase; }
.setup-tabs button:last-child { border-right: 0; }
.setup-tabs button.is-active { box-shadow: inset 0 -4px 0 var(--career); color: var(--text-primary); }
.setup-form { display: grid; gap: 20px; max-width: 980px; margin-top: 28px; }
label { display: grid; gap: 8px; }
input { width: 100%; min-width: 0; border: 1px solid var(--border-primary); border-radius: 0; background: var(--background-panel); color: var(--text-primary); font: inherit; padding: 13px; }
.path-input { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.operation-summary { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 16px; border-block: 1px solid var(--border-muted); color: var(--text-secondary); padding: 16px 0; }
.operation-summary strong { color: var(--career); }
.error-block { margin: 0; border: 1px solid var(--game-dev); color: var(--game-dev); background: var(--background-panel); padding: 12px; white-space: pre-wrap; }
.submit-button { width: max-content; --button-color: var(--career); }
@media (max-width: 760px) { .vault-setup { padding: 24px; } .setup-tabs { grid-template-columns: 1fr; } .setup-tabs button { border-right: 0; border-bottom: 1px solid var(--border-muted); } .path-input { grid-template-columns: 1fr; } }
</style>
