<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";

const props = defineProps({
  html: { type: String, default: "" },
  node: { type: Object, default: null },
  vaultRootPath: { type: String, default: "" },
  previewNode: { type: Object, default: null },
  assetFiles: { type: Array, default: () => [] },
});

const frameRef = ref(null);
const frameHeight = ref(720);
const themeVars = ref("");
const frameId = `html-note-${Math.random().toString(36).slice(2)}`;
let mutationObserver = null;
let resizeRaf = 0;

const CSS_VAR_FALLBACKS = {
  "--background-main": "#080808",
  "--background-panel": "#111111",
  "--background-soft": "#161616",
  "--border-primary": "#e6e6e6",
  "--border-muted": "#333333",
  "--text-primary": "#f2f2f2",
  "--text-secondary": "#b8b8b8",
  "--text-muted": "#7f7f7f",
  "--graphics": "#00b7ff",
  "--machine-learning": "#c8ff00",
  "--game-dev": "#ff4d4d",
  "--career": "#ffb000",
  "--font-size-small": "calc(12px * var(--ui-font-scale, 1))",
  "--font-size-ui": "calc(14px * var(--ui-font-scale, 1))",
  "--font-size-title": "calc(22px * var(--ui-font-scale, 1))",
  "--font-size-note-title": "calc(42px * var(--ui-font-scale, 1))",
  "--font-size-mono": "calc(13px * var(--ui-font-scale, 1))",
  "--ui-font-scale": "1",
};

function nodeIdFor(node) {
  return node?.id || node?.nodeId || "";
}

function safeAssetPath(value = "") {
  const normalized = String(value).replaceAll("\\", "/").trim();
  if (
    !normalized.startsWith("assets/") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    /^(data:|javascript:)/i.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) return "";
  return normalized;
}

function assetField(asset, camel, snake) {
  return asset?.[camel] ?? asset?.[snake] ?? "";
}

function previewAssetHref(value = "") {
  const safePath = safeAssetPath(value);
  const preview = props.previewNode;
  if (!safePath || !preview?.domain || !nodeIdFor(preview)) return "";

  const packagePath = `generated/content/${preview.domain}/${nodeIdFor(preview)}/${safePath}`;
  const asset = props.assetFiles.find((item) => assetField(item, "packageRelativePath", "package_relative_path") === packagePath);
  if (!asset?.base64) return "";

  const mimeType = assetField(asset, "mimeType", "mime_type") || "application/octet-stream";
  return `data:${mimeType};base64,${asset.base64}`;
}

function assetAbsolutePath(value = "") {
  const safePath = safeAssetPath(value);
  const node = props.previewNode || props.node;
  const nodeId = nodeIdFor(node);
  if (!safePath || !props.vaultRootPath || !node?.domain || !nodeId) return "";
  return `${props.vaultRootPath.replace(/[\\/]+$/, "")}/content/${node.domain}/${nodeId}/${safePath}`;
}

function assetHref(value = "") {
  const previewHref = previewAssetHref(value);
  if (previewHref) return previewHref;

  const absolutePath = assetAbsolutePath(value);
  if (!absolutePath) return "";
  return isTauri() ? convertFileSrc(absolutePath) : absolutePath;
}

function isRemoteUrl(value = "") {
  return /^(https?:)?\/\//i.test(String(value).trim());
}

function isAllowedUrlAttribute(attrName, value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|javascript:)/i.test(raw)) return "";
  if (raw.startsWith("assets/")) return assetHref(raw);
  if (isRemoteUrl(raw)) return raw;
  if (attrName === "href" && (raw.startsWith("#") || /^(mailto:|tel:)/i.test(raw))) return raw;
  return "";
}

function rewriteResourceAttributes(root) {
  const attrNames = ["src", "href", "poster"];
  root.querySelectorAll(attrNames.map((name) => `[${name}]`).join(",")).forEach((element) => {
    attrNames.forEach((attrName) => {
      if (!element.hasAttribute(attrName)) return;
      const nextValue = isAllowedUrlAttribute(attrName, element.getAttribute(attrName));
      if (nextValue) element.setAttribute(attrName, nextValue);
      else element.removeAttribute(attrName);
    });
  });

  root.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noreferrer");
  });
}

function normalizeHtmlFragment(rawHtml = "") {
  const source = String(rawHtml || "").trim();
  if (!source) return "";

  const template = document.createElement("template");
  template.innerHTML = source;
  rewriteResourceAttributes(template.content);

  const container = document.createElement("div");
  container.appendChild(template.content.cloneNode(true));
  return container.innerHTML;
}

const noteHtml = computed(() => normalizeHtmlFragment(props.html));

function readCssVar(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  const style = window.getComputedStyle(document.documentElement);
  return style.getPropertyValue(name).trim() || fallback;
}

function syncThemeVars() {
  const declarations = Object.entries(CSS_VAR_FALLBACKS).map(([name, fallback]) => `${name}: ${readCssVar(name, fallback)};`);
  declarations.push(`--note-color: ${props.node?.color || readCssVar("--note-color", readCssVar("--graphics", "#00b7ff"))};`);
  themeVars.value = `:root { ${declarations.join(" ")} }`;
}

function scheduleThemeSync() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    syncThemeVars();
  });
}

const baseCss = `
html, body {
  margin: 0;
  padding: 0;
  background: var(--background-main);
  color: var(--text-secondary);
  font-family: Inter, "Noto Sans SC", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: var(--font-size-ui);
  line-height: 1.82;
}
* { box-sizing: border-box; }
a { color: var(--note-color, var(--graphics)); text-decoration: none; }

.rich-review details,
details.rich-qa {
  border-left: 5px solid var(--note-color, var(--graphics));
  margin: 10px 0;
}
.rich-review summary,
details.rich-qa summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rich-review summary::-webkit-details-marker,
details.rich-qa summary::-webkit-details-marker { display: none; }
.rich-review summary::before,
details.rich-qa summary::before {
  content: "+";
  display: inline-grid;
  place-items: center;
  width: 1.35em;
  height: 1.35em;
  border: 1px solid var(--border-muted);
  color: var(--note-color, var(--graphics));
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
}
.rich-review details[open] summary::before,
details.rich-qa[open] summary::before { content: "−"; }
.rich-answer {
  margin-top: 12px;
  border-top: 1px solid var(--border-muted);
  padding-top: 12px;
}

a:hover { text-decoration: underline; }
button, input, select, textarea { font: inherit; }
.rich-note-root {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.82;
}
.rich-note-article, article { display: grid; gap: 28px; }
.rich-hero,
.rich-card,
.rich-callout,
.rich-panel,
figure,
details,
.source-block {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}
.rich-hero {
  border-color: var(--border-primary);
  border-left: 6px solid var(--note-color, var(--graphics));
  padding: clamp(22px, 4vw, 42px);
}
.rich-kicker {
  color: var(--note-color, var(--graphics));
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
}
h1 {
  margin: 12px 0;
  color: var(--text-primary);
  font-size: var(--font-size-note-title);
  line-height: .95;
  letter-spacing: -.06em;
  text-transform: uppercase;
}
h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: calc(var(--font-size-title) * 1.35);
  line-height: 1.05;
  letter-spacing: -.04em;
  text-transform: uppercase;
}
h3 { margin: 0 0 10px; color: var(--text-primary); font-size: var(--font-size-title); line-height: 1.2; }
p { margin: 0 0 14px; }
strong { color: var(--text-primary); }
code, pre { font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; }
code { border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-primary); padding: 1px 5px; }
pre { overflow: auto; border: 1px solid var(--border-muted); background: var(--background-main); color: var(--text-secondary); padding: 14px; font-size: var(--font-size-mono); }
.rich-lead { max-width: 920px; color: var(--text-secondary); font-size: calc(var(--font-size-ui) * 1.16); line-height: 1.9; }
.rich-grid,
.rich-two-col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .85fr); gap: 18px; align-items: start; }
.rich-three-col { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.rich-card,
.rich-panel,
.rich-callout { padding: 16px; }
.rich-callout { border-left: 5px solid var(--note-color, var(--graphics)); }
.rich-callout.warn { border-left-color: var(--career); }
.rich-callout.danger { border-left-color: var(--game-dev); }
.rich-callout.green,
.rich-callout.success { border-left-color: var(--machine-learning); }
.rich-section-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-muted); padding-bottom: 10px; margin-bottom: 18px; }
.rich-section-num { color: var(--note-color, var(--graphics)); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-weight: 900; }
.rich-figure-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.rich-figure-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
figure { margin: 0; overflow: hidden; }
img, video, iframe, canvas, svg { display: block; max-width: 100%; background: var(--background-main); }
img, video { width: 100%; height: auto; border-bottom: 1px solid var(--border-muted); }
iframe.rich-source-frame, iframe.rich-demo-frame, .rich-source-frame, .rich-demo-frame { width: 100%; min-height: 520px; border: 1px solid var(--border-muted); background: var(--background-main); }
canvas.rich-demo-canvas, .rich-demo-canvas { width: 100%; border: 1px solid var(--border-muted); background: var(--background-main); }
figcaption { color: var(--text-muted); font-size: var(--font-size-small); line-height: 1.65; padding: 12px 14px; }
figcaption .title { display: block; color: var(--text-primary); font-weight: 850; margin-bottom: 4px; }
.rich-flow { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.rich-step { border: 1px solid var(--border-muted); background: var(--background-panel); padding: 14px; }
.rich-step b { display: block; color: var(--note-color, var(--graphics)); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); margin-bottom: 8px; }
.rich-compare, table { width: 100%; border-collapse: collapse; background: var(--background-panel); font-size: var(--font-size-ui); }
th, td { border: 1px solid var(--border-muted); padding: 10px; text-align: left; vertical-align: top; }
th { color: var(--text-primary); background: var(--background-main); }
.rich-badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.rich-badge { border: 1px solid var(--border-muted); border-left: 4px solid var(--note-color, var(--graphics)); background: var(--background-main); color: var(--text-secondary); font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-size: var(--font-size-small); font-weight: 800; padding: 5px 9px; text-transform: uppercase; }
.rich-asset-link, .rich-source-demo-link { display: grid; gap: 4px; border: 1px solid var(--border-muted); border-left: 5px solid var(--note-color, var(--graphics)); background: var(--background-panel); color: var(--text-primary); padding: 12px; text-decoration: none; }
.rich-asset-link b, .rich-source-demo-link b { color: var(--note-color, var(--graphics)); }
details { padding: 14px; }
summary { cursor: pointer; color: var(--text-primary); font-weight: 850; }
.source-block { display: grid; gap: 6px; border-left: 5px solid var(--note-color, var(--graphics)); margin: 12px 0; padding: 10px 12px; color: var(--text-muted); font-size: var(--font-size-small); }
.source-block strong { color: var(--text-primary); text-transform: uppercase; letter-spacing: .08em; }
.source-block span { color: var(--text-muted); }
@media (max-width: 920px) {
  .rich-grid,
  .rich-two-col,
  .rich-three-col,
  .rich-figure-grid,
  .rich-figure-grid.three { grid-template-columns: 1fr; }
  iframe.rich-source-frame, iframe.rich-demo-frame, .rich-source-frame, .rich-demo-frame { min-height: 420px; }
}
`;

function autoResizeScript() {
  return `
(() => {
  const frameId = ${JSON.stringify(frameId)};
  const sendHeight = () => {
    const body = document.body;
    const doc = document.documentElement;
    const height = Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      doc ? doc.clientHeight : 0,
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      480
    );
    parent.postMessage({ type: 'wawa-html-note-height', frameId, height }, '*');
  };
  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  if (window.ResizeObserver) {
    new ResizeObserver(sendHeight).observe(document.documentElement);
    if (document.body) new ResizeObserver(sendHeight).observe(document.body);
  }
  setTimeout(sendHeight, 0);
  setTimeout(sendHeight, 120);
  setTimeout(sendHeight, 500);
  setInterval(sendHeight, 1400);
})();`;
}

const srcdoc = computed(() => {
  const scriptOpen = "<script>";
  const scriptClose = `<${"/"}script>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${themeVars.value}\n${baseCss}</style>
</head>
<body>
<main class="rich-note-root">${noteHtml.value}</main>
${scriptOpen}${autoResizeScript()}${scriptClose}
</body>
</html>`;
});

function handleMessage(event) {
  const data = event.data || {};
  if (data.type !== "wawa-html-note-height" || data.frameId !== frameId) return;
  const nextHeight = Number(data.height || 0);
  if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
  frameHeight.value = Math.max(480, Math.min(20000, Math.ceil(nextHeight + 4)));
}

onMounted(() => {
  syncThemeVars();
  window.addEventListener("message", handleMessage);
  window.addEventListener("resize", scheduleThemeSync);
  mutationObserver = new MutationObserver(scheduleThemeSync);
  mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  if (document.body) mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("resize", scheduleThemeSync);
  if (mutationObserver) mutationObserver.disconnect();
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
});

watch(() => props.html, () => {
  frameHeight.value = 720;
  nextTick(scheduleThemeSync);
});
watch(() => props.node?.color, scheduleThemeSync);
</script>

<template>
  <div class="html-note-renderer">
    <iframe
      ref="frameRef"
      class="html-note-frame"
      title="HTML note"
      :srcdoc="srcdoc"
      :style="{ height: `${frameHeight}px` }"
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-modals"
      allow="fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
</template>

<style scoped>
.html-note-renderer {
  width: 100%;
  min-width: 0;
}
.html-note-frame {
  display: block;
  width: 100%;
  min-height: 480px;
  border: 0;
  background: var(--background-main);
}
</style>
