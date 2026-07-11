#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { buildAiPackageApplyPlan } from "../src/index.js";
import { safeJoin } from "../src/ai-import/path-safety.js";
import { readVaultForCli } from "./read-vault-for-cli.js";
import { readPackageInput } from "./read-package-input.js";

function usage() {
  console.error("Usage: npm run kb:apply-ai-import -- ./vault ./package.wawapkg");
}

const [vaultRoot, packageRoot] = process.argv.slice(2);
if (!vaultRoot || !packageRoot) {
  usage();
  process.exit(1);
}

try {
  const resolvedVaultRoot = path.resolve(vaultRoot);
  const vault = readVaultForCli(resolvedVaultRoot);
  const plan = buildAiPackageApplyPlan(vault, readPackageInput(path.resolve(packageRoot)));
  plan.createDirs.forEach((relativePath) => fs.mkdirSync(safeJoin(resolvedVaultRoot, relativePath), { recursive: true }));
  plan.backupPaths.forEach((relativePath) => {
    const source = safeJoin(resolvedVaultRoot, relativePath);
    if (!fs.existsSync(source)) return;
    const target = safeJoin(resolvedVaultRoot, `${plan.backupRelativeDir}/${relativePath}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  });
  plan.writes.forEach((write) => {
    const target = safeJoin(resolvedVaultRoot, write.relativePath);
    if (write.createOnly && fs.existsSync(target)) throw new Error(`Refusing to overwrite existing file: ${write.relativePath}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, write.contents || "", "utf8");
  });
  (plan.binaryWrites || []).forEach((write) => {
    const target = safeJoin(resolvedVaultRoot, write.relativePath);
    if (write.createOnly && fs.existsSync(target)) throw new Error(`Asset already exists: ${write.relativePath}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(write.base64 || "", "base64"));
  });
  console.log(`Applied import package: ${plan.packageId}`);
  console.log(`Backup: ${plan.backupRelativeDir}`);
  console.log(`Created domains: ${(plan.history.createdDomains || []).length}`);
  (plan.history.createdDomains || []).forEach((item) => console.log(`- ${item}`));
  console.log(`Created: ${plan.history.created.length}`);
  plan.history.created.forEach((item) => console.log(`- ${item}`));
  console.log(`Modified: ${plan.history.modified.length}`);
  plan.history.modified.forEach((item) => console.log(`- ${item}`));
  process.exit(0);
} catch (error) {
  console.error(`Failed to apply import package: ${error?.message || error}`);
  process.exit(1);
}
