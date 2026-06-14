<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { readBinaryFileAsDataUrl } from "../../data/desktop-vault-adapter.js";

const props = defineProps({
  html: { type: String, default: "" },
  node: { type: Object, default: null },
  vaultRootPath: { type: String, default: "" },
  previewNode: { type: Object, default: null },
  assetFiles: { type: Array, default: () => [] },
  fillViewport: { type: Boolean, default: false },
  searchActive: { type: Boolean, default: false },
  searchQuery: { type: String, default: "" },
  searchMoveToken: { type: Number, default: 0 },
  searchMoveDirection: { type: Number, default: 1 },
});

const emit = defineEmits(["find-results-change"]);
const frameRef = ref(null);
const frameHeight = ref(720);
const themeVars = ref("");
const preparedHtml = ref("");
const assetLoading = ref(false);
const assetErrors = ref([]);
const frameId = `html-note-${Math.random().toString(36).slice(2)}`;
let mutationObserver = null;
let resizeRaf = 0;
let prepareRunId = 0;

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

function previewAssetDataUrl(value = "") {
  const safePath = safeAssetPath(value);
  const preview = props.previewNode;
  if (!safePath || !preview?.domain || !nodeIdFor(preview)) return "";

  const packagePath = `generated/content/${preview.domain}/${nodeIdFor(preview)}/${safePath}`;
  const asset = props.assetFiles.find((item) => assetField(item, "packageRelativePath", "package_relative_path") === packagePath);
  if (!asset?.base64) return "";

  const mimeType = assetField(asset, "mimeType", "mime_type") || "application/octet-stream";
  return `data:${mimeType};base64,${asset.base64}`;
}

function vaultRelativeAssetPath(value = "") {
  const safePath = safeAssetPath(value);
  const node = props.previewNode || props.node;
  const nodeId = nodeIdFor(node);
  if (!safePath || !props.vaultRootPath || !node?.domain || !nodeId) return "";
  return `content/${node.domain}/${nodeId}/${safePath}`;
}

async function assetDataUrl(value = "") {
  const previewHref = previewAssetDataUrl(value);
  if (previewHref) return previewHref;

  const relativePath = vaultRelativeAssetPath(value);
  if (!relativePath) return "";
  return readBinaryFileAsDataUrl(props.vaultRootPath, relativePath);
}

function isRemoteUrl(value = "") {
  return /^(https?:)?\/\//i.test(String(value).trim());
}

function isLocalAnchorOrContact(value = "") {
  return String(value).startsWith("#") || /^(mailto:|tel:)/i.test(String(value).trim());
}

function base64ToBytes(base64 = "") {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function dataUrlToText(dataUrl = "") {
  const match = dataUrl.match(/^data:([^;,]+)?(;charset=[^;,]+)?;base64,(.*)$/i);
  if (!match) return "";
  const bytes = base64ToBytes(match[3]);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function assetText(value = "") {
  const dataUrl = await assetDataUrl(value);
  return dataUrl ? dataUrlToText(dataUrl) : "";
}

async function rewriteCssUrls(cssText = "") {
  const matches = [...cssText.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)];
  let nextCss = cssText;
  for (const match of matches) {
    const rawUrl = String(match[2] || "").trim();
    if (!rawUrl || isRemoteUrl(rawUrl)) continue;
    if (/^data:/i.test(rawUrl)) {
      nextCss = nextCss.replace(match[0], "url(\"\")");
      continue;
    }
    if (!safeAssetPath(rawUrl)) {
      nextCss = nextCss.replace(match[0], "url(\"\")");
      continue;
    }
    try {
      const dataUrl = await assetDataUrl(rawUrl);
      nextCss = nextCss.replace(match[0], dataUrl ? `url("${dataUrl}")` : "url(\"\")");
    } catch (error) {
      console.warn("[html-note] Failed to inline CSS asset.", rawUrl, error);
      nextCss = nextCss.replace(match[0], "url(\"\")");
    }
  }
  return nextCss;
}

async function allowedResourceUrl(attrName, value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^javascript:/i.test(raw)) return "";
  if (/^data:/i.test(raw)) return "";
  if (raw.startsWith("assets/")) return assetDataUrl(raw);
  if (isRemoteUrl(raw)) return raw;
  if (attrName === "href" && isLocalAnchorOrContact(raw)) return raw;
  return "";
}

async function inlineExternalStyles(root) {
  const stylesheets = [...root.querySelectorAll('link[rel~="stylesheet"][href]')];
  for (const link of stylesheets) {
    const href = link.getAttribute("href") || "";
    if (!safeAssetPath(href)) {
      const allowedHref = await allowedResourceUrl("href", href);
      if (allowedHref) link.setAttribute("href", allowedHref);
      else link.remove();
      continue;
    }
    try {
      const style = document.createElement("style");
      style.dataset.wawaInlinedAsset = href;
      style.textContent = await rewriteCssUrls(await assetText(href));
      link.replaceWith(style);
    } catch (error) {
      console.warn("[html-note] Failed to inline stylesheet.", href, error);
      link.remove();
    }
  }
}

async function inlineExternalScripts(root) {
  const scripts = [...root.querySelectorAll("script[src]")];
  for (const script of scripts) {
    const src = script.getAttribute("src") || "";
    if (!safeAssetPath(src)) {
      script.remove();
      continue;
    }
    try {
      const inlineScript = document.createElement("script");
      inlineScript.dataset.wawaInlinedAsset = src;
      inlineScript.textContent = await assetText(src);
      script.replaceWith(inlineScript);
    } catch (error) {
      console.warn("[html-note] Failed to inline script.", src, error);
      script.remove();
    }
  }
}

async function rewriteResourceAttributes(root) {
  const attrNames = ["src", "href", "poster"];
  const elements = [...root.querySelectorAll(attrNames.map((name) => `[${name}]`).join(","))];
  for (const element of elements) {
    for (const attrName of attrNames) {
      if (!element.hasAttribute(attrName)) continue;
      if (element.tagName === "LINK" && attrName === "href" && element.relList?.contains("stylesheet")) continue;
      if (element.tagName === "SCRIPT" && attrName === "src") continue;
      const raw = element.getAttribute(attrName);
      try {
        const nextValue = await allowedResourceUrl(attrName, raw);
        if (nextValue) element.setAttribute(attrName, nextValue);
        else element.removeAttribute(attrName);
      } catch (error) {
        console.warn("[html-note] Failed to inline asset.", raw, error);
        element.removeAttribute(attrName);
      }
    }
  }

  root.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noreferrer");
  });
}

async function rewriteInlineStyleAttributes(root) {
  const elements = [...root.querySelectorAll("[style]")];
  for (const element of elements) {
    try {
      element.setAttribute("style", await rewriteCssUrls(element.getAttribute("style") || ""));
    } catch (error) {
      console.warn("[html-note] Failed to rewrite inline style asset.", error);
      element.removeAttribute("style");
    }
  }
}

async function prepareHtml() {
  const runId = ++prepareRunId;
  const source = String(props.html || "").trim();
  assetLoading.value = true;
  assetErrors.value = [];
  frameHeight.value = 720;

  if (!source) {
    preparedHtml.value = "";
    assetLoading.value = false;
    return;
  }

  try {
    const template = document.createElement("template");
    template.innerHTML = source;
    await inlineExternalStyles(template.content);
    await inlineExternalScripts(template.content);
    await rewriteResourceAttributes(template.content);
    await rewriteInlineStyleAttributes(template.content);

    const container = document.createElement("div");
    container.appendChild(template.content.cloneNode(true));
    if (runId === prepareRunId) preparedHtml.value = container.innerHTML;
  } catch (error) {
    if (runId === prepareRunId) {
      assetErrors.value = [String(error?.message || error)];
      preparedHtml.value = "";
    }
  } finally {
    if (runId === prepareRunId) {
      assetLoading.value = false;
      nextTick(scheduleThemeSync);
    }
  }
}

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
@font-face {
  font-family: "Fira Code";
  src: url("/fonts/FIRACODE-REGULAR.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
}
@font-face {
  font-family: "Cascadia Mono";
  src: url("/fonts/FIRACODE-REGULAR.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
}
html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: var(--background-main);
  color: var(--text-secondary);
  font-family: "Fira Code", Inter, "Noto Sans SC", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: var(--font-size-ui);
  line-height: 1.82;
}
html.is-fill-viewport, html.is-fill-viewport body { height: 100%; overflow: hidden; }
* { box-sizing: border-box; }
a { color: var(--note-color, var(--graphics)); text-decoration: none; }
a:hover { text-decoration: underline; }
button, input, select, textarea { font: inherit; }
.rich-note-root {
  width: min(1120px, 100%);
  min-height: 100%;
  margin: 0 auto;
  padding: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-ui);
  line-height: 1.82;
}
html.is-fill-viewport .rich-note-root { width: 100%; height: 100%; overflow: auto; }
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
details.rich-qa[open] summary::before { content: "-"; }
.rich-answer {
  margin-top: 12px;
  border-top: 1px solid var(--border-muted);
  padding-top: 12px;
}
mark[data-wawa-html-find] {
  background: rgba(255, 213, 0, 0.34);
  color: inherit;
  outline: 1px solid rgba(255, 213, 0, 0.42);
  padding: 0 1px;
}
mark[data-wawa-html-find].is-current {
  background: var(--career);
  color: var(--background-main);
  outline: 2px solid var(--border-primary);
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

function bridgeScript() {
  return `
(() => {
  const frameId = ${JSON.stringify(frameId)};
  let matches = [];
  let currentIndex = 0;

  const shouldForwardShortcut = (event) => {
    const key = String(event.key || '');
    const lowerKey = key.toLowerCase();
    return ((event.ctrlKey || event.metaKey) && (lowerKey === 'f' || lowerKey === 'q')) ||
      (event.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) ||
      key === 'Escape';
  };

  window.addEventListener('keydown', (event) => {
    if (!shouldForwardShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({
      type: 'wawa-html-note-keydown',
      frameId,
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    }, '*');
  }, true);

  const skippedTextParent = (node) => {
    const parent = node.parentElement;
    return !parent ||
      !node.nodeValue.trim() ||
      Boolean(parent.closest('script, style, input, textarea, select, mark[data-wawa-html-find]'));
  };

  const textNodesForFind = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return skippedTextParent(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }
    return nodes;
  };

  const clearMarks = () => {
    document.querySelectorAll('mark[data-wawa-html-find]').forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
    matches = [];
    currentIndex = 0;
  };

  const report = () => {
    parent.postMessage({
      type: 'wawa-html-note-find-results',
      frameId,
      total: matches.length,
      currentIndex: matches.length ? currentIndex : 0
    }, '*');
  };

  const updateCurrent = (scroll = true) => {
    matches.forEach((match, index) => match.classList.toggle('is-current', index === currentIndex));
    if (scroll && matches[currentIndex]) {
      matches[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    report();
  };

  const highlightNode = (textNode, query) => {
    const text = textNode.nodeValue || '';
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const fragment = document.createDocumentFragment();
    let index = 0;
    let found = false;
    while (index < text.length) {
      const matchIndex = lowerText.indexOf(lowerQuery, index);
      if (matchIndex < 0) break;
      if (matchIndex > index) fragment.appendChild(document.createTextNode(text.slice(index, matchIndex)));
      const mark = document.createElement('mark');
      mark.dataset.wawaHtmlFind = 'true';
      mark.textContent = text.slice(matchIndex, matchIndex + query.length);
      fragment.appendChild(mark);
      index = matchIndex + query.length;
      found = true;
    }
    if (!found) return;
    if (index < text.length) fragment.appendChild(document.createTextNode(text.slice(index)));
    textNode.parentNode.replaceChild(fragment, textNode);
  };

  const applyQuery = (query) => {
    clearMarks();
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) {
      report();
      return;
    }
    textNodesForFind().forEach((node) => highlightNode(node, normalizedQuery));
    matches = [...document.querySelectorAll('mark[data-wawa-html-find]')];
    currentIndex = 0;
    updateCurrent(true);
  };

  const move = (direction) => {
    if (!matches.length) return report();
    currentIndex = (currentIndex + (direction < 0 ? -1 : 1) + matches.length) % matches.length;
    updateCurrent(true);
  };

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type !== 'wawa-html-note-find' || data.frameId !== frameId) return;
    if (data.action === 'clear') {
      clearMarks();
      report();
      return;
    }
    if (data.action === 'move') {
      move(Number(data.direction || 1));
      return;
    }
    if (data.action === 'set') {
      applyQuery(data.query || '');
    }
  });
})();`;
}

const srcdoc = computed(() => {
  const scriptOpen = "<script>";
  const scriptClose = `<${"/"}script>`;
  const htmlClass = props.fillViewport ? ' class="is-fill-viewport"' : "";
  const resizeScript = props.fillViewport ? "" : `${scriptOpen}${autoResizeScript()}${scriptClose}`;
  const appBridgeScript = `${scriptOpen}${bridgeScript()}${scriptClose}`;
  return `<!doctype html>
<html lang="zh-CN"${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${themeVars.value}\n${baseCss}</style>
</head>
<body>
<main class="rich-note-root">${preparedHtml.value}</main>
${resizeScript}
${appBridgeScript}
</body>
</html>`;
});

const frameStyle = computed(() => (
  props.fillViewport ? { height: "100%" } : { height: `${frameHeight.value}px` }
));

function handleMessage(event) {
  const data = event.data || {};
  if (data.frameId !== frameId) return;
  if (data.type === "wawa-html-note-height") {
    if (props.fillViewport) return;
    const nextHeight = Number(data.height || 0);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    frameHeight.value = Math.max(480, Math.min(20000, Math.ceil(nextHeight + 4)));
    return;
  }
  if (data.type === "wawa-html-note-find-results") {
    emit("find-results-change", {
      total: Number(data.total || 0),
      currentIndex: Number(data.currentIndex || 0),
    });
    return;
  }
  if (data.type === "wawa-html-note-keydown") {
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: data.key,
      ctrlKey: Boolean(data.ctrlKey),
      metaKey: Boolean(data.metaKey),
      altKey: Boolean(data.altKey),
      shiftKey: Boolean(data.shiftKey),
      bubbles: true,
      cancelable: true,
    }));
  }
}

function postFindMessage(payload) {
  frameRef.value?.contentWindow?.postMessage({ type: "wawa-html-note-find", frameId, ...payload }, "*");
}

function syncFindToFrame() {
  if (!props.searchActive) {
    postFindMessage({ action: "clear" });
    return;
  }
  postFindMessage({ action: "set", query: props.searchQuery });
}

function handleFrameLoad() {
  nextTick(syncFindToFrame);
}

onMounted(() => {
  syncThemeVars();
  prepareHtml();
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

watch(
  () => [props.html, props.vaultRootPath, props.node?.id, props.node?.domain, props.previewNode?.id, props.previewNode?.domain, props.assetFiles],
  () => prepareHtml(),
  { deep: true },
);
watch(() => props.node?.color, scheduleThemeSync);
watch(() => [props.searchActive, props.searchQuery], syncFindToFrame);
watch(() => props.searchMoveToken, () => {
  if (!props.searchActive) return;
  postFindMessage({ action: "move", direction: props.searchMoveDirection });
});
</script>

<template>
  <div class="html-note-renderer" :class="{ 'is-fill-viewport': fillViewport }">
    <div v-if="assetLoading && !preparedHtml" class="html-note-state">Loading assets...</div>
    <div v-else-if="assetErrors.length" class="html-note-state is-error">{{ assetErrors[0] }}</div>
    <iframe
      ref="frameRef"
      class="html-note-frame"
      title="HTML note"
      :srcdoc="srcdoc"
      :style="frameStyle"
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-modals"
      allow="fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
      @load="handleFrameLoad"
    ></iframe>
  </div>
</template>

<style scoped>
.html-note-renderer {
  width: 100%;
  min-width: 0;
}

.html-note-renderer.is-fill-viewport {
  display: flex;
  height: 100%;
  min-height: 0;
}

.html-note-frame {
  display: block;
  width: 100%;
  min-height: 480px;
  border: 0;
  background: var(--background-main);
}

.html-note-renderer.is-fill-viewport .html-note-frame {
  flex: 1;
  min-height: 0;
}

.html-note-state {
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 12px;
  text-transform: uppercase;
}

.html-note-state.is-error {
  color: var(--game-dev);
}
</style>
