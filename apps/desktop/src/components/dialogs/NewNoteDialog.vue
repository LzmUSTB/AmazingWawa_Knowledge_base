<script setup>
defineProps({
  currentDomain: {
    type: String,
    required: true,
  },
});

defineEmits(["close"]);
</script>

<template>
  <div class="dialog-card new-note">
    <div class="dialog-accent"></div>
    <header>
      <h2>New Knowledge Node</h2>
      <p>Creates meta.yaml, note.md, and assets/ in vault/content.</p>
    </header>
    <label>
      <span>Title</span>
      <input value="Rendering Budget" />
    </label>
    <label>
      <span>Domain</span>
      <select :value="currentDomain">
        <option>graphics</option>
        <option>machine-learning</option>
        <option>web-dev</option>
        <option>simulation</option>
      </select>
    </label>
    <label>
      <span>Generated ID</span>
      <input value="rendering-budget" />
    </label>
    <div class="dialog-grid">
      <label>
        <span>Type</span>
        <select value="concept">
          <option>concept</option>
          <option>topic</option>
          <option>project</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value="seed">
          <option>seed</option>
          <option>growing</option>
          <option>stable</option>
        </select>
      </label>
    </div>
    <footer>
      <button class="hud-button" @click="$emit('close')">Cancel</button>
      <button class="hud-button" style="--button-color: var(--graphics)" @click="$emit('close')">
        Create Note
      </button>
    </footer>
  </div>
</template>

<style scoped>
.dialog-card {
  width: 520px;
}
</style>
