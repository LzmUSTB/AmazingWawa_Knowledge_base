import fs from "node:fs";
import path from "node:path";
import { normalizeVault } from "../src/index.js";

function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function walkNamedFiles(root, relativeRoot, targetName) {
  const output = {};
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return output;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === targetName) {
        output[path.relative(root, fullPath).replaceAll("\\", "/")] = readText(fullPath);
      }
    }
  }

  walk(absoluteRoot);
  return output;
}

function readBlockTypeFiles(root) {
  const output = {};
  const blockRoot = path.join(root, "block-types");
  if (!fs.existsSync(blockRoot)) return output;
  for (const entry of fs.readdirSync(blockRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
    const fullPath = path.join(blockRoot, entry.name);
    output[path.relative(root, fullPath).replaceAll("\\", "/")] = readText(fullPath);
  }
  return output;
}

export function readVaultForCli(vaultRoot) {
  const resolvedVaultRoot = path.resolve(vaultRoot);
  return normalizeVault({
    vaultYaml: readText(path.join(resolvedVaultRoot, "vault.yaml")),
    domainsYaml: readText(path.join(resolvedVaultRoot, "domains.yaml")),
    graphYaml: readText(path.join(resolvedVaultRoot, "graph.yaml")),
    graphLayoutYaml: readText(path.join(resolvedVaultRoot, "graph-layout.yaml")),
    metaFiles: walkNamedFiles(resolvedVaultRoot, "content", "meta.yaml"),
    noteFiles: walkNamedFiles(resolvedVaultRoot, "content", "note.md"),
    blockTypeFiles: readBlockTypeFiles(resolvedVaultRoot),
  });
}
