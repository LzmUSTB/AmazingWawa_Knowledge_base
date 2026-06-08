import { invoke, isTauri } from "@tauri-apps/api/core";
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
