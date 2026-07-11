<script setup>
import AppIcon from "../ui/AppIcon.vue";

defineEmits(["show-view"]);
</script>

<template>
  <section class="tools-view technical-grid">
    <header class="tools-header">
      <div class="tools-heading">
        <AppIcon name="tools" :size="24" />
        <div>
          <div class="panel-label" style="--label-color: var(--tools)">Utilities</div>
          <h1>Tools</h1>
        </div>
      </div>
    </header>

    <main class="tools-grid" aria-label="Available tools">
      <button class="tool-card" type="button" @click="$emit('show-view', 'source-snapshot')">
        <span class="tool-card__icon"><AppIcon name="capture" :size="24" /></span>
        <span class="tool-card__body">
          <strong>Capture</strong>
          <span>Capture a web page with local Chromium and save it as a portable snapshot zip.</span>
        </span>
        <AppIcon class="tool-card__arrow" name="chevron-right" :size="16" />
      </button>

      <button class="tool-card" type="button" @click="$emit('show-view', 'vault-package-export')">
        <span class="tool-card__icon"><AppIcon name="export" :size="24" /></span>
        <span class="tool-card__body">
          <strong>Export Vault Package</strong>
          <span>Export all domains, nodes, notes, assets, relations, and ExerciseSets as a shareable .wawapkg.</span>
        </span>
        <AppIcon class="tool-card__arrow" name="chevron-right" :size="16" />
      </button>

      <button class="tool-card" type="button" @click="$emit('show-view', 'integrations-guide')">
        <span class="tool-card__icon"><AppIcon name="git-branch" :size="24" /></span>
        <span class="tool-card__body">
          <strong>Skills &amp; Plugins Guide</strong>
          <span>Install, invoke, update, and safely use the Kinjito Agent Skill and GitHub-backed MCP Plugin.</span>
        </span>
        <AppIcon class="tool-card__arrow" name="chevron-right" :size="16" />
      </button>
    </main>
  </section>
</template>

<style scoped>
.tools-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--background-main);
}

.tools-header {
  display: flex;
  align-items: center;
  min-height: 76px;
  border-bottom: 1px solid var(--border-muted);
  background: var(--background-panel);
  padding: 14px 18px;
}

.tools-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--tools);
}

.tools-heading h1 {
  margin: 5px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  text-transform: uppercase;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 360px));
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.tool-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  min-height: 116px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--tools);
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-primary);
  cursor: pointer;
  padding: 14px;
  text-align: left;
}

.tool-card:hover,
.tool-card:focus-visible {
  border-color: var(--tools);
  outline: none;
}

.tool-card__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--tools);
  color: var(--tools);
}

.tool-card__body {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.tool-card__body strong {
  color: var(--text-primary);
  font-size: var(--font-size-ui);
  text-transform: uppercase;
}

.tool-card__body span {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.5;
}

.tool-card__arrow {
  color: var(--tools);
}
</style>
