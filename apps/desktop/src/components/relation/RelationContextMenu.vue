<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import { formatRelationLabel } from "../../graph/graph-relations.js";

const props = defineProps({
  edge: {
    type: Object,
    default: null,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["close", "delete", "edit"]);

function handleGlobalPointerDown(event) {
  if (event.target.closest(".relation-context-menu")) return;
  emit("close");
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  emit("close");
}

function menuStyle() {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
  };
}

function editRelation() {
  if (!props.edge) return;
  emit("edit", props.edge.id);
}

function deleteRelation() {
  if (!props.edge) return;
  emit("delete", props.edge.id);
}

onMounted(() => {
  window.addEventListener("pointerdown", handleGlobalPointerDown);
  window.addEventListener("keydown", handleGlobalKeydown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", handleGlobalPointerDown);
  window.removeEventListener("keydown", handleGlobalKeydown, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="edge" class="relation-context-menu" :style="menuStyle()" role="menu">
      <div class="context-label">{{ formatRelationLabel(edge) }}</div>
      <button type="button" role="menuitem" @click="editRelation">Edit Relation</button>
      <button class="danger" type="button" role="menuitem" @click="deleteRelation">Delete Relation</button>
    </div>
  </Teleport>
</template>

<style scoped>
.relation-context-menu {
  position: fixed;
  z-index: 1300;
  display: grid;
  min-width: 190px;
  border: 1px solid var(--border-primary);
  border-radius: 0;
  background: var(--background-elevated);
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.26);
  padding: 6px;
}

.context-label {
  max-width: 260px;
  overflow: hidden;
  border-bottom: 1px solid var(--border-muted);
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  line-height: 1.4;
  padding: 7px 8px 9px;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

button {
  min-height: 34px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-small);
  font-weight: 900;
  padding: 0 9px;
  text-align: left;
  text-transform: uppercase;
}

button:hover {
  background: var(--background-main);
  outline: 1px solid var(--border-muted);
}

button.danger {
  color: var(--game-dev);
}
</style>
