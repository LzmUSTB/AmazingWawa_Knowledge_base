<script setup>
import arrowSwap from "../../assets/icons/arrow-swap.svg";
import chevronDown from "../../assets/icons/chevron-down.svg";
import chevronLeft from "../../assets/icons/chevron-left.svg";
import chevronRight from "../../assets/icons/chevron-right.svg";
import chevronUp from "../../assets/icons/chevron-up.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import edit from "../../assets/icons/edit.svg";
import filePlus from "../../assets/icons/file-plus.svg";
import fileText from "../../assets/icons/file-text.svg";
import fitScreen from "../../assets/icons/fit-screen.svg";
import focus from "../../assets/icons/focus.svg";
import folderOpen from "../../assets/icons/folder-open.svg";
import gitBranch from "../../assets/icons/git-branch.svg";
import graph from "../../assets/icons/graph.svg";
import layoutEdit from "../../assets/icons/layout-edit.svg";
import layoutSave from "../../assets/icons/layout-save.svg";
import link from "../../assets/icons/link.svg";
import pin from "../../assets/icons/pin.svg";
import plusNode from "../../assets/icons/plus-node.svg";
import save from "../../assets/icons/save.svg";
import search from "../../assets/icons/search.svg";
import textSearch from "../../assets/icons/text-search.svg";
import x from "../../assets/icons/x.svg";

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
  x,
};

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 14,
  },
  decorative: {
    type: Boolean,
    default: true,
  },
});

function normalizedSize() {
  return typeof props.size === "number" ? `${props.size}px` : props.size;
}

function iconUrl() {
  const url = icons[props.name];
  if (!url) throw new Error(`Unknown icon "${props.name}".`);
  return url;
}
</script>

<template>
  <span
    class="app-icon"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
    :style="{ '--icon-url': `url(${iconUrl()})`, '--icon-size': normalizedSize() }"
  ></span>
</template>

<style scoped>
.app-icon {
  display: inline-block;
  flex: 0 0 auto;
  width: var(--icon-size);
  height: var(--icon-size);
  background: currentColor;
  mask-image: var(--icon-url);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-image: var(--icon-url);
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}
</style>
