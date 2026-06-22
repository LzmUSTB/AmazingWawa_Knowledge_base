<script setup>
defineProps({
  error: {
    type: String,
    default: "",
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

</script>

<template>
  <section class="no-vault-view technical-grid">
    <div class="no-vault-panel">
      <div class="panel-accent"></div>
      <header>
        <p class="panel-label">{{ loading ? "Vault Loader" : "Vault Required" }}</p>
        <h1>{{ loading ? "Loading vault..." : "No Vault Loaded" }}</h1>
      </header>

      <p v-if="!loading" class="body-text">
        The desktop app could not load a vault folder.
      </p>

      <pre v-if="error" class="error-block">{{ error }}</pre>
    </div>
  </section>
</template>

<style scoped>
.no-vault-view {
  display: grid;
  width: 100vw;
  min-height: 100vh;
  place-items: center;
  background-color: var(--background-main);
  padding: 24px;
}

.no-vault-panel {
  display: grid;
  width: min(560px, 100%);
  border: 1px solid var(--border-primary);
  background: var(--background-panel);
}

.panel-accent {
  height: 4px;
  background: var(--graphics);
}

header,
.body-text,
.error-block {
  margin-inline: 28px;
}

header {
  display: grid;
  gap: 10px;
  padding-top: 28px;
}

h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.15;
  text-transform: uppercase;
}

.body-text {
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.6;
}

.error-block {
  overflow: auto;
  margin-top: 18px;
  margin-bottom: 28px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.5;
  padding: 12px;
  white-space: pre-wrap;
}
</style>
