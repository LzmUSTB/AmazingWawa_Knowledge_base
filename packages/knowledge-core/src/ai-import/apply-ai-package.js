import fs from "node:fs";
import path from "node:path";
import { buildAiPackageApplyPlan } from "./build-ai-package-apply-plan.js";
import { readAiPackage } from "./read-ai-package.js";
import { safeJoin } from "./path-safety.js";

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyBackup(vaultRoot, backupDir, relativePath) {
  const source = safeJoin(vaultRoot, relativePath);
  if (!fs.existsSync(source)) return;
  const target = safeJoin(vaultRoot, `${backupDir}/${relativePath}`);
  ensureParent(target);
  fs.copyFileSync(source, target);
}

export function applyAiPackage(vaultRoot, packageRoot, options = {}) {
  const { readVault } = options;
  if (typeof readVault !== "function") {
    throw new Error("applyAiPackage requires options.readVault to re-read the current vault.");
  }

  const currentVault = readVault(vaultRoot);
  const packageFiles = readAiPackage(packageRoot);
  const plan = buildAiPackageApplyPlan(currentVault, packageFiles);

  plan.createDirs.forEach((relativePath) => {
    fs.mkdirSync(safeJoin(vaultRoot, relativePath), { recursive: true });
  });

  plan.backupPaths.forEach((relativePath) => copyBackup(vaultRoot, plan.backupRelativeDir, relativePath));

  plan.writes.forEach((write) => {
    const target = safeJoin(vaultRoot, write.relativePath);
    if (write.createOnly && fs.existsSync(target)) {
      throw new Error(`Refusing to overwrite existing file: ${write.relativePath}`);
    }
    ensureParent(target);
    fs.writeFileSync(target, write.contents || "", "utf8");
  });

  return {
    packageId: plan.packageId,
    backupRelativeDir: plan.backupRelativeDir,
    created: plan.history.created,
    modified: plan.history.modified,
    warnings: plan.history.warnings,
  };
}
