#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

function usage() {
  console.error("Usage: npm run kb:reset-fixture-vault -- ./sample-vault --yes [--empty-domains]");
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to operate outside fixture vault root: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function isAllowedFixturePath(vaultRoot) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const relative = path.relative(repoRoot, vaultRoot).replaceAll(path.sep, "/");
  return relative === "sample-vault"
    || relative === "test-vault"
    || relative.startsWith("fixtures/");
}

function hasGitRemote(vaultRoot) {
  if (!fs.existsSync(path.join(vaultRoot, ".git"))) return false;
  try {
    const output = execFileSync("git", ["remote"], { cwd: vaultRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.trim().length > 0;
  } catch {
    return true;
  }
}

function resetDir(vaultRoot, relativePath) {
  const target = ensureInside(vaultRoot, path.join(vaultRoot, relativePath));
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, ".gitkeep"), "", "utf8");
}

const [vaultRootArg, ...flags] = process.argv.slice(2);
if (!vaultRootArg || !flags.includes("--yes")) {
  usage();
  console.error("This removes fixture content, custom block-types, layout, and .kb-ai runtime data. Re-run with --yes to confirm.");
  process.exit(1);
}

try {
  const vaultRoot = path.resolve(vaultRootArg);
  if (!isAllowedFixturePath(vaultRoot)) {
    throw new Error("Refusing to reset active/local vault. Use a fixture path such as sample-vault.");
  }
  if (hasGitRemote(vaultRoot)) {
    throw new Error("Refusing to reset a vault with a configured Git remote.");
  }
  for (const required of ["vault.yaml", "domains.yaml"]) {
    if (!fs.existsSync(path.join(vaultRoot, required))) throw new Error(`Invalid fixture vault root: missing ${required}`);
  }

  resetDir(vaultRoot, "content");
  resetDir(vaultRoot, "block-types");
  fs.mkdirSync(path.join(vaultRoot, ".kb-ai"), { recursive: true });
  fs.writeFileSync(path.join(vaultRoot, ".kb-ai", ".gitkeep"), "", "utf8");

  for (const relativePath of [".kb-ai/context", ".kb-ai/history", ".kb-ai/backups", ".kb-ai/imports"]) {
    fs.rmSync(ensureInside(vaultRoot, path.join(vaultRoot, relativePath)), { recursive: true, force: true });
  }

  fs.writeFileSync(path.join(vaultRoot, "graph.yaml"), "schemaVersion: 1\nedges: []\n", "utf8");
  fs.rmSync(path.join(vaultRoot, "graph-layout.yaml"), { force: true });

  if (flags.includes("--empty-domains")) {
    fs.writeFileSync(path.join(vaultRoot, "domains.yaml"), "schemaVersion: 1\ndomains: []\n", "utf8");
    const vaultPath = path.join(vaultRoot, "vault.yaml");
    const vault = YAML.parse(fs.readFileSync(vaultPath, "utf8")) || {};
    delete vault.defaultDomain;
    fs.writeFileSync(vaultPath, YAML.stringify(vault), "utf8");
  }

  console.log(`Reset fixture vault: ${vaultRoot}`);
  if (flags.includes("--empty-domains")) console.log("Domains: empty");
  console.log(`Next: npm run kb:export-ai-context -- ${vaultRoot}`);
} catch (error) {
  console.error(`Failed to reset fixture vault: ${error?.message || error}`);
  process.exit(1);
}
