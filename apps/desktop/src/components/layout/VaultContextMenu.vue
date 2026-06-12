<script setup>
import AppIcon from "../ui/AppIcon.vue";

defineProps({
  menu: { type: Object, default: null },
});

defineEmits(["close", "delete", "edit"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="menu" class="context-scrim" @click="$emit('close')" @contextmenu.prevent="$emit('close')">
      <div class="vault-context-menu" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }" @click.stop>
        <button type="button" class="menu-action" @click="$emit('edit', menu.target)">
          <AppIcon name="edit" :size="15" />
          <span>Edit</span>
        </button>
        <button type="button" class="menu-action is-danger" @click="$emit('delete', menu.target)">
          <AppIcon name="delete" :size="15" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-scrim {
  position: fixed;
  z-index: 1500;
  inset: 0;
  background: transparent;
}

.vault-context-menu {
  position: fixed;
  display: grid;
  border: 1px solid var(--border-primary);
  background: var(--background-elevated);
  box-shadow: 0 0 0 1px rgba(237, 237, 237, 0.14);
}

.menu-action {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 0 16px;
  text-align: left;
  text-transform: uppercase;
}

.menu-action:hover {
  background: var(--background-main);
}

.menu-action.is-danger {
  color: var(--game-dev);
}
</style>
