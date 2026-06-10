#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { diffAiPackage, validateAiPackage } from "../src/index.js";
import { readAiPackage } from "../src/ai-import/read-ai-package.js";
import { readVaultForCli } from "./read-vault-for-cli.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const vaultRoot = path.join(repoRoot, "vault");
const fixtureRoot = path.join(repoRoot, "fixtures", "ai-import-20260610-position-based-fluids");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tempPackage(name) {
  const root = path.join(os.tmpdir(), `ai-import-${name}-${Date.now()}`);
  fs.cpSync(fixtureRoot, root, { recursive: true });
  return root;
}

function readPatch(packageRoot) {
  return YAML.parse(fs.readFileSync(path.join(packageRoot, "patch.yaml"), "utf8"));
}

function writePatch(packageRoot, patch) {
  fs.writeFileSync(path.join(packageRoot, "patch.yaml"), YAML.stringify(patch), "utf8");
}

function withPackageId(packageRoot, packageId) {
  const manifestPath = path.join(packageRoot, "manifest.yaml");
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.packageId = packageId;
  fs.writeFileSync(manifestPath, YAML.stringify(manifest), "utf8");
}

const vault = readVaultForCli(vaultRoot);

const valid = validateAiPackage(vault, readAiPackage(fixtureRoot));
assert(valid.valid, `Expected fixture to be valid: ${valid.errors.join("; ")}`);

const diff = diffAiPackage(vault, valid);
assert(diff.nodesToAdd.some((node) => node.id === "position-based-fluids"), "Expected diff to include position-based-fluids.");
assert(diff.edgesToAdd.some((edge) => edge.from === "sph" && edge.relation === "contains" && edge.to === "position-based-fluids"), "Expected diff to include structural contains edge.");
assert(diff.edgesToAdd.some((edge) => edge.from === "position-based-fluids" && edge.relation === "compares-with" && edge.to === "sph"), "Expected diff to include compares-with edge.");

const invalidRelationRoot = tempPackage("invalid-relation");
withPackageId(invalidRelationRoot, path.basename(invalidRelationRoot));
const invalidRelationPatch = readPatch(invalidRelationRoot);
invalidRelationPatch.operations.find((operation) => operation.type === "add_edge").relation = "related-to";
writePatch(invalidRelationRoot, invalidRelationPatch);
assert(!validateAiPackage(vault, readAiPackage(invalidRelationRoot)).valid, "Expected invalid relation type to fail.");

const containsRoot = tempPackage("contains-edge");
withPackageId(containsRoot, path.basename(containsRoot));
const containsPatch = readPatch(containsRoot);
containsPatch.operations.find((operation) => operation.type === "add_edge").relation = "contains";
writePatch(containsRoot, containsPatch);
assert(!validateAiPackage(vault, readAiPackage(containsRoot)).valid, "Expected add_edge contains to fail.");

const duplicateRoot = tempPackage("duplicate-node");
withPackageId(duplicateRoot, path.basename(duplicateRoot));
const duplicatePatch = readPatch(duplicateRoot);
const addNode = duplicatePatch.operations.find((operation) => operation.type === "add_node");
addNode.node.id = "sph";
writePatch(duplicateRoot, duplicatePatch);
assert(!validateAiPackage(vault, readAiPackage(duplicateRoot)).valid, "Expected duplicate node id to fail.");

const scriptRoot = tempPackage("script-block");
withPackageId(scriptRoot, path.basename(scriptRoot));
const blockPath = path.join(scriptRoot, "block-types", "solver-loop-diagram.yaml");
fs.appendFileSync(blockPath, "\nscript: alert(1)\n", "utf8");
assert(!validateAiPackage(vault, readAiPackage(scriptRoot)).valid, "Expected executable block field to fail.");

console.log("AI import MVP-B self-check passed.");
