<script setup>
import { computed, ref, watch } from "vue";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES } from "../../../../../packages/knowledge-core/src/index.js";
import { getDomains, getGraphNodes } from "../../graph/graph-data-store.js";
import { getGraphScope, isDomainNode } from "../../graph/graph-scope.js";
import NodeFilterList from "../common/NodeFilterList.vue";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  currentDomain: { type: String, required: true },
  graphScopeId: { type: String, required: true },
  selectedNodeId: { type: String, required: true },
});

const emit = defineEmits(["close", "create-node"]);

const nodeTypes = KNOWLEDGE_TYPES.filter((type) => type !== "domain");
const statusOptions = KNOWLEDGE_STATUS.filter((status) => status !== "domain");
const createType = ref("child-node");
const idTouched = ref(false);
const domains = computed(() => getDomains());
const nodes = computed(() => getGraphNodes());
const nodeIds = computed(() => new Set(nodes.value.map((node) => node.id)));
const domainIds = computed(() => new Set(domains.value.map((domain) => domain.id)));

const domainId = ref("");
const domainTitle = ref("");
const domainTitleLocale = ref("");
const domainDescription = ref("");
const domainDescriptionLocale = ref("");
const domainColor = ref("#00B7FF");
const domainOrder = ref(999);

const nodeTitle = ref("");
const nodeTitleLocale = ref("");
const nodeId = ref("");
const nodeDomain = ref(props.currentDomain);
const parentId = ref(defaultParentId());
const nodeType = ref("concept");
const nodeStatus = ref("seed");
const nodeSummary = ref("");
const nodeSummaryLocale = ref("");

const parentCandidates = computed(() => nodes.value.filter((node) => node.id === nodeDomain.value || node.domain === nodeDomain.value));
const parentCandidateIds = computed(() => parentCandidates.value.map((node) => node.id));

function displayTitle(entity) {
  return entity?.titleLocale || entity?.title || entity?.id || "";
}

function slugFromTitle(value) {
  return value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
  const nextParentId = parentBelongsToDomain(parentId.value) ? parentId.value : nodeDomain.value;
  parentId.value = parentCandidates.value.some((node) => node.id === nextParentId) ? nextParentId : parentCandidates.value[0]?.id || "";
}

watch(() => props.currentDomain, (nextDomain) => {
  nodeDomain.value = nextDomain;
  resetParentForDomain();
});
watch(nodeDomain, resetParentForDomain);
watch(nodeTitle, (nextTitle) => {
  if (!idTouched.value) nodeId.value = slugFromTitle(nextTitle);
});
watch(domainTitle, (nextTitle) => {
  if (!idTouched.value) domainId.value = slugFromTitle(nextTitle);
});
watch(createType, () => {
  idTouched.value = false;
});

const activeId = computed(() => (createType.value === "domain" ? domainId.value : nodeId.value));
const idValid = computed(() => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(activeId.value));
const activeIdExists = computed(() => nodeIds.value.has(activeId.value) || domainIds.value.has(activeId.value));
const domainFormValid = computed(() => domainTitle.value.trim() && domainId.value.trim() && idValid.value && !activeIdExists.value);
const nodeFormValid = computed(() =>
  nodeTitle.value.trim() &&
  nodeId.value.trim() &&
  idValid.value &&
  !activeIdExists.value &&
  domainIds.value.has(nodeDomain.value) &&
  nodeIds.value.has(parentId.value) &&
  parentBelongsToDomain(parentId.value) &&
  nodeTypes.includes(nodeType.value) &&
  statusOptions.includes(nodeStatus.value),
);
const formValid = computed(() => createType.value === "domain" ? domainFormValid.value : nodeFormValid.value);

function submit() {
  if (!formValid.value) return;
  if (createType.value === "domain") {
    emit("create-node", {
      kind: "domain",
      id: domainId.value.trim(),
      title: domainTitle.value.trim(),
      titleLocale: domainTitleLocale.value.trim(),
      description: domainDescription.value.trim(),
      descriptionLocale: domainDescriptionLocale.value.trim(),
      color: domainColor.value.trim() || "#EDEDED",
      order: Number(domainOrder.value) || 999,
    });
    return;
  }
  emit("create-node", {
    kind: "node",
    id: nodeId.value.trim(),
    title: nodeTitle.value.trim(),
    titleLocale: nodeTitleLocale.value.trim(),
    domain: nodeDomain.value,
    parentId: parentId.value,
    type: nodeType.value,
    status: nodeStatus.value,
    summary: nodeSummary.value.trim(),
    summaryLocale: nodeSummaryLocale.value.trim(),
    contentFormat: "none",
  });
}
</script>

<template>
  <div class="dialog-card node-dialog">
    <div class="dialog-accent"></div>
    <header>
      <h2>New Node</h2>
      <p>Create graph structure only. Notes can be added later with New Note.</p>
    </header>

    <div class="mode-switch">
      <button type="button" :class="{ 'is-active': createType === 'domain' }" @click="createType = 'domain'">Domain</button>
      <button type="button" :class="{ 'is-active': createType === 'child-node' }" @click="createType = 'child-node'">Child node</button>
    </div>

    <template v-if="createType === 'domain'">
      <label><span>ID</span><input v-model="domainId" autofocus placeholder="optics" @input="idTouched = true" /></label>
      <div class="dialog-grid">
        <label><span>English title</span><input v-model="domainTitle" placeholder="Optics" /></label>
        <label><span>Locale title</span><input v-model="domainTitleLocale" placeholder="光学" /></label>
      </div>
      <label><span>English description</span><textarea v-model="domainDescription" placeholder="Cameras, lenses, and light transport."></textarea></label>
      <label><span>Locale description</span><textarea v-model="domainDescriptionLocale" placeholder="相机、透镜、光线传播与成像。"></textarea></label>
      <div class="dialog-grid">
        <label><span>Color</span><input v-model="domainColor" placeholder="#00B7FF" /></label>
        <label><span>Order</span><input v-model.number="domainOrder" type="number" /></label>
      </div>
    </template>

    <template v-else>
      <div class="dialog-grid">
        <label><span>English title</span><input v-model="nodeTitle" autofocus placeholder="Pinhole Camera" /></label>
        <label><span>Locale title</span><input v-model="nodeTitleLocale" placeholder="小孔相机" /></label>
      </div>
      <label><span>ID</span><input v-model="nodeId" placeholder="pinhole-camera" @input="idTouched = true" /></label>
      <div class="dialog-grid">
        <label>
          <span>Domain</span>
          <select v-model="nodeDomain">
            <option v-for="domain in domains" :key="domain.id" :value="domain.id">{{ displayTitle(domain) }} / {{ domain.id }}</option>
          </select>
        </label>
      </div>
      <div class="picker-block">
        <NodeFilterList
          v-model="parentId"
          :candidate-ids="parentCandidateIds"
          include-domains
          label="Parent"
        />
        <code>Creates a contains edge. Cross-domain parents are not allowed.</code>
      </div>
      <div class="dialog-grid">
        <label><span>Type</span><select v-model="nodeType"><option v-for="item in nodeTypes" :key="item" :value="item">{{ item }}</option></select></label>
        <label><span>Status</span><select v-model="nodeStatus"><option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option></select></label>
      </div>
      <label><span>English summary</span><textarea v-model="nodeSummary" placeholder="One-sentence summary"></textarea></label>
      <label><span>Locale summary</span><textarea v-model="nodeSummaryLocale" placeholder="一句话本地化摘要"></textarea></label>
    </template>

    <code v-if="activeId && !idValid">Use lowercase kebab-case letters, numbers, and hyphens.</code>
    <code v-else-if="activeIdExists">This ID already exists.</code>

    <footer>
      <button class="hud-button button-with-icon" @click="$emit('close')"><AppIcon name="x" /><span class="button-icon-label">Cancel</span></button>
      <button class="hud-button button-with-icon" :disabled="!formValid" style="--button-color: var(--graphics)" @click="submit">
        <AppIcon name="plus-node" /><span class="button-icon-label">Create</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.node-dialog {
  --dialog-pad: 36px;
  width: min(760px, calc(100vw - 48px));
  max-height: calc(100vh - 96px);
  overflow: auto;
}

.node-dialog :deep(header),
.node-dialog > label,
.node-dialog > .dialog-grid,
.node-dialog > .mode-switch,
.node-dialog > .picker-block,
.node-dialog > code,
.node-dialog > footer {
  margin-inline: var(--dialog-pad);
}

.node-dialog > .dialog-grid {
  gap: 24px;
}

.node-dialog > .dialog-grid > label,
.node-dialog :deep(.node-filter-list label) {
  margin-inline: 0;
}

.node-dialog :deep(.node-filter-list) {
  width: 100%;
}

.picker-block {
  display: grid;
  gap: 8px;
}

.picker-block > code {
  margin-inline: 0;
}

.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mode-switch button { min-height: 34px; border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-secondary); cursor: pointer; font-weight: 900; text-transform: uppercase; }
.mode-switch button.is-active, .mode-switch button:hover { border-color: var(--border-primary); color: var(--text-primary); }
code { color: var(--career); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); }
textarea { min-height: 82px; width: 100%; border: 1px solid var(--border-muted); border-radius: 0; outline: 0; resize: vertical; background: var(--background-main); color: var(--text-primary); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-ui); line-height: 1.5; padding: 12px; }
textarea:focus { border-color: var(--border-primary); }
.hud-button:disabled { cursor: not-allowed; opacity: 0.42; }
</style>
