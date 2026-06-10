<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { buildFullTextSearchResults } from "../../search/full-text-search-index.js";
import { buildQuickSearchResults, flattenQuickSearchResults } from "../../search/quick-search-index.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  mode: {
    type: String,
    default: "quick",
  },
  query: {
    type: String,
    default: "",
  },
  visible: {
    type: Boolean,
    default: false,
  },
  pinnedResults: {
    type: Array,
    default: () => [],
  },
  recentResults: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "execute", "update:mode", "update:query"]);

const inputRef = ref(null);
const selectedIndex = ref(0);
const quickGroups = computed(() => buildQuickSearchResults(props.query));
const quickResults = computed(() => flattenQuickSearchResults(quickGroups.value));
const fullTextResults = computed(() => buildFullTextSearchResults(props.query));
const hasQuery = computed(() => props.query.trim().length > 0);
const shortcutResults = computed(() => [...props.pinnedResults, ...props.recentResults]);
const activeResults = computed(() => {
  if (props.mode === "full-text") return hasQuery.value ? fullTextResults.value : [];
  return hasQuery.value ? quickResults.value : shortcutResults.value;
});
const activeModeLabel = computed(() => (props.mode === "quick" ? "Quick Search" : "Full-text"));
const groupSections = computed(() => [
  { key: "nodes", label: "NODES", items: quickGroups.value.nodes || [] },
  { key: "relations", label: "RELATIONS", items: quickGroups.value.relations || [] },
  { key: "domains", label: "DOMAINS", items: quickGroups.value.domains || [] },
]);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    selectedIndex.value = 0;
    nextTick(() => inputRef.value?.focus());
  },
);

watch(
  () => [props.query, props.mode],
  () => {
    selectedIndex.value = 0;
  },
);

watch(activeResults, (results) => {
  if (!results.length) {
    selectedIndex.value = 0;
    return;
  }
  selectedIndex.value = Math.min(selectedIndex.value, results.length - 1);
});

function setMode(mode) {
  emit("update:mode", mode);
}

function toggleMode() {
  setMode(props.mode === "quick" ? "full-text" : "quick");
}

function moveSelection(delta) {
  const count = activeResults.value.length;
  if (!count) return;
  selectedIndex.value = (selectedIndex.value + delta + count) % count;
}

function resultIndex(result) {
  return activeResults.value.findIndex((item) => item.id === result.id);
}

function isSelected(result) {
  return resultIndex(result) === selectedIndex.value;
}

function executeResult(result = activeResults.value[selectedIndex.value], localGraph = false) {
  if (!result) return;
  emit("execute", { result, localGraph, query: props.query });
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    toggleMode();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    executeResult(activeResults.value[selectedIndex.value], event.shiftKey);
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @keydown="handleKeydown">
      <section class="search-panel" role="dialog" aria-modal="true" :aria-label="activeModeLabel">
        <header class="search-bar">
          <input
            ref="inputRef"
            class="search-input"
            :placeholder="mode === 'quick' ? 'Search structured graph index...' : 'Full-text search'"
            :value="query"
            @input="emit('update:query', $event.target.value)"
          />
          <div class="search-mode">
            <button
              class="mode-button button-with-icon"
              :class="{ 'is-active': mode === 'quick' }"
              type="button"
              @click="setMode('quick')"
            >
              <AppIcon name="search" :size="12" />
              <span class="button-icon-label">Quick Search</span>
            </button>
            <button
              class="mode-button button-with-icon"
              :class="{ 'is-active': mode === 'full-text' }"
              type="button"
              @click="setMode('full-text')"
            >
              <AppIcon name="text-search" :size="12" />
              <span class="button-icon-label">Full-text</span>
            </button>
          </div>
        </header>

        <div v-if="mode === 'full-text' && !hasQuery" class="search-empty">
          Type text to search note.md contents and content blocks.
        </div>

        <div v-else-if="mode === 'full-text' && fullTextResults.length" class="result-stack">
          <section class="result-section">
            <div class="result-group-label">FULL-TEXT</div>
            <button
              v-for="result in fullTextResults"
              :key="result.id"
              class="result-row result-row--fulltext"
              :class="{ 'is-selected': isSelected(result) }"
              type="button"
              @click="executeResult(result)"
              @mouseenter="selectedIndex = resultIndex(result)"
            >
              <span class="result-kind">text</span>
              <span class="result-main">
                <strong>{{ result.title }}</strong>
                <small>{{ result.subtitle }}</small>
              </span>
              <span class="result-fulltext">
                <strong>{{ result.section || result.blockType }}</strong>
                <small>{{ result.snippet }}</small>
              </span>
            </button>
          </section>
        </div>

        <div v-else-if="mode === 'full-text'" class="search-empty">No note content matched this query.</div>

        <div v-else-if="!hasQuery" class="result-stack">
          <section class="result-section">
            <div class="result-group-label">PINNED</div>
            <button
              v-for="result in pinnedResults"
              :key="result.id"
              class="result-row"
              :class="{ 'is-selected': isSelected(result) }"
              type="button"
              @click="executeResult(result)"
              @mouseenter="selectedIndex = resultIndex(result)"
            >
              <span class="result-kind">PIN</span>
              <span class="result-main">
                <strong>{{ result.title }}</strong>
                <small>{{ result.subtitle }}</small>
              </span>
              <span class="result-summary">{{ result.summary }}</span>
            </button>
            <p v-if="!pinnedResults.length" class="shortcut-empty">
              No pinned nodes yet. Open a node and choose Pin from the relation sidebar.
            </p>
          </section>

          <section class="result-section">
            <div class="result-group-label">RECENT</div>
            <button
              v-for="result in recentResults"
              :key="result.id"
              class="result-row"
              :class="{ 'is-selected': isSelected(result) }"
              type="button"
              @click="executeResult(result)"
              @mouseenter="selectedIndex = resultIndex(result)"
            >
              <span class="result-kind">recent</span>
              <span class="result-main">
                <strong>{{ result.title }}</strong>
                <small>{{ result.subtitle }}</small>
              </span>
              <span class="result-summary">{{ result.summary }}</span>
            </button>
            <p v-if="!recentResults.length" class="shortcut-empty">No recent nodes yet.</p>
          </section>
        </div>

        <div v-else-if="quickResults.length" class="result-stack">
          <template v-for="section in groupSections" :key="section.key">
            <section v-if="section.items.length" class="result-section">
              <div class="result-group-label">{{ section.label }}</div>
              <button
                v-for="result in section.items"
                :key="result.id"
                class="result-row"
                :class="{ 'is-selected': isSelected(result) }"
                type="button"
                @click="executeResult(result)"
                @mouseenter="selectedIndex = resultIndex(result)"
              >
                <span class="result-kind">{{ result.kind }}</span>
                <span class="result-main">
                  <strong>{{ result.title }}</strong>
                  <small>{{ result.subtitle }}</small>
                </span>
                <span class="result-summary">{{ result.summary }}</span>
              </button>
            </section>
          </template>
        </div>

        <div v-else class="search-empty">No structured graph result matched this query.</div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(0, 0, 0, 0.78);
  padding: 12vh 22px 32px;
}

.search-panel {
  display: grid;
  width: min(920px, 100%);
  max-height: 76vh;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  border-left: 6px solid var(--graphics);
  background: var(--background-main);
  box-shadow: 0 0 0 1px rgba(0, 183, 255, 0.24);
}

.search-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border-bottom: 1px solid var(--border-primary);
  background: var(--background-panel);
}

.search-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}

.mode-button {
  min-height: 30px;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-small);
  font-weight: 900;
  letter-spacing: 0;
  padding: 0 12px;
  text-transform: uppercase;
}

.mode-button.is-active,
.mode-button:hover {
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.result-group-label,
.result-kind {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

.search-input {
  width: 100%;
  min-height: 58px;
  border: 0;
  border-right: 1px solid var(--border-muted);
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: calc(22px * var(--ui-font-scale));
  padding: 0 18px;
}

.result-stack {
  overflow: auto;
  padding: 10px 0 14px;
}

.result-section {
  display: grid;
  gap: 4px;
  padding: 10px 12px 4px;
}

.result-group-label {
  padding: 0 4px 4px;
}

.result-row {
  display: grid;
  grid-template-columns: 86px minmax(180px, 0.8fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 54px;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;
}

.result-row--fulltext {
  grid-template-columns: 72px minmax(160px, 0.56fr) minmax(0, 1fr);
  min-height: 68px;
}

.result-row:hover,
.result-row.is-selected {
  border-color: var(--border-primary);
  background: var(--background-elevated);
  color: var(--text-primary);
}

.result-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.result-fulltext {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.result-main strong,
.result-main small,
.result-fulltext strong,
.result-fulltext small,
.result-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-main strong {
  color: var(--text-primary);
  font-size: var(--font-size-ui);
}

.result-fulltext strong {
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.result-main small,
.result-fulltext small,
.result-summary {
  color: var(--text-muted);
  font-size: var(--font-size-small);
}

.result-fulltext small {
  line-height: 1.45;
  white-space: normal;
}

.search-empty,
.planned-message,
.shortcut-empty {
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.55;
  padding: 22px 18px 28px;
}

.shortcut-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-small);
  padding: 8px 4px 10px;
  text-transform: uppercase;
}

.planned-message {
  border-top: 1px solid var(--border-muted);
  color: var(--career);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
}

@media (max-width: 720px) {
  .search-overlay {
    padding-top: 8vh;
  }

  .search-bar {
    grid-template-columns: 1fr;
  }

  .search-mode {
    border-top: 1px solid var(--border-muted);
    padding: 8px 12px;
  }

  .search-input {
    border-right: 0;
  }

  .result-row {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .result-row--fulltext {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .result-summary,
  .result-fulltext {
    display: none;
  }
}
</style>
