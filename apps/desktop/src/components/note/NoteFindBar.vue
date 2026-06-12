<script setup>
import { nextTick, ref, watch } from "vue";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  currentIndex: {
    type: Number,
    default: 0,
  },
  query: {
    type: String,
    default: "",
  },
  total: {
    type: Number,
    default: 0,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "next", "previous", "update:query"]);
const inputRef = ref(null);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  },
);

function countLabel() {
  if (!props.total) return "0/0";
  return `${props.currentIndex + 1}/${props.total}`;
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    emit(event.shiftKey ? "previous" : "next");
  }
}
</script>

<template>
  <div v-if="visible" class="note-find-bar" @keydown="handleKeydown">
    <input
      ref="inputRef"
      :value="query"
      placeholder="Find in note"
      spellcheck="false"
      @input="$emit('update:query', $event.target.value)"
    />
    <span class="find-count">{{ countLabel() }}</span>
    <button type="button" title="Previous match" aria-label="Previous match" @click="$emit('previous')">
      <AppIcon name="chevron-up" :size="13" />
    </button>
    <button type="button" title="Next match" aria-label="Next match" @click="$emit('next')">
      <AppIcon name="chevron-down" :size="13" />
    </button>
    <button type="button" title="Close find" aria-label="Close find" @click="$emit('close')">
      <AppIcon name="x" :size="13" />
    </button>
  </div>
</template>

<style scoped>
.note-find-bar {
  position: sticky;
  z-index: 12;
  top: 12px;
  display: grid;
  grid-template-columns: minmax(180px, 260px) 54px 30px 30px 30px;
  align-items: center;
  gap: 6px;
  width: min(472px, calc(100% - 32px));
  margin: 12px 16px -58px auto;
  border: 1px solid var(--border-primary);
  background: var(--background-elevated);
  box-shadow: 0 0 0 1px rgba(237, 237, 237, 0.12);
  padding: 6px;
}

input {
  min-width: 0;
  height: 30px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  background: var(--background-main);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 0 8px;
}

input:focus {
  border-color: var(--border-primary);
}

.find-count {
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-align: center;
}

button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  background: var(--background-main);
  color: var(--text-primary);
  cursor: pointer;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
}

button:hover {
  border-color: var(--border-primary);
  background: var(--background-panel);
}
</style>
