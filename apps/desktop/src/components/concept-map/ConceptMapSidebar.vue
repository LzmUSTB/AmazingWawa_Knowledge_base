<script setup>
import { computed, ref, watch } from "vue";
import { findGraphNode, useActiveVault } from "../../graph/graph-data-store.js";
import AppIcon from "../ui/AppIcon.vue";
import NoteBlockRenderer from "../note/NoteBlockRenderer.vue";

const props = defineProps({
  canSave: { type: Boolean, default: false },
  mapId: { type: String, default: "" },
  saving: { type: Boolean, default: false },
  selection: { type: Object, default: () => ({ kind: "", id: "" }) },
});

const emit = defineEmits(["delete-element", "open-note", "save-element"]);

const activeVault = useActiveVault();
const editing = ref(false);
const deleteArmed = ref(false);
const draft = ref({});

const conceptMap = computed(() => activeVault.value.conceptMaps?.byId?.[props.mapId] || null);
const selectedNode = computed(() => (
  props.selection?.kind === "node"
    ? conceptMap.value?.nodes?.find((node) => node.id === props.selection.id) || null
    : null
));
const selectedRelation = computed(() => (
  props.selection?.kind === "relation"
    ? conceptMap.value?.relations?.find((relation) => relation.id === props.selection.id) || null
    : null
));
const selectedEntity = computed(() => selectedNode.value || selectedRelation.value);
const selectedOwnerNode = computed(() => findGraphNode(selectedNode.value?.ownerNodeId));

const relationTypeById = computed(() => Object.fromEntries(
  (conceptMap.value?.relationTypes || []).map((type) => [type.id, type]),
));
const relationLocaleFallback = {
  requires: "依赖",
  "equivalent-if": "条件等价",
  characterizes: "刻画",
  decomposes: "分解",
  specializes: "特化",
  theorem: "定理",
  implies: "推出",
  "related-to": "相关",
};

function displayTitle(entity, fallback = "") {
  return String(entity?.titleLocale || entity?.title || entity?.id || fallback).trim();
}

function conceptTitle(id) {
  return displayTitle(conceptMap.value?.nodes?.find((node) => node.id === id), id);
}

function relationTitle(relation) {
  const type = relationTypeById.value[relation?.type] || {};
  return relation?.labelLocale
    || relation?.label_locale
    || type.labelLocale
    || type.label_locale
    || relationLocaleFallback[relation?.type]
    || relation?.label
    || type.label
    || relation?.type
    || "关系";
}

function startEditing() {
  const entity = selectedEntity.value;
  if (!entity) return;
  deleteArmed.value = false;
  if (selectedNode.value) {
    draft.value = {
      titleLocale: entity.titleLocale || "",
      title: entity.title || "",
      kind: entity.kind || entity.type || "concept",
      formula: entity.formula || entity.expression || "",
      summary: entity.summary || "",
      layer: entity.layer || "",
      ownerNodeId: entity.ownerNodeId || "",
    };
  } else {
    draft.value = {
      labelLocale: entity.labelLocale || entity.label_locale || "",
      label: entity.label || "",
      type: entity.type || "",
      direction: entity.direction || relationTypeById.value[entity.type]?.direction || "forward",
      from: entity.from || "",
      to: entity.to || "",
      condition: entity.condition || "",
      formula: entity.formula || "",
      explanation: entity.explanation || "",
    };
  }
  editing.value = true;
}

function saveEditing() {
  if (!selectedEntity.value || props.saving) return;
  emit("save-element", {
    mapId: props.mapId,
    kind: selectedRelation.value ? "relation" : "node",
    id: selectedEntity.value.id,
    changes: { ...draft.value },
  });
  editing.value = false;
}

function requestDelete() {
  if (!selectedEntity.value || props.saving) return;
  if (!deleteArmed.value) {
    deleteArmed.value = true;
    return;
  }
  emit("delete-element", {
    mapId: props.mapId,
    kind: selectedRelation.value ? "relation" : "node",
    id: selectedEntity.value.id,
  });
  deleteArmed.value = false;
  editing.value = false;
}

watch(
  () => [props.mapId, props.selection?.kind, props.selection?.id],
  () => {
    editing.value = false;
    deleteArmed.value = false;
    draft.value = {};
  },
);
</script>

<template>
  <div class="concept-sidebar-content">
    <section v-if="!selectedEntity" class="concept-sidebar-section">
      <div class="section-label">当前关系网</div>
      <h2>{{ displayTitle(conceptMap, "概念关系网") }}</h2>
      <p v-if="conceptMap?.summary" class="body-copy">{{ conceptMap.summary }}</p>
      <div class="map-stats">
        <span><strong>{{ conceptMap?.nodes?.length || 0 }}</strong> 节点</span>
        <span><strong>{{ conceptMap?.relations?.length || 0 }}</strong> 关系</span>
      </div>
      <p class="empty-line">选择一个节点或一条关系后，可在这里查看、编辑或删除。</p>
    </section>

    <template v-else>
      <section class="concept-sidebar-section selected-concept">
        <div class="section-label">{{ selectedRelation ? "选中关系" : selectedNode?.kind === "formula" ? "选中公式" : "选中概念" }}</div>
        <h2>{{ selectedRelation ? relationTitle(selectedRelation) : displayTitle(selectedNode) }}</h2>
        <p class="entity-id">{{ selectedEntity.id }}</p>
        <p v-if="selectedRelation" class="relation-endpoints">
          {{ conceptTitle(selectedRelation.from) }} → {{ conceptTitle(selectedRelation.to) }}
        </p>
      </section>

      <section v-if="editing" class="concept-sidebar-section edit-form">
        <div class="section-label">直接编辑</div>

        <template v-if="selectedNode">
          <label>
            <span>中文名称</span>
            <input v-model="draft.titleLocale" type="text" />
          </label>
          <label>
            <span>英文名称</span>
            <input v-model="draft.title" type="text" />
          </label>
          <label>
            <span>节点类型</span>
            <select v-model="draft.kind">
              <option value="concept">概念</option>
              <option value="formula">公式</option>
              <option value="theorem">定理</option>
            </select>
          </label>
          <label>
            <span>数学表达</span>
            <textarea v-model="draft.formula" rows="3"></textarea>
          </label>
          <label>
            <span>文字说明</span>
            <textarea v-model="draft.summary" rows="5"></textarea>
          </label>
          <label>
            <span>分组</span>
            <select v-model="draft.layer">
              <option value="">未分组</option>
              <option v-for="layer in conceptMap?.layers || []" :key="layer.id" :value="layer.id">
                {{ layer.titleLocale || layer.title || layer.id }}
              </option>
            </select>
          </label>
          <label>
            <span>对应知识库节点 ID</span>
            <input v-model="draft.ownerNodeId" type="text" />
          </label>
        </template>

        <template v-else>
          <label>
            <span>中文关系名称</span>
            <input v-model="draft.labelLocale" type="text" />
          </label>
          <label>
            <span>关系类型</span>
            <select v-model="draft.type">
              <option v-for="type in conceptMap?.relationTypes || []" :key="type.id" :value="type.id">
                {{ type.labelLocale || type.label_locale || relationLocaleFallback[type.id] || type.label || type.id }}
              </option>
            </select>
          </label>
          <label>
            <span>起点</span>
            <select v-model="draft.from">
              <option v-for="node in conceptMap?.nodes || []" :key="node.id" :value="node.id">
                {{ displayTitle(node) }}
              </option>
            </select>
          </label>
          <label>
            <span>终点</span>
            <select v-model="draft.to">
              <option v-for="node in conceptMap?.nodes || []" :key="node.id" :value="node.id">
                {{ displayTitle(node) }}
              </option>
            </select>
          </label>
          <label>
            <span>方向</span>
            <select v-model="draft.direction">
              <option value="forward">正向</option>
              <option value="reverse">反向</option>
              <option value="both">双向</option>
              <option value="none">无箭头</option>
            </select>
          </label>
          <label>
            <span>适用条件</span>
            <textarea v-model="draft.condition" rows="3"></textarea>
          </label>
          <label>
            <span>相关公式</span>
            <textarea v-model="draft.formula" rows="3"></textarea>
          </label>
          <label>
            <span>关系说明</span>
            <textarea v-model="draft.explanation" rows="5"></textarea>
          </label>
        </template>

        <div class="form-actions">
          <button class="hud-button" type="button" :disabled="saving" @click="editing = false">取消</button>
          <button class="hud-button button-with-icon" type="button" :disabled="!canSave || saving"
            style="--button-color: var(--career)" @click="saveEditing">
            <AppIcon name="save" />
            <span>{{ saving ? "保存中" : "保存修改" }}</span>
          </button>
        </div>
      </section>

      <template v-else>
        <section class="concept-sidebar-section">
          <div class="section-label">内容</div>
          <template v-if="selectedNode">
            <NoteBlockRenderer v-if="selectedNode.formula" class="compact-markdown" :markdown="selectedNode.formula"
              :block-registry="activeVault.blockRegistry" />
            <NoteBlockRenderer v-if="selectedNode.summary" class="compact-markdown" :markdown="selectedNode.summary"
              :block-registry="activeVault.blockRegistry" />
            <p v-if="!selectedNode.formula && !selectedNode.summary" class="empty-line">暂无公式或文字说明。</p>
          </template>
          <template v-else>
            <div v-if="selectedRelation.condition" class="detail-field">
              <strong>适用条件</strong>
              <NoteBlockRenderer class="compact-markdown" :markdown="selectedRelation.condition"
                :block-registry="activeVault.blockRegistry" />
            </div>
            <div v-if="selectedRelation.formula" class="detail-field">
              <strong>相关公式</strong>
              <NoteBlockRenderer class="compact-markdown" :markdown="selectedRelation.formula"
                :block-registry="activeVault.blockRegistry" />
            </div>
            <div v-if="selectedRelation.explanation" class="detail-field">
              <strong>关系说明</strong>
              <NoteBlockRenderer class="compact-markdown" :markdown="selectedRelation.explanation"
                :block-registry="activeVault.blockRegistry" />
            </div>
            <p v-if="!selectedRelation.condition && !selectedRelation.formula && !selectedRelation.explanation"
              class="empty-line">暂无关系说明。</p>
          </template>
        </section>

        <section class="concept-sidebar-section">
          <div class="section-label">操作</div>
          <div class="action-grid">
            <button v-if="selectedOwnerNode" class="hud-button button-with-icon" type="button"
              style="--button-color: var(--simulation)" @click="$emit('open-note', selectedOwnerNode.id)">
              <AppIcon name="file-text" />
              <span>打开对应笔记</span>
            </button>
            <button class="hud-button button-with-icon" type="button" :disabled="!canSave || saving"
              style="--button-color: var(--career)" @click="startEditing">
              <AppIcon name="edit" />
              <span>编辑</span>
            </button>
            <button class="hud-button button-with-icon" type="button" :disabled="!canSave || saving"
              style="--button-color: var(--game-dev)" @click="requestDelete">
              <AppIcon name="delete" />
              <span>{{ deleteArmed ? "再次点击确认删除" : "删除" }}</span>
            </button>
          </div>
          <p v-if="deleteArmed" class="delete-warning">
            {{ selectedNode ? "删除节点会同时删除与它相连的关系。" : "该关系将从概念网文件中移除。" }}
          </p>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.concept-sidebar-content {
  height: calc(100vh - 98px);
  overflow: auto;
  padding: 16px;
}

.concept-sidebar-section {
  display: grid;
  gap: 10px;
  justify-items: stretch;
  border-bottom: 1px solid var(--border-muted);
  margin-bottom: 16px;
  padding: 0 0 16px;
}

.section-label,
label > span,
.detail-field > strong {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.2;
}

.entity-id,
.relation-endpoints,
.empty-line,
.body-copy,
.delete-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-small);
  line-height: 1.55;
}

.entity-id {
  text-transform: uppercase;
}

.relation-endpoints {
  color: var(--text-secondary);
}

.map-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  border: 1px solid var(--border-muted);
}

.map-stats span {
  display: grid;
  gap: 3px;
  padding: 10px;
  color: var(--text-muted);
  font-size: var(--font-size-small);
}

.map-stats span + span {
  border-left: 1px solid var(--border-muted);
}

.map-stats strong {
  color: var(--text-primary);
  font-size: var(--font-size-title);
}

.edit-form label {
  display: grid;
  gap: 6px;
  width: 100%;
}

input,
select,
textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-muted);
  border-radius: 0;
  outline: 0;
  background: var(--background-panel);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-small);
  padding: 8px 9px;
}

input,
select {
  min-height: 36px;
}

textarea {
  resize: vertical;
  line-height: 1.5;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--relation-node-color, var(--graphics));
}

.form-actions,
.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-field {
  display: grid;
  gap: 7px;
  width: 100%;
}

.compact-markdown {
  width: 100%;
}

.compact-markdown :deep(.note-renderer),
.compact-markdown :deep(.markdown-document) {
  width: 100%;
  gap: 8px;
  margin: 0;
}

.compact-markdown :deep(.doc-paragraph) {
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.55;
}

.compact-markdown :deep(mjx-container[display="true"]) {
  margin: 5px 0;
}

.delete-warning {
  color: var(--game-dev);
}
</style>
