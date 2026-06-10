import { parseYaml } from "./parse-yaml.js";

export const NATIVE_BLOCK_TYPES = Object.freeze([
  "concept-card",
  "process-flow",
  "compare-table",
  "code-explain",
  "quiz",
  "expression-visualizer",
]);

const NATIVE_BLOCK_SET = new Set(NATIVE_BLOCK_TYPES);
const TYPE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXECUTABLE_KEYS = new Set([
  "css",
  "eval",
  "html",
  "iframe",
  "javascript",
  "js",
  "script",
  "src",
  "style",
  "styles",
  "url",
]);
const ALLOWED_ENGINE = "visual-grammar";
const ALLOWED_LAYOUT_TYPES = new Set(["split-panel", "stack", "grid"]);
const ALLOWED_PANEL_TYPES = new Set(["svg-scene", "inspector"]);
const ALLOWED_COORDINATE_SYSTEMS = new Set(["normalized-2d"]);
const ALLOWED_ELEMENT_TYPES = new Set([
  "node",
  "edge",
  "arrow",
  "label",
  "badge",
  "formula-callout",
  "table",
]);
const ALLOWED_INTERACTIONS = new Set(["select", "highlight-related"]);

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function hasExecutableField(value, path = []) {
  if (!value || typeof value !== "object") return "";
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nextPath = [...path, key];
    if (normalizedKey.startsWith("on") || EXECUTABLE_KEYS.has(normalizedKey)) {
      return nextPath.join(".");
    }
    const nested = hasExecutableField(child, nextPath);
    if (nested) return nested;
  }
  return "";
}

function layoutWarnings(definition) {
  const warnings = [];
  const layout = definition.renderer?.layout || {};
  if (layout.type && !ALLOWED_LAYOUT_TYPES.has(layout.type)) {
    warnings.push(`Unsupported declarative layout "${layout.type}".`);
  }
  asArray(layout.panels).forEach((panel) => {
    if (panel?.type && !ALLOWED_PANEL_TYPES.has(panel.type)) {
      warnings.push(`Unsupported panel type "${panel.type}".`);
    }
  });
  ["left", "right"].forEach((slot) => {
    const panel = layout[slot];
    if (panel?.type && !ALLOWED_PANEL_TYPES.has(panel.type)) {
      warnings.push(`Unsupported ${slot} panel type "${panel.type}".`);
    }
  });
  return warnings;
}

function grammarWarnings(definition) {
  const warnings = [];
  const scenes = definition.visualGrammar?.scenes || {};
  Object.entries(scenes).forEach(([sceneName, scene]) => {
    if (scene.coordinateSystem && !ALLOWED_COORDINATE_SYSTEMS.has(scene.coordinateSystem)) {
      warnings.push(`Scene "${sceneName}" uses unsupported coordinate system "${scene.coordinateSystem}".`);
    }
    asArray(scene.elements).forEach((element) => {
      if (element?.type && !ALLOWED_ELEMENT_TYPES.has(element.type)) {
        warnings.push(`Element "${element.type}" is unsupported and will be ignored.`);
      }
    });
  });
  asArray(definition.interactions).forEach((interaction) => {
    const type = typeof interaction === "string" ? interaction : interaction?.type;
    if (type && !ALLOWED_INTERACTIONS.has(type)) {
      warnings.push(`Interaction "${type}" is unsupported and will be ignored.`);
    }
  });
  return warnings;
}

function normalizeBlockTypeDefinition(filePath, rawDefinition) {
  const definition = rawDefinition && typeof rawDefinition === "object" ? rawDefinition : {};
  const type = definition.type || filePath.split("/").pop()?.replace(/\.ya?ml$/i, "") || "";
  const errors = [];
  const warnings = [];

  if (!TYPE_PATTERN.test(type)) errors.push(`Block type "${type}" must be kebab-case.`);
  if (NATIVE_BLOCK_SET.has(type)) errors.push(`Block type "${type}" conflicts with a native block type.`);
  if (definition.kind !== "declarative-visual") errors.push(`Block type "${type}" must use kind declarative-visual.`);
  if (definition.renderer?.engine !== ALLOWED_ENGINE) {
    errors.push(`Block type "${type}" must use renderer.engine ${ALLOWED_ENGINE}.`);
  }

  const executableField = hasExecutableField(definition);
  if (executableField) errors.push(`Block type "${type}" contains forbidden executable/remote field "${executableField}".`);

  warnings.push(...layoutWarnings(definition), ...grammarWarnings(definition));

  return {
    ...definition,
    type,
    sourcePath: filePath,
    native: false,
    errors,
    warnings,
  };
}

export function normalizeBlockTypes(blockTypeFiles = {}) {
  const definitions = {};
  const errors = [];
  const warnings = [];

  Object.entries(blockTypeFiles).forEach(([filePath, raw]) => {
    let parsed = {};
    try {
      parsed = parseYaml(raw, filePath);
    } catch (error) {
      errors.push(String(error?.message || error));
      return;
    }

    const definition = normalizeBlockTypeDefinition(filePath.replaceAll("\\", "/"), parsed);
    definition.errors.forEach((message) => errors.push(`${filePath}: ${message}`));
    definition.warnings.forEach((message) => warnings.push(`${filePath}: ${message}`));
    if (!definition.errors.length && !definitions[definition.type]) {
      definitions[definition.type] = definition;
    } else if (definitions[definition.type]) {
      errors.push(`${filePath}: Duplicate custom block type "${definition.type}".`);
    }
  });

  return {
    definitions,
    errors,
    warnings,
  };
}

export function getBlockRegistry(vault = {}) {
  const customTypes = vault.blockTypes || {};
  return {
    native: Object.fromEntries(NATIVE_BLOCK_TYPES.map((type) => [type, { type, native: true }])),
    declarative: customTypes,
    errors: vault.blockTypeErrors || [],
    warnings: vault.blockTypeWarnings || [],
  };
}

export function isNativeBlockType(type) {
  return NATIVE_BLOCK_SET.has(type);
}

export function isRegisteredDeclarativeBlockType(type, registry = {}) {
  return Boolean(registry.declarative?.[type] || registry.blockTypes?.[type]);
}

export function getRegisteredDeclarativeBlockType(type, registry = {}) {
  return registry.declarative?.[type] || registry.blockTypes?.[type] || null;
}
