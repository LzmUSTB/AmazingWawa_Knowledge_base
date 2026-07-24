import { invoke, isTauri } from "@tauri-apps/api/core";
import YAML from "yaml";
import { updateExerciseProblemSolution } from "../exercises/exercise-solution.js";
import {
  buildAiPackageApplyPlan,
  buildAiContextFiles,
  diffAiPackage,
  EXERCISE_DIFFICULTIES,
  EXERCISE_MODES,
  EXERCISE_TYPES,
  normalizeAiPackageFiles,
  normalizeVault,
  validateAiPackage,
} from "@kinjito/protocol";

const LINK_RELATIONS = new Set(["depends-on", "used-in", "compares-with"]);
const LEGACY_VAULT_KEY = "amazingwawa.lastVaultRootPath";
const EDITABLE_DOMAIN_FIELDS = ["title", "titleLocale", "description", "descriptionLocale", "color", "order"];
const EDITABLE_NODE_FIELDS = ["title", "titleLocale", "summary", "summaryLocale", "type", "status", "tags", "aliases"];

function normalizeFromRaw(rawFiles, vaultRootPath) {
  const normalizedVault = normalizeVault({
    vaultYaml: rawFiles.vault_yaml,
    domainsYaml: rawFiles.domains_yaml,
    graphYaml: rawFiles.graph_yaml,
    graphLayoutYaml: rawFiles.graph_layout_yaml,
    metaFiles: rawFiles.meta_files || {},
    noteFiles: rawFiles.note_files || {},
    noteHtmlFiles: rawFiles.note_html_files || {},
    exerciseFiles: rawFiles.exercise_files || {},
    exerciseProgressYaml: rawFiles.exercise_progress_yaml || "",
    blockTypeFiles: rawFiles.block_type_files || {},
    conceptMapFiles: rawFiles.concept_map_files || {},
  });
  return { ...normalizedVault, vaultRootPath, source: "desktop" };
}

export async function chooseVaultRoot() {
  if (!isTauri()) return null;
  return invoke("choose_existing_vault_folder");
}

export async function chooseExistingVaultFolder() {
  if (!isTauri()) return null;
  return invoke("choose_existing_vault_folder");
}

export async function chooseVaultDestinationFolder() {
  if (!isTauri()) return null;
  return invoke("choose_vault_destination_folder");
}

export async function loadVaultFromPath(vaultRootPath) {
  const rawFiles = await invoke("read_vault_files", { vaultRootPath });
  return normalizeFromRaw(rawFiles, vaultRootPath);
}

export async function loadInitialVault() {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to load a vault.");
  const settings = await invoke("read_app_settings");
  const activeVaultPath = String(settings?.activeVaultPath || "").trim();
  if (!activeVaultPath) {
    const legacyPath = String(localStorage.getItem(LEGACY_VAULT_KEY) || "").trim();
    if (legacyPath) {
      try {
        const migratedVault = await activateVaultPath(legacyPath);
        localStorage.removeItem(LEGACY_VAULT_KEY);
        return migratedVault;
      } catch (error) {
        console.warn("[vault] Legacy vault path migration failed.", error);
      }
    }
    const defaultPath = await resolveDefaultVaultPath();
    try {
      await invoke("verify_vault_path", { vaultPath: defaultPath });
      const settings = await invoke("write_app_settings", {
        settings: { version: 1, activeVaultPath: defaultPath },
      });
      return loadVaultFromPath(settings.activeVaultPath);
    } catch {
      throw new Error("No active vault is configured.");
    }
  }
  await invoke("verify_vault_path", { vaultPath: activeVaultPath });
  return loadVaultFromPath(activeVaultPath);
}

export async function readAppSettings() {
  if (!isTauri()) return { version: 1, activeVaultPath: "" };
  return invoke("read_app_settings");
}

export async function activateVaultPath(vaultPath) {
  const verifiedPath = await invoke("verify_vault_path", { vaultPath });
  const settings = await invoke("write_app_settings", {
    settings: { version: 1, activeVaultPath: verifiedPath },
  });
  return loadVaultFromPath(settings.activeVaultPath);
}

export async function resolveDefaultVaultPath() {
  return invoke("resolve_default_vault_path");
}

export async function createNewVaultAt(vaultPath) {
  const createdPath = await invoke("create_new_vault", { vaultPath });
  return activateVaultPath(createdPath);
}

export async function cloneVaultFromRemote(remoteUrl, destinationPath) {
  const clonedPath = await invoke("clone_vault_from_remote", { remoteUrl, destinationPath });
  return activateVaultPath(clonedPath);
}

export async function importVaultToActiveLocation(sourcePath, destinationPath) {
  const copiedPath = await invoke("copy_vault_to_path", { sourcePath, destinationPath });
  return activateVaultPath(copiedPath);
}

export async function moveActiveVault(sourcePath, destinationPath) {
  const copiedPath = await invoke("copy_vault_to_path", { sourcePath, destinationPath });
  return activateVaultPath(copiedPath);
}

export async function deleteOldVaultAfterMove(oldVaultPath) {
  return invoke("delete_old_vault_after_move", { oldVaultPath });
}

export async function openActiveVaultInExplorer() {
  return invoke("open_path_in_file_explorer");
}

export const vaultGit = {
  isAvailable: () => invoke("git_is_available"),
  isRepo: () => invoke("git_is_repo"),
  init: () => invoke("git_init_vault"),
  status: () => invoke("git_status"),
  branch: () => invoke("git_branch"),
  remoteGet: () => invoke("git_remote_get"),
  remoteSet: (remoteUrl) => invoke("git_remote_set", { remoteUrl }),
  remoteTest: () => invoke("git_remote_test"),
  addSelected: (paths) => invoke("git_add_selected", { paths }),
  discardPath: (path, status) => invoke("git_discard_path", { path, status }),
  commit: (message) => invoke("git_commit", { message }),
  pull: () => invoke("git_pull_rebase"),
  push: () => invoke("git_push"),
  sync: () => invoke("git_sync"),
  log: () => invoke("git_log"),
  restore: (commit) => invoke("git_restore_commit", { commit }),
  checkpoint: (reason) => invoke("git_create_checkpoint", { reason }),
  stashLayout: () => invoke("git_stash_layout"),
  unstash: (stashRef) => invoke("git_unstash", { stashRef }),
  ensureAppRepoIgnore: () => invoke("ensure_app_repo_ignores_active_vault"),
};

export async function chooseWawaPackageFile() {
  if (!isTauri()) return null;
  return invoke("choose_wawapkg_file");
}

export async function chooseExerciseSetFile() {
  if (!isTauri()) return null;
  return invoke("choose_exercise_set_file");
}

export async function readExternalTextFile(filePath) {
  if (!filePath) return "";
  return invoke("read_external_text_file", { filePath });
}

export async function chooseHtmlNoteFile() {
  if (!isTauri()) return null;
  return invoke("choose_html_note_file");
}

export async function chooseHtmlNoteFolder() {
  if (!isTauri()) return null;
  return invoke("choose_html_note_folder");
}

export async function readWawaPackageFile(packageFilePath) {
  if (!packageFilePath) throw new Error("Choose a .wawapkg file first.");
  const rawPackage = await invoke("read_wawapkg_file", { packageFilePath });
  return normalizeAiPackageFiles(rawPackage);
}

export async function readAiImportHistory(vaultRootPath, packageId) {
  if (!vaultRootPath || !packageId) return { applied: false, appliedAt: "", raw: "" };
  const history = await invoke("read_ai_import_history", { vaultRootPath, packageId });
  return { applied: Boolean(history.applied), appliedAt: history.applied_at || "", raw: history.raw || "" };
}

export async function exportContext(vaultRootPath) {
  if (!vaultRootPath) throw new Error("Configure an active vault before exporting context.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const files = buildAiContextFiles(currentVault);
  await invoke("reset_context_export_dir", { vaultRootPath });
  await Promise.all(
    Object.entries(files).map(([fileName, contents]) =>
      invoke("write_text_file", {
        vaultRootPath,
        relativePath: `.kb-ai/context/${fileName}`,
        contents,
      }),
    ),
  );
  return ".kb-ai/context";
}

export async function openVaultContextFolder(vaultRootPath) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to open folders.");
  if (!vaultRootPath) return;
  await invoke("open_vault_relative_dir", { vaultRootPath, relativePath: ".kb-ai/context" });
}

export async function openVaultExportsFolder(vaultRootPath) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to open folders.");
  if (!vaultRootPath) return;
  await invoke("open_vault_relative_dir", { vaultRootPath, relativePath: ".kb-ai/exports" });
}

export async function openWrongPracticeFolder(vaultRootPath) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to open folders.");
  if (!vaultRootPath) return;
  await invoke("open_vault_relative_dir", { vaultRootPath, relativePath: ".kb-ai/wrong-practice" });
}

export async function openKnowledgeItemFolder(vaultRootPath, node) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to open folders.");
  if (!vaultRootPath || !node?.id) return;
  const relativePath = node.type === "domain"
    ? `content/${node.id}`
    : `content/${node.domain}/${node.id}`;
  await invoke("open_vault_relative_dir", { vaultRootPath, relativePath });
}

function timestampForPackageId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parentIdForNode(node, edges = []) {
  const parentEdge = edges.find((edge) => edge.relation === "contains" && edge.to === node.id);
  return parentEdge?.from || node.domain;
}

function orderedExportNodes(vault) {
  const nodes = (vault.nodes || []).filter((node) => node.type !== "domain");
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set();
  const visiting = new Set();
  const ordered = [];
  const visit = (node) => {
    if (!node || visited.has(node.id)) return;
    if (visiting.has(node.id)) {
      ordered.push(node);
      visited.add(node.id);
      return;
    }
    visiting.add(node.id);
    const parentId = parentIdForNode(node, vault.edges || []);
    if (byId.has(parentId)) visit(byId.get(parentId));
    visiting.delete(node.id);
    if (!visited.has(node.id)) {
      visited.add(node.id);
      ordered.push(node);
    }
  };
  nodes.forEach(visit);
  return ordered;
}

function fullVaultPackageOperations(vault) {
  const domains = (vault.domains || []).map((domain) => ({
    type: "add_domain",
    domain: {
      id: domain.id,
      title: domain.title || domain.id,
      titleLocale: domain.titleLocale || "",
      description: domain.description || "",
      descriptionLocale: domain.descriptionLocale || "",
      color: domain.color || "",
      order: domain.order,
    },
  }));
  const nodes = orderedExportNodes(vault)
    .map((node) => ({
      type: "add_node",
      parentId: parentIdForNode(node, vault.edges || []),
      node: {
        id: node.id,
        title: node.title || node.id,
        titleLocale: node.titleLocale || "",
        domain: node.domain,
        type: node.type || "concept",
        status: node.status || "seed",
        summary: node.summary || "",
        summaryLocale: node.summaryLocale || "",
        contentFormat: node.contentFormat || (vault.notes?.[node.id]?.html ? "html" : vault.notes?.[node.id]?.markdown ? "markdown" : "none"),
        aliases: node.aliases || [],
        tags: node.tags || [],
      },
    }));
  const exerciseOps = (vault.exercises?.all || []).map((exerciseSet) => {
    const node = (vault.nodes || []).find((item) => item.id === exerciseSet.nodeId);
    return {
      type: "append_exercise_set",
      targetId: exerciseSet.nodeId,
      domain: node?.domain || "",
    };
  });
  const relationOps = (vault.edges || [])
    .filter((edge) => edge.relation !== "contains")
    .map((edge) => ({
      type: "add_edge",
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
      reason: edge.reason || "",
    }));
  const conceptMapOps = (vault.conceptMaps?.all || []).map((map) => ({
    type: "upsert_concept_map",
    id: map.id,
    title: map.title || map.id,
    titleLocale: map.titleLocale || "",
    domain: map.domain || "",
    ownerNodeId: map.ownerNodeId || "",
    file: `generated/concept-maps/${map.id}.yaml`,
    layoutFile: vault.conceptMaps?.rawFiles?.[`concept-maps/${map.id}.layout.yaml`]
      ? `generated/concept-maps/${map.id}.layout.yaml`
      : "",
  }));
  return [...domains, ...nodes, ...exerciseOps, ...relationOps, ...conceptMapOps];
}

function fullVaultPackagePayload(vault) {
  const packageId = `wawa-import-vault-export-${timestampForPackageId()}`;
  const nodeCount = (vault.nodes || []).filter((node) => node.type !== "domain").length;
  const exerciseSetCount = vault.exercises?.all?.length || 0;
  const conceptMapCount = vault.conceptMaps?.all?.length || 0;
  const nonContainsEdgeCount = (vault.edges || []).filter((edge) => edge.relation !== "contains").length;
  const manifest = {
    schemaVersion: 1.1,
    packageFormat: "wawapkg",
    packageKind: "import",
    packageId,
    title: `${vault.vault?.title || "Knowledge Vault"} Export`,
    status: "ready",
    preview: {
      mode: "in-app",
      generatedHtmlPreview: false,
    },
  };
  const sources = {
    sources: [
      {
        id: "vault-export",
        type: "local-vault",
        title: vault.vault?.title || "Knowledge Vault",
        location: vault.vaultRootPath || "",
      },
    ],
  };
  const patch = {
    operations: fullVaultPackageOperations(vault),
  };
  const review = [
    "# Full Vault Export",
    "",
    `Package: ${packageId}`,
    `Exported at: ${new Date().toISOString()}`,
    "",
    "## Contents",
    "",
    `- Domains: ${(vault.domains || []).length}`,
    `- Nodes: ${nodeCount}`,
    `- ExerciseSets: ${exerciseSetCount}`,
    `- Concept Maps: ${conceptMapCount}`,
    `- Non-contains relations: ${nonContainsEdgeCount}`,
    "",
    "This package is intended for sharing a full local-first knowledge vault with another Kinjito/AmazingWawa Knowledge Base user.",
    "Import appends ExerciseSet problems by id, upserts Concept Maps by id, and creates nodes/relations from the package patch.",
  ].join("\n");
  return {
    packageId,
    manifestRaw: YAML.stringify(manifest),
    sourcesRaw: YAML.stringify(sources),
    patchRaw: YAML.stringify(patch),
    reviewRaw: `${review}\n`,
  };
}

export async function exportVaultWawaPackage(vaultRootPath) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to export .wawapkg files.");
  if (!vaultRootPath) throw new Error("Configure an active vault before exporting a .wawapkg.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const payload = fullVaultPackagePayload(currentVault);
  return invoke("export_vault_wawapkg", {
    vaultRootPath,
    packageId: payload.packageId,
    manifestRaw: payload.manifestRaw,
    sourcesRaw: payload.sourcesRaw,
    patchRaw: payload.patchRaw,
    reviewRaw: payload.reviewRaw,
  });
}

export async function saveConceptMapLayout(vaultRootPath, mapId, layout) {
  if (!vaultRootPath) throw new Error("Configure an active vault before saving concept map layout.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(mapId || ""))) {
    throw new Error("Concept map id must be kebab-case.");
  }
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: `concept-maps/${mapId}.layout.yaml`,
    contents: YAML.stringify({ schemaVersion: 1, mapId, nodes: layout?.nodes || {} }),
  });
}

const EDITABLE_CONCEPT_NODE_FIELDS = [
  "title",
  "titleLocale",
  "kind",
  "formula",
  "summary",
  "layer",
  "ownerNodeId",
];
const EDITABLE_CONCEPT_RELATION_FIELDS = [
  "label",
  "labelLocale",
  "type",
  "direction",
  "from",
  "to",
  "condition",
  "formula",
  "explanation",
];

function editableFields(changes, allowedFields) {
  return Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(changes || {}, field))
      .map((field) => [field, typeof changes[field] === "string" ? changes[field].trim() : changes[field]]),
  );
}

function conceptMapDocument(vault, mapId) {
  const map = vault.conceptMaps?.byId?.[mapId];
  if (!map) throw new Error(`Concept map not found: ${mapId}`);
  const relativePath = String(map.filePath || `concept-maps/${mapId}.yaml`).replaceAll("\\", "/");
  if (!relativePath.startsWith("concept-maps/") || !/\.ya?ml$/i.test(relativePath) || /\.layout\.ya?ml$/i.test(relativePath)) {
    throw new Error(`Concept map source path is invalid: ${relativePath}`);
  }
  const raw = vault.conceptMaps?.rawFiles?.[relativePath];
  const document = raw ? YAML.parse(raw) : {
    schemaVersion: 1,
    id: map.id,
    title: map.title,
    titleLocale: map.titleLocale,
    domain: map.domain,
    ownerNodeId: map.ownerNodeId,
    summary: map.summary,
    layers: map.layers,
    relationTypes: map.relationTypes,
    nodes: map.nodes,
    relations: map.relations,
  };
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`Concept map YAML must contain an object: ${relativePath}`);
  }
  return { document, relativePath };
}

async function writeConceptMapDocument(vaultRootPath, relativePath, document) {
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath,
    contents: YAML.stringify(document),
  });
  return loadVaultFromPath(vaultRootPath);
}

export async function updateConceptMapElement(vaultRootPath, payload = {}) {
  if (!vaultRootPath) throw new Error("Configure an active vault before editing a concept map.");
  const vault = await loadVaultFromPath(vaultRootPath);
  const { document, relativePath } = conceptMapDocument(vault, payload.mapId);
  const isRelation = payload.kind === "relation";
  const collectionKey = isRelation
    ? (Array.isArray(document.relations) ? "relations" : "edges")
    : (Array.isArray(document.nodes) ? "nodes" : "concepts");
  const collection = Array.isArray(document[collectionKey]) ? [...document[collectionKey]] : [];
  const index = collection.findIndex((item) => item?.id === payload.id);
  if (index < 0) throw new Error(`${isRelation ? "Relation" : "Node"} not found in concept map: ${payload.id}`);
  const changes = editableFields(
    payload.changes,
    isRelation ? EDITABLE_CONCEPT_RELATION_FIELDS : EDITABLE_CONCEPT_NODE_FIELDS,
  );

  if (isRelation) {
    const nodeKey = Array.isArray(document.nodes) ? "nodes" : "concepts";
    const nodeIds = new Set((document[nodeKey] || []).map((node) => node?.id));
    const nextFrom = changes.from ?? collection[index].from ?? collection[index].source;
    const nextTo = changes.to ?? collection[index].to ?? collection[index].target;
    if (!nodeIds.has(nextFrom) || !nodeIds.has(nextTo)) {
      throw new Error("Concept map relation endpoints must reference existing concept-map nodes.");
    }
    changes.from = nextFrom;
    changes.to = nextTo;
    delete changes.source;
    delete changes.target;
  }

  collection[index] = { ...collection[index], ...changes };
  document[collectionKey] = collection;
  return writeConceptMapDocument(vaultRootPath, relativePath, document);
}

export async function deleteConceptMapElement(vaultRootPath, payload = {}) {
  if (!vaultRootPath) throw new Error("Configure an active vault before editing a concept map.");
  const vault = await loadVaultFromPath(vaultRootPath);
  const { document, relativePath } = conceptMapDocument(vault, payload.mapId);

  if (payload.kind === "relation") {
    const relationKey = Array.isArray(document.relations) ? "relations" : "edges";
    const relations = Array.isArray(document[relationKey]) ? document[relationKey] : [];
    if (!relations.some((relation) => relation?.id === payload.id)) {
      throw new Error(`Relation not found in concept map: ${payload.id}`);
    }
    document[relationKey] = relations.filter((relation) => relation?.id !== payload.id);
  } else {
    const nodeKey = Array.isArray(document.nodes) ? "nodes" : "concepts";
    const relationKey = Array.isArray(document.relations) ? "relations" : "edges";
    const nodes = Array.isArray(document[nodeKey]) ? document[nodeKey] : [];
    if (!nodes.some((node) => node?.id === payload.id)) {
      throw new Error(`Node not found in concept map: ${payload.id}`);
    }
    document[nodeKey] = nodes.filter((node) => node?.id !== payload.id);
    document[relationKey] = (document[relationKey] || []).filter((relation) => {
      const from = relation?.from ?? relation?.source;
      const to = relation?.to ?? relation?.target;
      return from !== payload.id && to !== payload.id;
    });
  }

  return writeConceptMapDocument(vaultRootPath, relativePath, document);
}

export async function openSnapshotFolder() {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to open the snapshot folder.");
  return invoke("open_snapshot_output_dir");
}

export async function captureSourceSnapshot(url) {
  if (!isTauri()) throw new Error("Desktop source snapshot capture requires the Tauri desktop app.");
  if (!url || !/^https?:\/\//i.test(String(url).trim())) {
    throw new Error("Snapshot URL must start with http:// or https://.");
  }
  return invoke("capture_source_snapshot", { url: String(url).trim() });
}

export async function readBinaryFileAsDataUrl(vaultRootPath, relativePath) {
  if (!isTauri()) throw new Error("Desktop filesystem access is required to read note assets.");
  if (!vaultRootPath || !relativePath) return "";
  const payload = await invoke("read_binary_file_base64", { vaultRootPath, relativePath });
  return `data:${payload.mimeType || "application/octet-stream"};base64,${payload.base64}`;
}

export async function inspectWawaPackage(vaultRootPath, packageFilePath) {
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const packageFiles = await readWawaPackageFile(packageFilePath);
  const validation = validateAiPackage(currentVault, packageFiles);
  const diff = diffAiPackage(currentVault, validation);
  const history = await readAiImportHistory(vaultRootPath, validation.previewModel.packageId);
  return { currentVault, packageFiles, validation, diff, history };
}

export async function applyWawaPackage(vaultRootPath, packageFilePath) {
  if (!vaultRootPath) throw new Error("Configure an active vault before applying packages.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const packageFiles = await readWawaPackageFile(packageFilePath);
  const history = await readAiImportHistory(vaultRootPath, packageFiles.packageId);
  if (history.applied) throw new Error(`Package already applied: ${packageFiles.packageId}`);
  const plan = buildAiPackageApplyPlan(currentVault, packageFiles);
  await invoke("apply_ai_import_plan", { vaultRootPath, plan });
  return loadVaultFromPath(vaultRootPath);
}

export function getNoteRelativePath(node) {
  return `content/${node.domain}/${node.id}/note.md`;
}

export function getHtmlNoteRelativePath(node) {
  return `content/${node.domain}/${node.id}/note.html`;
}

export function getExercisesRelativePath(node) {
  return `content/${node.domain}/${node.id}/exercises.yaml`;
}

export function getExerciseProgressRelativePath() {
  return ".kinjito/exercise-progress.yaml";
}

export async function writeExerciseSet(vaultRootPath, node, exerciseSet) {
  if (!vaultRootPath) throw new Error("Configure an active vault before saving exercises.");
  if (!node?.id || node.type === "domain") throw new Error("Exercises require a non-domain owner node.");
  const payload = {
    version: Number(exerciseSet?.version) || 1,
    nodeId: node.id,
    title: exerciseSet?.title || `${node.titleLocale || node.title || node.id} Exercises`,
    locale: exerciseSet?.locale || "zh-CN",
    summary: exerciseSet?.summary || "",
    scope: exerciseSet?.scope || { coverageNodeIds: [node.id], prerequisiteNodeIds: [], relatedNodeIds: [] },
    problems: Array.isArray(exerciseSet?.problems) ? exerciseSet.problems : [],
  };
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: getExercisesRelativePath(node),
    contents: YAML.stringify(payload),
  });
}

function modeFromLegacyProblem(problem = {}) {
  if (problem.type !== "conceptual") return "practice";
  const text = `${problem.title || ""}\n${problem.prompt || ""}`.toLowerCase();
  return /定义|公式|术语|名词|规则|是什么|definition|formula|term|rule/.test(text) ? "recall" : "practice";
}

function migrateLegacyExerciseSet(exerciseSet) {
  return {
    ...exerciseSet,
    problems: (exerciseSet?.problems || []).map((problem) => ({
      ...problem,
      mode: EXERCISE_MODES.includes(problem.mode) ? problem.mode : modeFromLegacyProblem(problem),
    })),
  };
}

function comparableProblem(problem) {
  return JSON.stringify({
    id: problem.id,
    mode: problem.mode,
    type: problem.type,
    difficulty: problem.difficulty,
    title: problem.title,
    prompt: problem.prompt,
    hints: problem.hints || [],
    answer: problem.answer,
    solution: problem.solution,
  });
}

function createExerciseNodeIdMismatchError(declaredNodeId, targetNodeId) {
  const error = new Error(`ExerciseSet nodeId "${declaredNodeId}" does not match target node "${targetNodeId}".`);
  error.code = "EXERCISE_NODE_ID_MISMATCH";
  error.declaredNodeId = declaredNodeId;
  error.targetNodeId = targetNodeId;
  return error;
}

export function normalizeImportedExerciseSet(raw, targetNode, options = {}) {
  let parsed;
  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ExerciseSet YAML: ${error.message}`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("ExerciseSet YAML must contain an object.");
  }
  const declaredNodeId = String(parsed.nodeId || "").trim();
  if (declaredNodeId && declaredNodeId !== targetNode.id && !options.allowNodeIdRewrite) {
    throw createExerciseNodeIdMismatchError(declaredNodeId, targetNode.id);
  }
  if (!Array.isArray(parsed.problems) || parsed.problems.length === 0) {
    throw new Error("ExerciseSet must contain at least one problem.");
  }
  const seen = new Set();
  const problems = parsed.problems.map((problem, index) => {
    if (!problem || Array.isArray(problem) || typeof problem !== "object") {
      throw new Error(`Problem at index ${index} must be an object.`);
    }
    const id = String(problem.id || "").trim();
    if (!id) throw new Error(`Problem at index ${index} is missing id.`);
    if (seen.has(id)) throw new Error(`Duplicate problem id "${id}".`);
    seen.add(id);
    const mode = String(problem.mode || "").trim();
    if (!mode) throw new Error(`Problem "${id}" is missing mode.`);
    if (!EXERCISE_MODES.includes(mode)) throw new Error(`Problem "${id}" has unsupported mode "${mode}".`);
    ["title", "prompt", "answer", "solution"].forEach((field) => {
      if (!String(problem[field] || "").trim()) throw new Error(`Problem "${id}" is missing ${field}.`);
    });
    const type = problem.type || "conceptual";
    const difficulty = problem.difficulty || "undergraduate";
    if (!EXERCISE_TYPES.includes(type)) throw new Error(`Problem "${id}" has unsupported type "${type}".`);
    if (!EXERCISE_DIFFICULTIES.includes(difficulty)) throw new Error(`Problem "${id}" has unsupported difficulty "${difficulty}".`);
    return {
      id,
      mode,
      type,
      difficulty,
      title: String(problem.title),
      prompt: String(problem.prompt),
      hints: Array.isArray(problem.hints) ? problem.hints.map((hint) => String(hint || "")).filter(Boolean) : [],
      answer: String(problem.answer),
      solution: String(problem.solution),
    };
  });
  const stringArray = (value, fallback = []) => Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : fallback;
  return {
    version: Number(parsed.version) || 1,
    nodeId: targetNode.id,
    title: String(parsed.title || `${targetNode.titleLocale || targetNode.title || targetNode.id} ExerciseSet`),
    locale: String(parsed.locale || "zh-CN"),
    summary: String(parsed.summary || ""),
    scope: {
      coverageNodeIds: stringArray(parsed.scope?.coverageNodeIds, [targetNode.id]),
      prerequisiteNodeIds: stringArray(parsed.scope?.prerequisiteNodeIds),
      relatedNodeIds: stringArray(parsed.scope?.relatedNodeIds),
    },
    problems,
  };
}

async function assertExerciseSetMissing(vaultRootPath, relativePath) {
  try {
    await invoke("read_text_file", { vaultRootPath, relativePath });
  } catch (error) {
    const message = String(error?.message || error);
    if (/os error 2|cannot find the (?:file|path)|no such file or directory/i.test(message)) return;
    throw error;
  }
  throw new Error("This node gained an ExerciseSet before import completed. Re-run Import ExerciseSet to append into it.");
}

export async function importExerciseSetForNode(vaultRootPath, node, options = {}) {
  if (!vaultRootPath) throw new Error("Configure an active vault before importing ExerciseSet.");
  if (!node?.id || node.type === "domain") throw new Error("ExerciseSet requires a non-domain owner node.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const relativePath = getExercisesRelativePath(node);
  const filePath = await chooseExerciseSetFile();
  if (!filePath) return null;
  const rawExerciseSet = await readExternalTextFile(filePath);
  let incomingExerciseSet;
  let rewrittenNodeId = null;
  try {
    incomingExerciseSet = normalizeImportedExerciseSet(rawExerciseSet, node);
  } catch (error) {
    if (error?.code !== "EXERCISE_NODE_ID_MISMATCH") throw error;
    if (typeof options.confirmNodeIdRewrite !== "function") throw error;
    const shouldRewrite = await options.confirmNodeIdRewrite?.({
      declaredNodeId: error.declaredNodeId,
      targetNodeId: error.targetNodeId,
      targetNode: node,
      filePath,
    });
    if (!shouldRewrite) return null;
    incomingExerciseSet = normalizeImportedExerciseSet(rawExerciseSet, node, { allowNodeIdRewrite: true });
    rewrittenNodeId = { from: error.declaredNodeId, to: error.targetNodeId };
  }
  await invoke("create_dir_all", { vaultRootPath, relativePath: `content/${node.domain}/${node.id}` });
  const existingExerciseSet = currentVault.exercises?.byNodeId?.[node.id];
  if (!existingExerciseSet) {
    await assertExerciseSetMissing(vaultRootPath, relativePath);
    await writeExerciseSet(vaultRootPath, node, incomingExerciseSet);
    return { vault: await loadVaultFromPath(vaultRootPath), summary: { appended: incomingExerciseSet.problems.length, skipped: 0, conflicts: [], rewrittenNodeId } };
  }

  const migratedExisting = migrateLegacyExerciseSet(existingExerciseSet);
  const existingById = Object.fromEntries(migratedExisting.problems.map((problem) => [problem.id, problem]));
  const conflicts = [];
  const appended = [];
  let skipped = 0;
  incomingExerciseSet.problems.forEach((problem) => {
    const existing = existingById[problem.id];
    if (!existing) {
      appended.push(problem);
      return;
    }
    if (comparableProblem(existing) === comparableProblem(problem)) {
      skipped += 1;
      return;
    }
    conflicts.push(problem.id);
  });
  if (conflicts.length) {
    throw new Error(`ExerciseSet import conflicts with existing problem ids: ${conflicts.join(", ")}`);
  }
  await writeExerciseSet(vaultRootPath, node, {
    ...migratedExisting,
    problems: [...migratedExisting.problems, ...appended],
  });
  return { vault: await loadVaultFromPath(vaultRootPath), summary: { appended: appended.length, skipped, conflicts, rewrittenNodeId } };
}

export async function deleteExerciseSetFromNode(vaultRootPath, node) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting ExerciseSet.");
  if (!node?.id || node.type === "domain") throw new Error("ExerciseSet requires a non-domain owner node.");
  await invoke("remove_file", { vaultRootPath, relativePath: getExercisesRelativePath(node) });
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const prefix = `${node.id}/`;
  const problems = Object.fromEntries(
    Object.entries(currentVault.exerciseProgress?.problems || {}).filter(([key]) => !key.startsWith(prefix)),
  );
  return writeExerciseProgress(vaultRootPath, { version: 2, problems }, { mergeExisting: false });
}

export async function deleteExerciseProblemFromNode(vaultRootPath, node, problemId) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting an exercise problem.");
  if (!node?.id || node.type === "domain") throw new Error("Exercise problems require a non-domain owner node.");
  const normalizedProblemId = String(problemId || "").trim();
  if (!normalizedProblemId) throw new Error("Exercise problem id is required.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const exerciseSet = currentVault.exercises?.byNodeId?.[node.id];
  if (!exerciseSet) throw new Error("This node does not have an ExerciseSet.");
  if (!exerciseSet.problems.some((problem) => problem.id === normalizedProblemId)) {
    throw new Error(`Exercise problem "${normalizedProblemId}" was not found.`);
  }
  if (exerciseSet.problems.length <= 1) {
    throw new Error("The final problem cannot be deleted individually. Delete the ExerciseSet instead.");
  }

  await writeExerciseSet(vaultRootPath, node, {
    ...exerciseSet,
    problems: exerciseSet.problems.filter((problem) => problem.id !== normalizedProblemId),
  });
  const progressKey = `${node.id}/${normalizedProblemId}`;
  const problems = Object.fromEntries(
    Object.entries(currentVault.exerciseProgress?.problems || {}).filter(([key]) => key !== progressKey),
  );
  return writeExerciseProgress(vaultRootPath, { version: 2, problems }, { mergeExisting: false });
}

export async function replaceExerciseProblemSolution(vaultRootPath, node, problemId, solution) {
  if (!vaultRootPath) throw new Error("Configure an active vault before replacing an exercise solution.");
  if (!node?.id || node.type === "domain") throw new Error("Exercise problems require a non-domain owner node.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const exerciseSet = currentVault.exercises?.byNodeId?.[node.id];
  if (!exerciseSet) throw new Error("This node does not have an ExerciseSet.");

  await writeExerciseSet(
    vaultRootPath,
    node,
    updateExerciseProblemSolution(exerciseSet, problemId, solution),
  );
  return loadVaultFromPath(vaultRootPath);
}

export async function writeExerciseProgress(vaultRootPath, progress, options = {}) {
  if (!vaultRootPath) throw new Error("Configure an active vault before saving exercise progress.");
  const mergeExisting = options.mergeExisting !== false;
  let problems = progress?.problems || {};
  if (mergeExisting) {
    const currentVault = await loadVaultFromPath(vaultRootPath);
    problems = {
      ...(currentVault.exerciseProgress?.problems || {}),
      ...problems,
    };
  }
  await invoke("create_dir_all", { vaultRootPath, relativePath: ".kinjito" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: getExerciseProgressRelativePath(),
    contents: YAML.stringify({ version: 2, problems }),
  });
  return loadVaultFromPath(vaultRootPath);
}

export async function writeWrongPracticeExport(vaultRootPath, yamlContent, markdownContent, timestamp) {
  if (!vaultRootPath) throw new Error("Configure an active vault before exporting wrong practice.");
  const safeTimestamp = String(timestamp || new Date().toISOString())
    .replace(/[-:]/g, "")
    .replace(/[TZ.]/g, "")
    .slice(0, 13);
  const dir = ".kb-ai/wrong-practice";
  const baseName = `wrong-practice-${safeTimestamp}`;
  await invoke("create_dir_all", { vaultRootPath, relativePath: dir });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: `${dir}/${baseName}.yaml`,
    contents: yamlContent,
  });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: `${dir}/${baseName}.md`,
    contents: markdownContent,
  });
  return {
    yamlPath: `${dir}/${baseName}.yaml`,
    markdownPath: `${dir}/${baseName}.md`,
  };
}

export function getNoteAbsolutePath(vaultRootPath, node) {
  return `${vaultRootPath.replace(/[\\/]+$/, "")}/${getNoteRelativePath(node)}`;
}

export async function writeNoteMarkdown(vaultRootPath, node, markdown) {
  if (!vaultRootPath) throw new Error("Cannot save note.md because no desktop vault folder is active.");
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
    titleLocale: payload.titleLocale || "",
    domain: payload.domain,
    type: payload.type,
    status: payload.status,
    summary: payload.summary || "",
    summaryLocale: payload.summaryLocale || "",
    contentFormat: payload.contentFormat || "none",
    createdAt: date,
    updatedAt: date,
    tags: [payload.domain],
    prerequisites: [],
    related: [],
  });
}

function nodeHasNote(vault, nodeId) {
  const note = vault.notes?.[nodeId];
  return Boolean(note?.markdown || note?.html);
}

function getNodeMetaRelativePath(node) {
  return `content/${node.domain}/${node.id}/meta.yaml`;
}

function nodeContentRoot(node) {
  return `content/${node.domain}/${node.id}`;
}

function noteRootRelativePath(vaultRelativePath, node) {
  const root = `${nodeContentRoot(node)}/`;
  return String(vaultRelativePath || "").startsWith(root)
    ? String(vaultRelativePath).slice(root.length)
    : String(vaultRelativePath || "");
}

function splitUrlSuffix(value = "") {
  const raw = String(value || "");
  const match = raw.match(/^([^?#]*)([?#].*)?$/);
  return {
    path: match?.[1] || "",
    suffix: match?.[2] || "",
  };
}

function isExternalOrSpecialUrl(value = "") {
  return /^(https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(String(value).trim()) ||
    /^\/\//.test(String(value).trim());
}

function normalizeImportedRelativePath(value = "") {
  const { path, suffix } = splitUrlSuffix(value);
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("assets/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) return "";
  return `assets/imported-html/${normalized}${suffix}`;
}

function rewriteImportedHtmlAssetUrls(html = "") {
  const parser = new DOMParser();
  const document = parser.parseFromString(String(html || ""), "text/html");
  const attrNames = ["src", "href", "poster"];
  document.querySelectorAll(attrNames.map((name) => `[${name}]`).join(",")).forEach((element) => {
    attrNames.forEach((attrName) => {
      if (!element.hasAttribute(attrName)) return;
      const raw = element.getAttribute(attrName) || "";
      if (isExternalOrSpecialUrl(raw)) return;
      const rewritten = normalizeImportedRelativePath(raw);
      if (rewritten) element.setAttribute(attrName, rewritten);
    });
  });
  document.querySelectorAll("[style]").forEach((element) => {
    element.setAttribute("style", rewriteImportedCssUrls(element.getAttribute("style") || "", "assets/imported-html/"));
  });
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function dirname(path = "") {
  const normalized = String(path || "").replaceAll("\\", "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index + 1) : "";
}

function normalizePathParts(path = "") {
  const output = [];
  String(path || "").replaceAll("\\", "/").split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") output.pop();
    else output.push(part);
  });
  return output.join("/");
}

function rewriteImportedCssUrls(css = "", cssBaseDir = "assets/imported-html/") {
  return String(css || "").replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, rawUrl) => {
    const raw = String(rawUrl || "").trim();
    if (!raw || isExternalOrSpecialUrl(raw)) return match;
    const { path, suffix } = splitUrlSuffix(raw);
    if (!path || path.startsWith("assets/") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return match;
    const normalized = normalizePathParts(`${cssBaseDir}${path}`);
    if (!normalized || !normalized.startsWith("assets/imported-html/")) return match;
    const nextUrl = `${normalized}${suffix}`;
    const nextQuote = quote || '"';
    return `url(${nextQuote}${nextUrl}${nextQuote})`;
  });
}

async function rewriteImportedCssFiles(vaultRootPath, node, copiedAssetRelativePaths = []) {
  const cssPaths = copiedAssetRelativePaths.filter((path) => /\.css$/i.test(path));
  await Promise.all(cssPaths.map(async (relativePath) => {
    const css = await readOptionalTextFile(vaultRootPath, relativePath);
    if (!css) return;
    const noteRelative = noteRootRelativePath(relativePath, node);
    const rewritten = rewriteImportedCssUrls(css, dirname(noteRelative));
    if (rewritten !== css) {
      await invoke("write_text_file", { vaultRootPath, relativePath, contents: rewritten });
    }
  }));
}

function parseYamlObject(raw, fallback = {}) {
  return YAML.parse(raw || "") || fallback;
}

function pickEditableFields(payload, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => Object.prototype.hasOwnProperty.call(payload || {}, field))
      .map((field) => [field, payload[field]]),
  );
}

function buildDomainsYamlWithDomain(domainsYaml, payload) {
  const parsed = parseYamlObject(domainsYaml, {});
  const domains = Array.isArray(parsed.domains) ? parsed.domains : [];
  if (domains.some((domain) => domain.id === payload.id)) throw new Error(`Domain "${payload.id}" already exists.`);
  return YAML.stringify({
    ...parsed,
    domains: [
      ...domains,
      {
        id: payload.id,
        title: payload.title,
        titleLocale: payload.titleLocale || "",
        description: payload.description || "",
        descriptionLocale: payload.descriptionLocale || "",
        color: payload.color || "#EDEDED",
        order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 999,
      },
    ],
  });
}

function buildDomainsYamlWithUpdatedDomain(domainsYaml, domainId, payload) {
  const parsed = parseYamlObject(domainsYaml, {});
  const domains = Array.isArray(parsed.domains) ? parsed.domains : [];
  const index = domains.findIndex((domain) => domain.id === domainId);
  if (index < 0) throw new Error(`Domain "${domainId}" does not exist.`);
  const nextDomains = [...domains];
  nextDomains[index] = {
    ...nextDomains[index],
    ...pickEditableFields(payload, EDITABLE_DOMAIN_FIELDS),
    id: domainId,
    order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : nextDomains[index].order,
  };
  return YAML.stringify({ ...parsed, domains: nextDomains });
}

function buildDomainsYamlWithoutDomain(domainsYaml, domainId) {
  const parsed = parseYamlObject(domainsYaml, {});
  const domains = Array.isArray(parsed.domains) ? parsed.domains : [];
  return YAML.stringify({ ...parsed, domains: domains.filter((domain) => domain.id !== domainId) });
}

function buildGraphYamlWithEdge(graphYaml, edge) {
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  if (edges.some((item) => item.id === edge.id)) throw new Error(`Edge "${edge.id}" already exists.`);
  if (edges.some((item) => (item.from || item.source) === edge.from && (item.to || item.target) === edge.to && item.relation === edge.relation)) {
    throw new Error(`Duplicate ${edge.from}/${edge.to}/${edge.relation} edge.`);
  }
  return YAML.stringify({ ...graph, schemaVersion: graph.schemaVersion || 1, edges: [...edges, edge] });
}

function getEdgeEndpoint(edge, key) {
  return edge[key] || edge[key === "from" ? "source" : "target"];
}

function validateGraphLinkPayload(edges, payload, nodeIds, { excludeEdgeId = "" } = {}) {
  const sourceId = payload.sourceId;
  const targetId = payload.targetId;
  const relation = payload.relation;
  const edgeId = `${sourceId}-${relation}-${targetId}`;

  if (!nodeIds.has(sourceId)) throw new Error(`Source "${sourceId}" does not exist.`);
  if (!nodeIds.has(targetId)) throw new Error(`Target "${targetId}" does not exist.`);
  if (sourceId === targetId) throw new Error("Source and target must be different.");
  if (!LINK_RELATIONS.has(relation)) throw new Error("Relations support depends-on, used-in, and compares-with only.");
  if (edges.some((edge) => edge.id === edgeId && edge.id !== excludeEdgeId)) throw new Error(`Edge "${edgeId}" already exists.`);
  if (
    edges.some(
      (edge) =>
        edge.id !== excludeEdgeId &&
        getEdgeEndpoint(edge, "from") === sourceId &&
        getEdgeEndpoint(edge, "to") === targetId &&
        edge.relation === relation,
    )
  ) {
    throw new Error(`Duplicate ${sourceId}/${targetId}/${relation} edge.`);
  }
  if (
    relation === "compares-with" &&
    edges.some(
      (edge) =>
        edge.id !== excludeEdgeId &&
        getEdgeEndpoint(edge, "from") === targetId &&
        getEdgeEndpoint(edge, "to") === sourceId &&
        edge.relation === relation,
    )
  ) {
    throw new Error(`Duplicate reverse compares-with edge for ${sourceId}/${targetId}.`);
  }

  return { edgeId, sourceId, targetId, relation };
}

function buildGraphYamlWithLink(graphYaml, payload, nodeIds) {
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const { edgeId, sourceId, targetId, relation } = validateGraphLinkPayload(edges, payload, nodeIds);
  return YAML.stringify({
    ...graph,
    schemaVersion: graph.schemaVersion || 1,
    edges: [...edges, { id: edgeId, from: sourceId, to: targetId, relation }],
  });
}

function buildGraphYamlWithoutLink(graphYaml, edgeId) {
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const edge = edges.find((item) => item.id === edgeId);
  if (!edge) throw new Error(`Edge "${edgeId}" does not exist.`);
  if (!LINK_RELATIONS.has(edge.relation)) throw new Error("Only non-contains relations can be deleted here.");
  return YAML.stringify({ ...graph, schemaVersion: graph.schemaVersion || 1, edges: edges.filter((item) => item.id !== edgeId) });
}

function buildGraphYamlWithReplacedLink(graphYaml, oldEdgeId, payload, nodeIds) {
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const edgeIndex = edges.findIndex((edge) => edge.id === oldEdgeId);
  if (edgeIndex < 0) throw new Error(`Edge "${oldEdgeId}" does not exist.`);
  const oldEdge = edges[edgeIndex];
  if (!LINK_RELATIONS.has(oldEdge.relation)) throw new Error("Only non-contains relations can be edited here.");
  const { edgeId, sourceId, targetId, relation } = validateGraphLinkPayload(edges, payload, nodeIds, { excludeEdgeId: oldEdgeId });
  const nextEdges = [...edges];
  nextEdges[edgeIndex] = { id: edgeId, from: sourceId, to: targetId, relation };
  return YAML.stringify({ ...graph, schemaVersion: graph.schemaVersion || 1, edges: nextEdges });
}

export async function createDomain(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before creating domains.");
  if (!payload.title?.trim()) throw new Error("Title is required.");
  if (!payload.id?.trim()) throw new Error("ID is required.");
  if (!assertKebabId(payload.id)) throw new Error("ID must be lowercase kebab-case.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  if (currentVault.domains.some((domain) => domain.id === payload.id)) throw new Error(`Domain "${payload.id}" already exists.`);

  const domainsYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "domains.yaml" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "domains.yaml",
    contents: buildDomainsYamlWithDomain(domainsYaml, payload),
  });
  await invoke("create_dir_all", { vaultRootPath, relativePath: `content/${payload.id}` });
  return loadVaultFromPath(vaultRootPath);
}

export async function createKnowledgeNode(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before creating notes.");
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
    throw new Error("Parent must belong to the selected domain. Use Add Link for cross-domain relationships.");
  }
  if (parentNode.type !== "domain" && parentNode.domain !== payload.domain) {
    throw new Error("Parent must belong to the selected domain. Use Add Link for cross-domain relationships.");
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
    contents: buildMetaYaml({ ...payload, contentFormat: "none" }),
  });
  await invoke("write_text_file", { vaultRootPath, relativePath: "graph.yaml", contents: updatedGraphYaml });
  return { vault: await loadVaultFromPath(vaultRootPath), newNodeId: payload.id };
}

export async function createKnowledgeItem(vaultRootPath, payload) {
  return createKnowledgeNode(vaultRootPath, payload);
}

export async function addNoteToNode(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before creating notes.");
  if (!payload?.nodeId) throw new Error("Target node is required.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const node = currentVault.nodes.find((item) => item.id === payload.nodeId && item.type !== "domain");
  if (!node) throw new Error(`Node "${payload.nodeId}" does not exist.`);
  if (nodeHasNote(currentVault, node.id)) throw new Error("This node already has a note.");

  const notePath = getNoteRelativePath(node);
  const htmlPath = getHtmlNoteRelativePath(node);
  if (currentVault.notes[node.id]?.markdown || currentVault.notes[node.id]?.html) throw new Error("This node already has a note.");
  try {
    await invoke("read_text_file", { vaultRootPath, relativePath: notePath });
    throw new Error("This node already has a note.");
  } catch (error) {
    if (String(error?.message || error) === "This node already has a note.") throw error;
  }
  try {
    await invoke("read_text_file", { vaultRootPath, relativePath: htmlPath });
    throw new Error("This node already has a note.");
  } catch (error) {
    if (String(error?.message || error) === "This node already has a note.") throw error;
  }

  const markdown = payload.markdown || `# ${payload.initialTitle || node.titleLocale || node.title || node.id}\n\n`;
  const metaPath = getNodeMetaRelativePath(node);
  const meta = parseYamlObject(await invoke("read_text_file", { vaultRootPath, relativePath: metaPath }), {});
  const nextMeta = {
    ...meta,
    contentFormat: "markdown",
    updatedAt: todayLocalDate(),
  };
  await invoke("write_text_file", { vaultRootPath, relativePath: notePath, contents: markdown });
  await invoke("write_text_file", { vaultRootPath, relativePath: metaPath, contents: YAML.stringify(nextMeta) });
  return { vault: await loadVaultFromPath(vaultRootPath), nodeId: node.id };
}

export async function importHtmlNoteToNode(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before importing HTML notes.");
  if (!payload?.nodeId) throw new Error("Target node is required.");
  if (!payload?.sourcePath) throw new Error("Choose an HTML file or folder first.");
  if (!["file", "folder"].includes(payload.sourceKind)) throw new Error("HTML import sourceKind must be file or folder.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const node = currentVault.nodes.find((item) => item.id === payload.nodeId && item.type !== "domain");
  if (!node) throw new Error(`Node "${payload.nodeId}" does not exist.`);
  if (nodeHasNote(currentVault, node.id)) throw new Error("This node already has a note.");

  const result = await invoke("import_html_note_files", {
    vaultRootPath,
    nodeDomain: node.domain,
    nodeId: node.id,
    sourcePath: payload.sourcePath,
    sourceKind: payload.sourceKind,
  });

  const html = await readOptionalTextFile(vaultRootPath, result.noteRelativePath);
  const rewrittenHtml = payload.sourceKind === "folder" ? rewriteImportedHtmlAssetUrls(html) : html;
  if (rewrittenHtml && rewrittenHtml !== html) {
    await invoke("write_text_file", {
      vaultRootPath,
      relativePath: result.noteRelativePath,
      contents: rewrittenHtml,
    });
  }
  if (payload.sourceKind === "folder") {
    await rewriteImportedCssFiles(vaultRootPath, node, result.copiedAssetRelativePaths || []);
  }

  const metaPath = getNodeMetaRelativePath(node);
  const meta = parseYamlObject(await invoke("read_text_file", { vaultRootPath, relativePath: metaPath }), {});
  const nextMeta = {
    ...meta,
    contentFormat: "html",
    updatedAt: todayLocalDate(),
  };
  await invoke("write_text_file", { vaultRootPath, relativePath: metaPath, contents: YAML.stringify(nextMeta) });
  return { vault: await loadVaultFromPath(vaultRootPath), nodeId: node.id };
}

export async function deleteNoteFromNode(vaultRootPath, nodeId) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting notes.");
  if (!nodeId) throw new Error("Target node is required.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const node = currentVault.nodes.find((item) => item.id === nodeId && item.type !== "domain");
  if (!node) throw new Error(`Node "${nodeId}" does not exist.`);
  if (!nodeHasNote(currentVault, node.id)) throw new Error("This node does not have a note.");

  await invoke("remove_node_note_files", {
    vaultRootPath,
    nodeDomain: node.domain,
    nodeId: node.id,
  });

  const metaPath = getNodeMetaRelativePath(node);
  const meta = parseYamlObject(await invoke("read_text_file", { vaultRootPath, relativePath: metaPath }), {});
  const nextMeta = {
    ...meta,
    contentFormat: "none",
    updatedAt: todayLocalDate(),
  };
  await invoke("write_text_file", { vaultRootPath, relativePath: metaPath, contents: YAML.stringify(nextMeta) });
  return { vault: await loadVaultFromPath(vaultRootPath), nodeId: node.id };
}

export async function updateDomain(vaultRootPath, domainId, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before editing domains.");
  if (!domainId) throw new Error("Domain ID is required.");
  const domainsYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "domains.yaml" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "domains.yaml",
    contents: buildDomainsYamlWithUpdatedDomain(domainsYaml, domainId, payload),
  });
  return loadVaultFromPath(vaultRootPath);
}

export async function updateKnowledgeNodeMeta(vaultRootPath, nodeId, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before editing nodes.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const node = currentVault.nodes.find((item) => item.id === nodeId && item.type !== "domain");
  if (!node) throw new Error(`Node "${nodeId}" does not exist.`);
  const metaPath = getNodeMetaRelativePath(node);
  const meta = parseYamlObject(await invoke("read_text_file", { vaultRootPath, relativePath: metaPath }), {});
  const nextMeta = {
    ...meta,
    ...pickEditableFields(payload, EDITABLE_NODE_FIELDS),
    id: node.id,
    domain: node.domain,
    contentFormat: meta.contentFormat || meta.content_format || node.contentFormat || "none",
    updatedAt: todayLocalDate(),
  };
  await invoke("write_text_file", { vaultRootPath, relativePath: metaPath, contents: YAML.stringify(nextMeta) });
  return loadVaultFromPath(vaultRootPath);
}

function buildGraphYamlWithoutNode(graphYaml, nodeId) {
  const graph = parseYamlObject(graphYaml, {});
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  return YAML.stringify({ ...graph, schemaVersion: graph.schemaVersion || 1, edges: edges.filter((edge) => getEdgeEndpoint(edge, "from") !== nodeId && getEdgeEndpoint(edge, "to") !== nodeId) });
}

function buildLayoutYamlWithoutNode(layoutYaml, nodeId) {
  const layout = parseYamlObject(layoutYaml, {});
  const boards = Object.fromEntries(
    Object.entries(layout.boards || {}).filter(([scopeId]) => scopeId !== nodeId).map(([scopeId, board]) => {
      const nodes = { ...(board?.nodes || {}) };
      delete nodes[nodeId];
      const routes = Object.fromEntries(
        Object.entries(board?.routes || {}).filter(([routeId, route]) => {
          const edgeRef = String(route?.edge || routeId);
          return !edgeRef.includes(nodeId);
        }),
      );
      return [scopeId, { ...board, nodes, routes }];
    }),
  );
  return YAML.stringify({ ...layout, schemaVersion: layout.schemaVersion || 1, boards });
}

function buildVaultYamlAfterDomainDelete(vaultYaml, domainId, remainingDomains) {
  const vault = parseYamlObject(vaultYaml, {});
  if (vault.defaultDomain !== domainId) return vaultYaml;
  return YAML.stringify({ ...vault, defaultDomain: remainingDomains[0]?.id || "" });
}

export async function deleteKnowledgeNode(vaultRootPath, nodeId) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting nodes.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const node = currentVault.nodes.find((item) => item.id === nodeId && item.type !== "domain");
  if (!node) throw new Error(`Node "${nodeId}" does not exist.`);
  const hasChild = currentVault.edges.some((edge) => edge.relation === "contains" && edge.source === nodeId);
  if (hasChild) throw new Error("This node has child nodes. Delete or move them first.");

  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  const layoutYaml = await readOptionalTextFile(vaultRootPath, "graph-layout.yaml");
  await invoke("write_text_file", { vaultRootPath, relativePath: "graph.yaml", contents: buildGraphYamlWithoutNode(graphYaml, nodeId) });
  if (layoutYaml) {
    await invoke("write_text_file", { vaultRootPath, relativePath: "graph-layout.yaml", contents: buildLayoutYamlWithoutNode(layoutYaml, nodeId) });
  }
  await invoke("remove_vault_path", { vaultRootPath, relativePath: `content/${node.domain}/${node.id}` });
  return loadVaultFromPath(vaultRootPath);
}

export async function deleteDomain(vaultRootPath, domainId) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting domains.");
  const currentVault = await loadVaultFromPath(vaultRootPath);
  const domain = currentVault.domains.find((item) => item.id === domainId);
  if (!domain) throw new Error(`Domain "${domainId}" does not exist.`);
  const hasChildNodes = currentVault.nodes.some((node) => node.type !== "domain" && node.domain === domainId);
  if (hasChildNodes) throw new Error("This domain still has child nodes. Delete or move them first.");

  const domainsYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "domains.yaml" });
  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  const layoutYaml = await readOptionalTextFile(vaultRootPath, "graph-layout.yaml");
  const vaultYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "vault.yaml" });
  const remainingDomains = currentVault.domains.filter((item) => item.id !== domainId);

  await invoke("write_text_file", { vaultRootPath, relativePath: "domains.yaml", contents: buildDomainsYamlWithoutDomain(domainsYaml, domainId) });
  await invoke("write_text_file", { vaultRootPath, relativePath: "vault.yaml", contents: buildVaultYamlAfterDomainDelete(vaultYaml, domainId, remainingDomains) });
  await invoke("write_text_file", { vaultRootPath, relativePath: "graph.yaml", contents: buildGraphYamlWithoutNode(graphYaml, domainId) });
  if (layoutYaml) {
    await invoke("write_text_file", { vaultRootPath, relativePath: "graph-layout.yaml", contents: buildLayoutYamlWithoutNode(layoutYaml, domainId) });
  }
  await invoke("remove_vault_path", { vaultRootPath, relativePath: `content/${domainId}` });
  return loadVaultFromPath(vaultRootPath);
}

export async function createGraphLink(vaultRootPath, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before creating links.");
  if (!payload?.sourceId) throw new Error("Source node is required.");
  if (!payload?.targetId) throw new Error("Target node is required.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const nodeIds = new Set(currentVault.nodes.map((node) => node.id));
  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "graph.yaml",
    contents: buildGraphYamlWithLink(graphYaml, payload, nodeIds),
  });
  return loadVaultFromPath(vaultRootPath);
}

export async function removeGraphLink(vaultRootPath, edgeId) {
  if (!vaultRootPath) throw new Error("Configure an active vault before deleting links.");
  if (!edgeId) throw new Error("Edge ID is required.");
  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "graph.yaml",
    contents: buildGraphYamlWithoutLink(graphYaml, edgeId),
  });
  return loadVaultFromPath(vaultRootPath);
}

export async function replaceGraphLink(vaultRootPath, oldEdgeId, payload) {
  if (!vaultRootPath) throw new Error("Configure an active vault before editing links.");
  if (!oldEdgeId) throw new Error("Existing edge ID is required.");
  if (!payload?.sourceId) throw new Error("Source node is required.");
  if (!payload?.targetId) throw new Error("Target node is required.");

  const currentVault = await loadVaultFromPath(vaultRootPath);
  const nodeIds = new Set(currentVault.nodes.map((node) => node.id));
  const graphYaml = await invoke("read_text_file", { vaultRootPath, relativePath: "graph.yaml" });
  await invoke("write_text_file", {
    vaultRootPath,
    relativePath: "graph.yaml",
    contents: buildGraphYamlWithReplacedLink(graphYaml, oldEdgeId, payload, nodeIds),
  });
  return loadVaultFromPath(vaultRootPath);
}

function serializeStageForYaml(stage) {
  return {
    id: stage.id,
    order: Number.isFinite(Number(stage.order)) ? Number(stage.order) : 999,
    title: stage.title || "",
    comment: stage.comment || "",
    x: stage.x,
    y: stage.y,
    w: stage.width ?? stage.w,
    h: stage.height ?? stage.h,
    flow: stage.flow || "free",
  };
}

function serializeBoardForYaml(board, preservedRoutes = {}) {
  const nodes = Object.fromEntries(
    Object.entries(board.nodes || {}).map(([nodeId, box]) => [
      nodeId,
      { x: box.x, y: box.y, w: box.width ?? box.w, h: box.height ?? box.h },
    ]),
  );
  return {
    width: board.width || 2400,
    height: board.height || 1600,
    grid: board.grid || 32,
    nodes,
    ...(Object.keys(preservedRoutes).length ? { routes: preservedRoutes } : {}),
    ...(Array.isArray(board.stages) && board.stages.length
      ? { stages: board.stages.map(serializeStageForYaml) }
      : {}),
  };
}

function getPreservedManualRoutes(existingBoard, graphYaml, movedNodeIds = []) {
  const existingRoutes = existingBoard.routes || {};
  const moved = new Set(movedNodeIds);
  if (!Object.keys(existingRoutes).length) return {};
  if (!moved.size) return existingRoutes;
  if (!graphYaml) return {};
  const graph = YAML.parse(graphYaml) || {};
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  return Object.fromEntries(
    Object.entries(existingRoutes).filter(([edgeId]) => {
      const edge = edgeById.get(edgeId);
      if (!edge) return false;
      return !moved.has(getEdgeEndpoint(edge, "from")) && !moved.has(getEdgeEndpoint(edge, "to"));
    }),
  );
}

export async function saveGraphLayoutBoard(vaultRootPath, scopeId, board, options = {}) {
  if (!vaultRootPath) throw new Error("Configure an active vault before saving layout.");
  if (!scopeId) throw new Error("Cannot save layout without a scope id.");
  if (!board?.nodes) throw new Error("Cannot save an empty layout board.");

  const existingRaw = await readOptionalTextFile(vaultRootPath, "graph-layout.yaml");
  const existing = existingRaw ? YAML.parse(existingRaw) || {} : {};
  const boards = existing.boards || {};
  const graphYaml = await readOptionalTextFile(vaultRootPath, "graph.yaml");
  const preservedRoutes = getPreservedManualRoutes(boards[scopeId] || {}, graphYaml, options.movedNodeIds || []);
  const nextBoards = {
    ...boards,
    [scopeId]: serializeBoardForYaml(board, preservedRoutes),
  };
  const serialized = YAML.stringify({ ...existing, schemaVersion: existing.schemaVersion || 1, boards: nextBoards });
  await invoke("write_text_file", { vaultRootPath, relativePath: "graph-layout.yaml", contents: serialized });
  return loadVaultFromPath(vaultRootPath);
}
