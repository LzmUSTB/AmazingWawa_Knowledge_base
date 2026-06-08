<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="note-editor">
    <textarea
      :value="modelValue"
      spellcheck="false"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
  </div>
</template>

<style scoped>
.note-editor {
  display: flex;
  min-height: 0;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}

textarea {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: min(560px, calc(100vh - 220px));
  max-width: 100%;
  border: 0;
  border-radius: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  padding: 22px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
