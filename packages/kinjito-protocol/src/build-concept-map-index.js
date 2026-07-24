import { parseYaml, parseYamlFiles } from "./parse-yaml.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeMapId(value, filePath = "") {
  const id = String(value || "").trim();
  if (id) return id;
  return String(filePath || "")
    .split("/")
    .pop()
    ?.replace(/\.layout\.ya?ml$/i, "")
    .replace(/\.ya?ml$/i, "") || "";
}

function normalizeTitle(value, fallback) {
  return String(value || fallback || "").trim();
}

function normalizeConceptNode(node = {}, index = 0) {
  const id = String(node.id || `concept-${index + 1}`).trim();
  return {
    ...node,
    id,
    title: normalizeTitle(node.title, id),
    titleLocale: node.titleLocale || node.title_locale || "",
    kind: node.kind || node.type || "concept",
    summary: node.summary || "",
    layer: node.layer || node.group || "default",
    ownerNodeId: node.ownerNodeId || node.owner_node_id || "",
    formula: node.formula || "",
    theorem: node.theorem || "",
  };
}

function normalizeConceptRelation(relation = {}, index = 0) {
  const from = relation.from || relation.source;
  const to = relation.to || relation.target;
  const type = relation.type || relation.relation || "related";
  return {
    ...relation,
    id: relation.id || `${from || "source"}-${type}-${to || "target"}-${index + 1}`,
    from,
    to,
    source: from,
    target: to,
    type,
    label: relation.label || relation.title || "",
    labelLocale: relation.labelLocale || relation.label_locale || "",
    condition: relation.condition || "",
    formula: relation.formula || "",
    explanation: relation.explanation || relation.summary || "",
  };
}

function normalizeLayer(layer = {}, index = 0) {
  if (typeof layer === "string") {
    return { id: layer, title: layer, titleLocale: "", order: index + 1 };
  }
  const id = layer.id || `layer-${index + 1}`;
  return {
    ...layer,
    id,
    title: layer.title || id,
    titleLocale: layer.titleLocale || layer.title_locale || "",
    order: Number.isFinite(Number(layer.order)) ? Number(layer.order) : index + 1,
  };
}

function normalizeRelationType(type = {}, index = 0) {
  if (typeof type === "string") {
    return { id: type, label: type, labelLocale: "", color: "", lineStyle: "solid", order: index + 1 };
  }
  const id = type.id || type.type || `relation-type-${index + 1}`;
  return {
    ...type,
    id,
    label: type.label || type.title || id,
    labelLocale: type.labelLocale || type.label_locale || "",
    color: type.color || "",
    lineStyle: type.lineStyle || type.line_style || "solid",
    direction: type.direction || "forward",
    order: Number.isFinite(Number(type.order)) ? Number(type.order) : index + 1,
  };
}

function normalizeLayout(raw = {}) {
  return {
    ...raw,
    nodes: Object.fromEntries(
      Object.entries(raw.nodes || {}).map(([nodeId, box]) => [
        nodeId,
        {
          x: Number(box?.x) || 0,
          y: Number(box?.y) || 0,
          width: Number(box?.width || box?.w) || 190,
          height: Number(box?.height || box?.h) || 78,
        },
      ]),
    ),
  };
}

function normalizeConceptMap(raw = {}, filePath = "", layout = null) {
  const id = normalizeMapId(raw.id, filePath);
  const ownerNodeId = raw.ownerNodeId || raw.owner_node_id || raw.scopeNodeId || raw.scope_node_id || "";
  return {
    ...raw,
    id,
    filePath,
    title: normalizeTitle(raw.title, id),
    titleLocale: raw.titleLocale || raw.title_locale || "",
    domain: raw.domain || "",
    ownerNodeId,
    summary: raw.summary || raw.description || "",
    layers: asArray(raw.layers).map(normalizeLayer),
    relationTypes: asArray(raw.relationTypes || raw.relation_types).map(normalizeRelationType),
    nodes: asArray(raw.nodes || raw.concepts).map(normalizeConceptNode),
    relations: asArray(raw.relations || raw.edges).map(normalizeConceptRelation),
    layout,
  };
}

function isLayoutPath(path = "") {
  return /\.layout\.ya?ml$/i.test(path);
}

export function buildConceptMapIndex(conceptMapFiles = {}) {
  const rawMainFiles = Object.fromEntries(Object.entries(conceptMapFiles).filter(([path]) => !isLayoutPath(path)));
  const rawLayoutFiles = Object.fromEntries(Object.entries(conceptMapFiles).filter(([path]) => isLayoutPath(path)));
  const parsedMaps = parseYamlFiles(rawMainFiles);
  const parsedLayouts = Object.fromEntries(
    Object.entries(rawLayoutFiles).map(([path, raw]) => [normalizeMapId("", path), normalizeLayout(parseYaml(raw, path))]),
  );
  const all = Object.entries(parsedMaps)
    .map(([filePath, raw]) => normalizeConceptMap(raw, filePath, parsedLayouts[normalizeMapId(raw.id, filePath)] || null))
    .filter((map) => map.id);
  const byId = Object.fromEntries(all.map((map) => [map.id, map]));
  const byDomain = {};
  const byOwnerNodeId = {};

  all.forEach((map) => {
    if (map.domain) {
      if (!byDomain[map.domain]) byDomain[map.domain] = [];
      byDomain[map.domain].push(map);
    }
    if (map.ownerNodeId) {
      if (!byOwnerNodeId[map.ownerNodeId]) byOwnerNodeId[map.ownerNodeId] = [];
      byOwnerNodeId[map.ownerNodeId].push(map);
    }
    map.nodes.forEach((node) => {
      if (!node.ownerNodeId) return;
      if (!byOwnerNodeId[node.ownerNodeId]) byOwnerNodeId[node.ownerNodeId] = [];
      if (!byOwnerNodeId[node.ownerNodeId].some((item) => item.id === map.id)) {
        byOwnerNodeId[node.ownerNodeId].push(map);
      }
    });
  });

  return {
    all,
    byId,
    byDomain,
    byOwnerNodeId,
    rawFiles: conceptMapFiles,
  };
}
