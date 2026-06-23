<script setup>
import { computed } from "vue";

import arrowSwap from "../../assets/icons/arrow-swap.svg?raw";
import chevronDown from "../../assets/icons/chevron-down.svg?raw";
import chevronLeft from "../../assets/icons/chevron-left.svg?raw";
import chevronRight from "../../assets/icons/chevron-right.svg?raw";
import chevronUp from "../../assets/icons/chevron-up.svg?raw";
import deleteIcon from "../../assets/icons/delete.svg?raw";
import edit from "../../assets/icons/edit.svg?raw";
import filePlus from "../../assets/icons/file-plus.svg?raw";
import fileText from "../../assets/icons/file-text.svg?raw";
import fitScreen from "../../assets/icons/fit-screen.svg?raw";
import focus from "../../assets/icons/focus.svg?raw";
import folderOpen from "../../assets/icons/folder-open.svg?raw";
import gitBranch from "../../assets/icons/git-branch.svg?raw";
import graph from "../../assets/icons/graph.svg?raw";
import layoutEdit from "../../assets/icons/layout-edit.svg?raw";
import layoutSave from "../../assets/icons/layout-save.svg?raw";
import link from "../../assets/icons/link.svg?raw";
import pin from "../../assets/icons/pin.svg?raw";
import plusNode from "../../assets/icons/plus-node.svg?raw";
import save from "../../assets/icons/save.svg?raw";
import search from "../../assets/icons/search.svg?raw";
import textSearch from "../../assets/icons/text-search.svg?raw";
import urlLink from "../../assets/icons/url-link.svg?raw";
import windowMaximize from "../../assets/icons/window-maximize.svg?raw";
import windowMinimize from "../../assets/icons/window-minimize.svg?raw";
import x from "../../assets/icons/x.svg?raw";
import importIcon from "../../assets/icons/import.svg?raw";
import exportIcon from "../../assets/icons/export.svg?raw";
import capture from "../../assets/icons/capture.svg?raw";
import recent from "../../assets/icons/recent.svg?raw";
import refresh from "../../assets/icons/refresh.svg?raw";
import resize from "../../assets/icons/resize.svg?raw";
import stage from "../../assets/icons/stage.svg?raw";
import check from "../../assets/icons/check.svg?raw";
import exercise from "../../assets/icons/exercise.svg?raw";
import tools from "../../assets/icons/tools.svg?raw";
import emojiEasy from "../../assets/icons/emoji-easy.svg?raw";
import emojiGood from "../../assets/icons/emoji-good.svg?raw";
import emojiHard from "../../assets/icons/emoji-hard.svg?raw";
import emojiWrong from "../../assets/icons/emoji-wrong.svg?raw";

const icons = {
  "arrow-swap": arrowSwap,
  "chevron-down": chevronDown,
  "chevron-left": chevronLeft,
  "chevron-right": chevronRight,
  "chevron-up": chevronUp,
  delete: deleteIcon,
  edit,
  "file-plus": filePlus,
  "file-text": fileText,
  "fit-screen": fitScreen,
  focus,
  "folder-open": folderOpen,
  "git-branch": gitBranch,
  graph,
  "layout-edit": layoutEdit,
  "layout-save": layoutSave,
  link,
  pin,
  "plus-node": plusNode,
  save,
  search,
  "text-search": textSearch,
  "url-link": urlLink,
  "window-maximize": windowMaximize,
  "window-minimize": windowMinimize,
  x,
  import: importIcon,
  export: exportIcon,
  capture: capture,
  recent: recent,
  refresh: refresh,
  resize,
  stage,
  check,
  exercise,
  tools,
  "emoji-easy": emojiEasy,
  "emoji-good": emojiGood,
  "emoji-hard": emojiHard,
  "emoji-wrong": emojiWrong,
};

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: "var(--icon-size-ui)",
  },
  decorative: {
    type: Boolean,
    default: true,
  },
});

const normalizedSize = computed(() => {
  return typeof props.size === "number" ? `${props.size}px` : props.size;
});

const svgContent = computed(() => {
  const svg = icons[props.name];
  if (!svg) {
    console.warn(`[AppIcon] Unknown icon: ${props.name}`);
    return "";
  }
  return svg;
});
</script>

<template>
  <span class="app-icon" :aria-hidden="decorative ? 'true' : undefined" :role="decorative ? undefined : 'img'"
    :style="{ '--icon-size': normalizedSize }" v-html="svgContent"></span>
</template>

<style scoped>
.app-icon {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: var(--icon-size);
  height: var(--icon-size);
  color: currentColor;
  line-height: 0;
}

.app-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  color: currentColor;
}

.app-icon :deep(svg[fill]:not([fill="none"])) {
  fill: currentColor !important;
}

.app-icon :deep(svg [fill]:not([fill="none"])) {
  fill: currentColor !important;
}

.app-icon :deep(svg[stroke]:not([stroke="none"])) {
  stroke: currentColor !important;
}

.app-icon :deep(svg [stroke]:not([stroke="none"])) {
  stroke: currentColor !important;
}
</style>
