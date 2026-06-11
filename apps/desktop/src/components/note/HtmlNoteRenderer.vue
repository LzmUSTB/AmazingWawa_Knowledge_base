<script setup>
import { computed } from "vue";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";

const props = defineProps({
  html: { type: String, default: "" },
  node: { type: Object, default: null },
  vaultRootPath: { type: String, default: "" },
  previewNode: { type: Object, default: null },
  assetFiles: { type: Array, default: () => [] },
});

const ALLOWED_TAGS = new Set([
  "A", "ARTICLE", "ASIDE", "AUDIO", "B", "BLOCKQUOTE", "BR", "CAPTION", "CODE", "COL", "COLGROUP", "DD", "DETAILS", "DIV", "DL", "DT", "EM", "FIGCAPTION", "FIGURE", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "I", "IMG", "LI", "MAIN", "MARK", "NAV", "OL", "P", "PRE", "SECTION", "SMALL", "SOURCE", "SPAN", "STRONG", "SUB", "SUMMARY", "SUP", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL", "VIDEO"
]);
const URL_TAGS = new Set(["A", "IMG", "VIDEO", "AUDIO", "SOURCE"]);
const RESOURCE_TAGS = new Set(["IMG", "VIDEO", "AUDIO", "SOURCE"]);
const GLOBAL_ATTRS = new Set(["class", "id", "title", "alt", "aria-label", "role", "loading", "controls", "loop", "muted", "playsinline", "poster", "colspan", "rowspan", "target", "rel"]);
const URL_ATTRS = new Set(["href", "src", "poster"]);

function safeAssetPath(value = "") {
  const normalized = String(value).replaceAll("\\", "/");
  if (!normalized.startsWith("assets/") || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || /^(data:|javascript:)/i.test(normalized) || normalized.split("/").some((part) => part === ".." || part === "")) return "";
  return normalized;
}
function assetField(asset, camel, snake) { return asset?.[camel] ?? asset?.[snake] ?? ""; }
function previewAssetHref(value = "") {
  const safePath = safeAssetPath(value);
  const preview = props.previewNode;
  if (!safePath || !preview?.domain || !preview?.nodeId) return "";
  const packagePath = `generated/content/${preview.domain}/${preview.nodeId}/${safePath}`;
  const asset = props.assetFiles.find((item) => assetField(item, "packageRelativePath", "package_relative_path") === packagePath);
  if (!asset?.base64) return "";
  const mimeType = assetField(asset, "mimeType", "mime_type") || "application/octet-stream";
  return `data:${mimeType};base64,${asset.base64}`;
}
function assetAbsolutePath(value = "") {
  const safePath = safeAssetPath(value);
  const node = props.previewNode || props.node;
  if (!safePath || !props.vaultRootPath || !node?.domain || !node?.id) return "";
  return `${props.vaultRootPath.replace(/[\\/]+$/, "")}/content/${node.domain}/${node.id}/${safePath}`;
}
function assetHref(value = "") {
  const previewHref = previewAssetHref(value);
  if (previewHref) return previewHref;
  const absolutePath = assetAbsolutePath(value);
  if (!absolutePath) return "";
  return isTauri() ? convertFileSrc(absolutePath) : absolutePath;
}
function isRemoteUrl(value = "") {
  return /^https?:\/\//i.test(String(value));
}
function allowedUrl(tagName, attrName, value) {
  const raw = String(value || "").trim();
  if (!raw || /^(javascript:|data:)/i.test(raw)) return "";
  if (raw.startsWith("assets/")) return assetHref(raw);
  if (isRemoteUrl(raw) && URL_TAGS.has(tagName)) return raw;
  if (attrName === "href" && raw.startsWith("#")) return raw;
  return "";
}
function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.remove();
    return;
  }
  const tagName = node.tagName;
  if (!ALLOWED_TAGS.has(tagName)) {
    const children = [...node.childNodes];
    children.forEach(sanitizeNode);
    const fragment = document.createDocumentFragment();
    while (node.firstChild) fragment.appendChild(node.firstChild);
    node.replaceWith(fragment);
    return;
  }
  [...node.attributes].forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      node.removeAttribute(attr.name);
      return;
    }
    if (URL_ATTRS.has(name)) {
      const nextUrl = allowedUrl(tagName, name, attr.value);
      if (nextUrl) node.setAttribute(name, nextUrl);
      else node.removeAttribute(attr.name);
      return;
    }
    if (!GLOBAL_ATTRS.has(name) && !name.startsWith("aria-") && !name.startsWith("data-")) node.removeAttribute(attr.name);
  });
  if (tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noreferrer");
  }
  if (RESOURCE_TAGS.has(tagName) && !node.getAttribute("src") && tagName !== "SOURCE") {
    node.remove();
    return;
  }
  [...node.childNodes].forEach(sanitizeNode);
}
function sanitizeHtml(html = "") {
  if (!html.trim()) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<main>${html}</main>`, "text/html");
  [...doc.body.childNodes].forEach(sanitizeNode);
  return doc.body.innerHTML;
}

const sanitizedHtml = computed(() => sanitizeHtml(props.html));
</script>

<template>
  <div class="html-note-renderer" v-html="sanitizedHtml"></div>
</template>

<style scoped>
.html-note-renderer {
  width: min(1120px, 100%);
  margin: 0 auto;
  color: var(--text-secondary);
  font-size: calc(15px * var(--ui-font-scale));
  line-height: 1.82;
}
.html-note-renderer :deep(*) { box-sizing: border-box; }
.html-note-renderer :deep(.rich-note-article),
.html-note-renderer :deep(article) { display: grid; gap: 28px; }
.html-note-renderer :deep(.rich-hero),
.html-note-renderer :deep(.rich-card),
.html-note-renderer :deep(.rich-callout),
.html-note-renderer :deep(.rich-panel),
.html-note-renderer :deep(figure),
.html-note-renderer :deep(details) {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}
.html-note-renderer :deep(.rich-hero) {
  border-color: var(--border-primary);
  border-left: 6px solid var(--note-color, var(--graphics));
  padding: clamp(22px, 4vw, 42px);
}
.html-note-renderer :deep(.rich-kicker) {
  color: var(--note-color, var(--graphics));
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.html-note-renderer :deep(h1) { margin: 12px 0; color: var(--text-primary); font-size: calc(56px * var(--ui-font-scale)); line-height: .95; letter-spacing: -.06em; text-transform: uppercase; }
.html-note-renderer :deep(h2) { margin: 0; color: var(--text-primary); font-size: calc(34px * var(--ui-font-scale)); line-height: 1.05; letter-spacing: -.04em; text-transform: uppercase; }
.html-note-renderer :deep(h3) { margin: 0 0 10px; color: var(--text-primary); font-size: calc(22px * var(--ui-font-scale)); line-height: 1.2; }
.html-note-renderer :deep(p) { margin: 0 0 14px; }
.html-note-renderer :deep(strong) { color: var(--text-primary); }
.html-note-renderer :deep(code),
.html-note-renderer :deep(pre) { font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; }
.html-note-renderer :deep(code) { border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-primary); padding: 1px 5px; }
.html-note-renderer :deep(pre) { overflow: auto; border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-secondary); padding: 14px; font-size: var(--font-size-mono); }
.html-note-renderer :deep(.rich-lead) { max-width: 920px; color: var(--text-secondary); font-size: calc(17px * var(--ui-font-scale)); line-height: 1.9; }
.html-note-renderer :deep(.rich-grid),
.html-note-renderer :deep(.rich-two-col) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .85fr); gap: 18px; align-items: start; }
.html-note-renderer :deep(.rich-three-col) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.html-note-renderer :deep(.rich-card),
.html-note-renderer :deep(.rich-panel),
.html-note-renderer :deep(.rich-callout) { padding: 16px; }
.html-note-renderer :deep(.rich-callout) { border-left: 5px solid var(--note-color, var(--graphics)); }
.html-note-renderer :deep(.rich-callout.warn) { border-left-color: var(--career); }
.html-note-renderer :deep(.rich-callout.danger) { border-left-color: var(--game-dev); }
.html-note-renderer :deep(.rich-callout.green),
.html-note-renderer :deep(.rich-callout.success) { border-left-color: var(--machine-learning); }
.html-note-renderer :deep(.rich-section-head) { display: flex; align-items: end; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-muted); padding-bottom: 10px; margin-bottom: 18px; }
.html-note-renderer :deep(.rich-section-num) { color: var(--note-color, var(--graphics)); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-weight: 900; }
.html-note-renderer :deep(.rich-figure-grid) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.html-note-renderer :deep(.rich-figure-grid.three) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.html-note-renderer :deep(figure) { margin: 0; overflow: hidden; }
.html-note-renderer :deep(img),
.html-note-renderer :deep(video) { display: block; width: 100%; height: auto; background: var(--background-main); border-bottom: 1px solid var(--border-muted); }
.html-note-renderer :deep(figcaption) { color: var(--text-muted); font-size: var(--font-size-small); line-height: 1.65; padding: 12px 14px; }
.html-note-renderer :deep(figcaption .title) { display: block; color: var(--text-primary); font-weight: 850; margin-bottom: 4px; }
.html-note-renderer :deep(.rich-flow) { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.html-note-renderer :deep(.rich-step) { border: 1px solid var(--border-muted); background: var(--background-panel); padding: 14px; }
.html-note-renderer :deep(.rich-step b) { display: block; color: var(--note-color, var(--graphics)); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); margin-bottom: 8px; }
.html-note-renderer :deep(.rich-compare),
.html-note-renderer :deep(table) { width: 100%; border-collapse: collapse; background: var(--background-panel); font-size: var(--font-size-ui); }
.html-note-renderer :deep(th),
.html-note-renderer :deep(td) { border: 1px solid var(--border-muted); padding: 10px; text-align: left; vertical-align: top; }
.html-note-renderer :deep(th) { color: var(--text-primary); background: var(--background-main); }

.html-note-renderer :deep(.rich-badge-row) { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.html-note-renderer :deep(.rich-badge) { border: 1px solid var(--border-muted); border-left: 4px solid var(--note-color, var(--graphics)); background: var(--background-main); color: var(--text-secondary); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 800; padding: 5px 9px; text-transform: uppercase; }
.html-note-renderer :deep(.rich-asset-link) { display: grid; gap: 4px; border: 1px solid var(--border-muted); border-left: 5px solid var(--note-color, var(--graphics)); background: var(--background-panel); color: var(--text-primary); padding: 12px; text-decoration: none; }
.html-note-renderer :deep(.rich-asset-link b) { color: var(--note-color, var(--graphics)); }

.html-note-renderer :deep(a) { color: var(--note-color, var(--graphics)); text-decoration: none; }
.html-note-renderer :deep(a:hover) { text-decoration: underline; }
.html-note-renderer :deep(details) { padding: 14px; }
.html-note-renderer :deep(summary) { cursor: pointer; color: var(--text-primary); font-weight: 850; }
@media (max-width: 920px) {
  .html-note-renderer :deep(.rich-grid),
  .html-note-renderer :deep(.rich-two-col),
  .html-note-renderer :deep(.rich-three-col),
  .html-note-renderer :deep(.rich-figure-grid),
  .html-note-renderer :deep(.rich-figure-grid.three) { grid-template-columns: 1fr; }
  .html-note-renderer :deep(h1) { font-size: calc(38px * var(--ui-font-scale)); }
}
</style>
