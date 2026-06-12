<script setup>
import { computed, ref, watch } from "vue";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES } from "../../../../../packages/knowledge-core/src/index.js";
import { findGraphNode, getDomains } from "../../graph/graph-data-store.js";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps({
  target: { type: Object, default: null },
});

const emit = defineEmits(["close", "save"]);

const nodeTypes = KNOWLEDGE_TYPES.filter((type) => type !== "domain");
const statusOptions = KNOWLEDGE_STATUS.filter((status) => status !== "domain");

const entity = computed(() => {
  if (props.target?.kind === "domain") return getDomains().find((domain) => domain.id === props.target.id) || null;
  if (props.target?.kind === "node") return findGraphNode(props.target.id) || null;
  return null;
});
const isDomain = computed(() => props.target?.kind === "domain");

const title = ref("");
const titleLocale = ref("");
const description = ref("");
const descriptionLocale = ref("");
const color = ref("#EDEDED");
const order = ref(999);
const summary = ref("");
const summaryLocale = ref("");
const type = ref("concept");
const status = ref("seed");

watch(entity, (nextEntity) => {
  title.value = nextEntity?.title || "";
  titleLocale.value = nextEntity?.titleLocale || "";
  description.value = nextEntity?.description || "";
  descriptionLocale.value = nextEntity?.descriptionLocale || "";
  color.value = nextEntity?.color || "#EDEDED";
  order.value = nextEntity?.order ?? 999;
  summary.value = nextEntity?.summary || "";
  summaryLocale.value = nextEntity?.summaryLocale || "";
  type.value = nextEntity?.type === "domain" ? "concept" : nextEntity?.type || "concept";
  status.value = nextEntity?.status === "domain" ? "seed" : nextEntity?.status || "seed";
}, { immediate: true });

const formValid = computed(() => Boolean(entity.value && title.value.trim()));

function submit() {
  if (!formValid.value) return;
  emit("save", isDomain.value
    ? {
        kind: "domain",
        id: entity.value.id,
        title: title.value.trim(),
        titleLocale: titleLocale.value.trim(),
        description: description.value.trim(),
        descriptionLocale: descriptionLocale.value.trim(),
        color: color.value.trim() || "#EDEDED",
        order: Number(order.value) || 999,
      }
    : {
        kind: "node",
        id: entity.value.id,
        title: title.value.trim(),
        titleLocale: titleLocale.value.trim(),
        summary: summary.value.trim(),
        summaryLocale: summaryLocale.value.trim(),
        type: type.value,
        status: status.value,
      });
}
</script>

<template>
  <div class="dialog-card edit-entity-dialog">
    <div class="dialog-accent"></div>
    <header>
      <h2>Edit {{ isDomain ? "Domain" : "Node" }}</h2>
      <p>ID changes are disabled in this version.</p>
    </header>

    <section v-if="!entity" class="empty-state">Target was not found.</section>
    <template v-else>
      <label><span>ID</span><input :value="entity.id" disabled /></label>
      <div class="dialog-grid">
        <label><span>English title</span><input v-model="title" autofocus /></label>
        <label><span>Locale title</span><input v-model="titleLocale" /></label>
      </div>

      <template v-if="isDomain">
        <label><span>English description</span><textarea v-model="description"></textarea></label>
        <label><span>Locale description</span><textarea v-model="descriptionLocale"></textarea></label>
        <div class="dialog-grid">
          <label><span>Color</span><input v-model="color" /></label>
          <label><span>Order</span><input v-model.number="order" type="number" /></label>
        </div>
      </template>

      <template v-else>
        <label><span>English summary</span><textarea v-model="summary"></textarea></label>
        <label><span>Locale summary</span><textarea v-model="summaryLocale"></textarea></label>
        <div class="dialog-grid">
          <label><span>Type</span><select v-model="type"><option v-for="item in nodeTypes" :key="item" :value="item">{{ item }}</option></select></label>
          <label><span>Status</span><select v-model="status"><option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option></select></label>
        </div>
      </template>
    </template>

    <footer>
      <button class="hud-button button-with-icon" @click="$emit('close')"><AppIcon name="x" /><span class="button-icon-label">Cancel</span></button>
      <button class="hud-button button-with-icon" :disabled="!formValid" style="--button-color: var(--graphics)" @click="submit">
        <AppIcon name="layout-save" /><span class="button-icon-label">Save</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.edit-entity-dialog { width: min(700px, calc(100vw - 48px)); max-height: calc(100vh - 96px); overflow: auto; }
.empty-state { margin-inline: 28px; border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-secondary); padding: 16px; }
textarea { min-height: 82px; width: 100%; border: 1px solid var(--border-muted); border-radius: 0; outline: 0; resize: vertical; background: var(--background-main); color: var(--text-primary); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-ui); line-height: 1.5; padding: 12px; }
textarea:focus { border-color: var(--border-primary); }
input:disabled { opacity: 0.55; cursor: not-allowed; }
.hud-button:disabled { cursor: not-allowed; opacity: 0.42; }
</style>
