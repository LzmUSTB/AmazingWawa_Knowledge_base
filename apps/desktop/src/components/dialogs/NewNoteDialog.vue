<script setup>
import { computed, ref, watch } from "vue";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES } from "../../../../../packages/knowledge-core/src/index.js";
import { getDomains, getGraphNodes } from "../../graph/graph-data-store.js";
import { getGraphScope, isDomainNode } from "../../graph/graph-scope.js";

const props = defineProps({
  currentDomain: {
    type: String,
    required: true,
  },
  currentView: {
    type: String,
    default: "graph",
  },
  graphScopeId: {
    type: String,
    required: true,
  },
  selectedNodeId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close", "create-note"]);

const nodeTypes = KNOWLEDGE_TYPES.filter((type) => type !== "domain");
const statusOptions = KNOWLEDGE_STATUS.filter((status) => status !== "domain");
const domains = computed(() => getDomains());
const nodes = computed(() => getGraphNodes());
const nodeIds = computed(() => new Set(nodes.value.map((node) => node.id)));
const parentCandidates = computed(() =>
  nodes.value.filter((node) => node.id === domain.value || node.domain === domain.value),
);

const title = ref("");
const id = ref("");
const domain = ref(props.currentDomain);
const type = ref("concept");
const status = ref("seed");
const summary = ref("");
const parentId = ref(defaultParentId());
const idTouched = ref(false);

function slugFromTitle(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultParentId() {
  const scope = getGraphScope(props.graphScopeId);
  if (scope.type === "domain") return scope.id;
  if (scope.type === "focus") return scope.centerNodeId || scope.id;
  if (props.selectedNodeId && isDomainNode(props.selectedNodeId)) return props.selectedNodeId;
  return props.currentDomain;
}

function parentBelongsToDomain(parentNodeId) {
  return parentCandidates.value.some((node) => node.id === parentNodeId);
}

function resetParentForDomain() {
  parentId.value = parentCandidates.value.some((node) => node.id === domain.value)
    ? domain.value
    : parentCandidates.value[0]?.id || "";
}

watch(
  () => props.currentDomain,
  (nextDomain) => {
    domain.value = nextDomain;
    const nextParentId = defaultParentId();
    parentId.value = parentBelongsToDomain(nextParentId) ? nextParentId : nextDomain;
  },
);

watch(domain, () => {
  resetParentForDomain();
});

watch(title, (nextTitle) => {
  if (!idTouched.value) id.value = slugFromTitle(nextTitle);
});

const idValid = computed(() => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id.value));
const domainValid = computed(() => domains.value.some((item) => item.id === domain.value));
const parentValid = computed(() => nodeIds.value.has(parentId.value) && parentBelongsToDomain(parentId.value));
const formValid = computed(
  () =>
    title.value.trim() &&
    id.value.trim() &&
    idValid.value &&
    domainValid.value &&
    parentValid.value &&
    nodeTypes.includes(type.value) &&
    statusOptions.includes(status.value) &&
    !nodeIds.value.has(id.value),
);

function submit() {
  if (!formValid.value) return;
  emit("create-note", {
    title: title.value.trim(),
    id: id.value.trim(),
    domain: domain.value,
    type: type.value,
    status: status.value,
    summary: summary.value.trim(),
    parentId: parentId.value,
  });
}
</script>

<template>
  <div class="dialog-card new-note">
    <div class="dialog-accent"></div>
    <header>
      <h2>New Knowledge Node</h2>
      <p>Create a vault item and link it to the selected parent with a contains edge.</p>
    </header>

    <label>
      <span>Title</span>
      <input v-model="title" autofocus placeholder="Deferred Rendering" />
    </label>

    <label>
      <span>ID</span>
      <input
        v-model="id"
        placeholder="deferred-rendering"
        @input="idTouched = true"
      />
      <code v-if="id && !idValid">Use lowercase kebab-case letters, numbers, and hyphens.</code>
      <code v-else-if="nodeIds.has(id)">This ID already exists.</code>
    </label>

    <div class="dialog-grid">
      <label>
        <span>Domain</span>
        <select v-model="domain">
          <option v-for="item in domains" :key="item.id" :value="item.id">
            {{ item.title }} / {{ item.id }}
          </option>
        </select>
      </label>

      <label>
        <span>Parent</span>
        <select v-model="parentId">
          <option v-for="node in parentCandidates" :key="node.id" :value="node.id">
            {{ node.title }} / {{ node.id }}
          </option>
        </select>
        <code>Parent creates a contains edge. Use New Link later for cross-domain relationships.</code>
      </label>
    </div>

    <div class="dialog-grid">
      <label>
        <span>Type</span>
        <select v-model="type">
          <option v-for="item in nodeTypes" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select v-model="status">
          <option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
    </div>

    <label>
      <span>Summary</span>
      <textarea v-model="summary" placeholder="One-sentence summary"></textarea>
    </label>

    <footer>
      <button class="hud-button" @click="$emit('close')">Cancel</button>
      <button
        class="hud-button"
        :disabled="!formValid"
        style="--button-color: var(--graphics)"
        @click="submit"
      >
        Create Note
      </button>
    </footer>
  </div>
</template>

<style scoped>
.new-note {
  width: min(640px, calc(100vw - 48px));
}

code {
  color: var(--career);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
}

textarea {
  min-height: 88px;
  width: 100%;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  resize: vertical;
  background: var(--background-main);
  color: var(--text-primary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 12px;
}

textarea:focus {
  border-color: var(--border-primary);
}

.hud-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
