import { invoke, isTauri } from "@tauri-apps/api/core";
import YAML from "yaml";
import { normalizeVault } from "../../../../packages/knowledge-core/src/index.js";
import { loadStaticVault } from "./static-vault-loader.js";

const LAST_VAULT_KEY = "amazingwawa.lastVaultRootPath";

function normalizeFromRaw(rawFiles, vaultRootPath) {
  const normalizedVault = normalizeVault({
    vaultYaml: rawFiles.vault_yaml,
    domainsYaml: rawFiles.domains_yaml,
    graphYaml: rawFiles.graph_yaml,
    graphLayoutYaml: rawFiles.graph_layout_yaml,
    metaFiles: rawFiles.meta_files || {},
    noteFiles: rawFiles.note_files || {},
  });

  return {
    ...normalizedVault,
    vaultRootPath,
    source: "desktop",
  };
}

function loadStaticFallback(reason) {
  if (reason) console.warn("[vault] Using static sample vault fallback.", reason);
  return {
    ...loadStaticVault(),
    vaultRootPath: "",
    source: "static",
  };
}

export async function chooseVaultRoot() {
  if (!isTauri()) return null;
  return invoke("choose_vault_root");
}

export async function loadVaultFromPath(vaultRootPath) {
  const rawFiles = await invoke("read_vault_files", { vaultRootPath });
  const normalizedVault = normalizeFromRaw(rawFiles, vaultRootPath);
  localStorage.setItem(LAST_VAULT_KEY, vaultRootPath);
  return normalizedVault;
}

export async function loadInitialVault() {
  const lastVaultPath = localStorage.getItem(LAST_VAULT_KEY);

  if (lastVaultPath && isTauri()) {
    try {
      return await loadVaultFromPath(lastVaultPath);
    } catch (error) {
      console.warn("[vault] Failed to load last opened vault path.", error);
    }
  }

  if (isTauri()) {
    try {
      const defaultVaultPath = await invoke("resolve_default_vault_root");
      if (defaultVaultPath) return await loadVaultFromPath(defaultVaultPath);
    } catch (error) {
      console.warn("[vault] Failed to load default development vault.", error);
    }
  }

  return loadStaticFallback(
    lastVaultPath
      ? "last vault path and default development vault failed"
      : "no last vault path and default development vault unavailable",
  );
}

export function getNoteRelativePath(node) {
  return `content/${node.domain}/${node.id}/note.md`;
}

export function getNoteAbsolutePath(vaultRootPath, node) {
  return `${vaultRootPath.replace(/[\\/]+$/, "")}/${getNoteRelativePath(node)}`;
}

export async function writeNoteMarkdown(vaultRootPath, node, markdown) {
  if (!vaultRootPath) {
    throw new Error("Cannot save note.md because no desktop vault folder is active.");
  }

  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: getNoteRelativePath(node),
    contents: markdown,
  });
}

function assertKebabId(id) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function todayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function replaceFirstHeading(markdown, title) {
  if (/^#\s+.+$/m.test(markdown)) return markdown.replace(/^#\s+.+$/m, `# ${title}`);
  return `# ${title}\n\n${markdown}`;
}

async function readOptionalTextFile(vaultRootPath, relativePath) {
  try {
    return await invoke("read_text_file", { vaultRootPath, relativePath });
  } catch {
    return "";
  }
}

async function buildInitialNoteMarkdown(vaultRootPath, payload) {
  const template =
    (await readOptionalTextFile(vaultRootPath, `templates/${payload.type}/note.md`)) ||
    (await readOptionalTextFile(vaultRootPath, "templates/concept/note.md"));

  if (template) return replaceFirstHeading(template, payload.title);

  return `# ${payload.title}

## 一句话定义

${payload.summary || ""}

## 它解决什么问题？

## 核心直觉

## 正式解释

## 最小例子

## 常见误区

## 相关知识

## 复习问题

question:
answer:
`;
}

function buildMetaYaml(payload) {
  const date = todayLocalDate();
  return YAML.stringify({
    id: payload.id,
    title: payload.title,
    domain: payload.domain,
    type: payload.type,
    status: payload.status,
    summary: payload.summary || "",
    createdAt: date,
    updatedAt: date,
    tags: [payload.domain],
    prerequisites: [],
    related: [],
  });
}

function buildGraphYamlWithEdge(graphYaml, edge) {
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  if (edges.some((item) => item.id === edge.id)) {
    throw new Error(`Edge "${edge.id}" already exists.`);
  }
  if (
    edges.some(
      (item) =>
        (item.from || item.source) === edge.from &&
        (item.to || item.target) === edge.to &&
        item.relation === edge.relation,
    )
  ) {
    throw new Error(`Duplicate ${edge.from}/${edge.to}/${edge.relation} edge.`);
  }

  return YAML.stringify({
    ...graph,
    schemaVersion: graph.schemaVersion || 1,
    edges: [...edges, edge],
  });
}

export async function createKnowledgeItem(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Open a desktop vault folder before creating notes.");
  if (!payload.title?.trim()) throw new Error("Title is required.");
  if (!payload.id?.trim()) throw new Error("ID is required.");
  if (!assertKebabId(payload.id)) throw new Error("ID must be lowercase kebab-case.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const nodeIds = new Set(currentVault.nodes.map((node) => node.id));
  const domainIds = new Set(currentVault.domains.map((domain) => domain.id));
  const nodeById = new Map(currentVault.nodes.map((node) => [node.id, node]));

  if (nodeIds.has(payload.id)) throw new Error(`Node "${payload.id}" already exists.`);
  if (!domainIds.has(payload.domain)) throw new Error(`Domain "${payload.domain}" does not exist.`);
  if (!nodeIds.has(payload.parentId)) throw new Error(`Parent "${payload.parentId}" does not exist.`);
  const parentNode = nodeById.get(payload.parentId);
  if (parentNode.type === "domain" && parentNode.id !== payload.domain) {
    throw new Error("Parent must belong to the selected domain. Use New Link for cross-domain relationships.");
  }
  if (parentNode.type !== "domain" && parentNode.domain !== payload.domain) {
    throw new Error("Parent must belong to the selected domain. Use New Link for cross-domain relationships.");
  }

  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  const edge = {
    id: `${payload.parentId}-contains-${payload.id}`,
    from: payload.parentId,
    to: payload.id,
    relation: "contains",
  };
  const updatedGraphYaml = buildGraphYamlWithEdge(graphYaml, edge);

  const itemDir = `content/${payload.domain}/${payload.id}`;
  await invoke("create_dir_all", { vaultRootPath, relativePath: `${itemDir}/assets` });

  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: `${itemDir}/meta.yaml`,
    contents: buildMetaYaml(payload),
  });

  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: `${itemDir}/note.md`,
    contents: await buildInitialNoteMarkdown(vaultRootPath, payload),
  });

  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "graph.yaml",
    contents: updatedGraphYaml,
  });

  return {
    vault: await loadVaultFromPath(vaultRootPath),
    newNodeId: payload.id,
  };
}

function serializeBoardForYaml(board, existingBoard = {}) {
  const nodes = Object.fromEntries(
    Object.entries(board.nodes || {}).map(([nodeId, box]) => [
      nodeId,
      {
        x: box.x,
        y: box.y,
        w: box.width ?? box.w,
        h: box.height ?? box.h,
      },
    ]),
  );

  return {
    width: board.width || 2400,
    height: board.height || 1600,
    grid: board.grid || 32,
    nodes,
    ...(existingBoard.routes ? { routes: existingBoard.routes } : {}),
  };
}

export async function saveGraphLayoutBoard(vaultRootPath, scopeId, board) {
  if (!vaultRootPath) throw new Error("Open a desktop vault folder before saving layout.");
  if (!scopeId) throw new Error("Cannot save layout without a scope ID.");
  if (!board?.nodes) throw new Error("Cannot save layout without node positions.");

  let graphLayoutYaml = "";
  try {
    graphLayoutYaml = await invoke("read_text_file", {
      vaultRootPath,
      relativePath: "graph-layout.yaml",
    });
  } catch {
    graphLayoutYaml = "schemaVersion: 1\nboards: {}\n";
  }

  const graphLayout = YAML.parse(graphLayoutYaml) || {};
  const boards = graphLayout.boards || {};
  const existingBoard = boards[scopeId] || {};

  const updatedLayout = {
    ...graphLayout,
    schemaVersion: graphLayout.schemaVersion || 1,
    boards: {
      ...boards,
      [scopeId]: serializeBoardForYaml(board, existingBoard),
    },
  };

  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "graph-layout.yaml",
    contents: YAML.stringify(updatedLayout),
  });

  return loadVaultFromPath(vaultRootPath);
}
