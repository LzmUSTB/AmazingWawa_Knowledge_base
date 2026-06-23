<script setup>
import { ref } from "vue";
import { chooseVaultDestinationFolder, openActiveVaultInExplorer } from "../../data/desktop-vault-adapter.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({ vaultPath: { type: String, default: "" }, busy: { type: Boolean, default: false }, error: { type: String, default: "" } });
const emit = defineEmits(["move-vault", "show-setup"]);
const destinationPath = ref("");
const localError = ref("");

async function browseDestination() {
  const path = await chooseVaultDestinationFolder();
  if (path) destinationPath.value = path;
}

async function handleOpenActiveVaultInExplorer() {
  localError.value = "";
  try {
    await openActiveVaultInExplorer();
  } catch (error) {
    localError.value = `Failed to open vault folder: ${error?.message || error}`;
  }
}
</script>

<template>
  <section class="vault-settings technical-grid">
    <header><div class="section-kicker">Vault Settings</div><h1>Active Vault</h1><p>Kinjito maintains one active vault. Location changes use copy, verify, then switch.</p></header>
    <section class="settings-band">
      <div><strong>Current Vault Path</strong><code>{{ vaultPath }}</code></div>
      <button class="hud-button button-with-icon" type="button" @click="handleOpenActiveVaultInExplorer"><AppIcon name="folder-open" /><span>Open in Explorer</span></button>
    </section>
    <section class="settings-band settings-band--stack">
      <div><strong>Move Vault</strong><p>The old vault is retained after the verified copy becomes active.</p></div>
      <div class="move-row"><input v-model.trim="destinationPath" placeholder="Empty destination folder" /><button class="hud-button" type="button" @click="browseDestination">Browse</button><button class="hud-button move-button" type="button" :disabled="busy || !destinationPath" @click="$emit('move-vault', destinationPath)">{{ busy ? "MOVING..." : "MOVE VAULT" }}</button></div>
    </section>
    <section class="settings-band">
      <div><strong>Replace Active Vault</strong><p>Create, clone, or import another vault into a new active location.</p></div>
      <button class="hud-button" type="button" @click="$emit('show-setup')">OPEN SETUP</button>
    </section>
    <pre v-if="localError || props.error" class="error-block">{{ localError || props.error }}</pre>
  </section>
</template>

<style scoped>
.vault-settings { height: 100%; overflow: auto; padding: 28px; }
header { border-bottom: 1px solid var(--border-primary); padding-bottom: 20px; }
.section-kicker { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
h1 { margin: 8px 0; color: var(--text-primary); font-size: var(--font-size-title); text-transform: uppercase; }
p { margin: 4px 0 0; color: var(--text-secondary); line-height: 1.6; }
.settings-band { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid var(--border-muted); padding: 22px 0; }
.settings-band--stack { display: grid; }
.settings-band strong { display: block; color: var(--text-primary); text-transform: uppercase; }
code { display: block; margin-top: 8px; color: var(--career); overflow-wrap: anywhere; }
.move-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; }
input { min-width: 0; border: 1px solid var(--border-primary); border-radius: 0; background: var(--background-panel); color: var(--text-primary); font: inherit; padding: 12px; }
.move-button { --button-color: var(--career); }
.error-block { border: 1px solid var(--game-dev); color: var(--game-dev); background: var(--background-panel); padding: 12px; white-space: pre-wrap; }
@media (max-width: 760px) { .settings-band { align-items: stretch; flex-direction: column; } .move-row { grid-template-columns: 1fr; } }
</style>
