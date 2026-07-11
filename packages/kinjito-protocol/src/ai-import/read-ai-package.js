import fs from "node:fs";
import path from "node:path";
import { normalizeAiPackageFiles } from "./normalize-ai-package-files.js";

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walkFiles(root, relativeRoot, predicate, output = {}) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return output;
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteRoot, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      walkFiles(root, relativePath, predicate, output);
      continue;
    }
    if (entry.isFile() && predicate(relativePath)) {
      output[relativePath] = readTextIfExists(absolutePath);
    }
  }
  return output;
}

export function readAiPackage(packageRoot) {
  const resolvedRoot = path.resolve(packageRoot);
  const packageId = path.basename(resolvedRoot);
  const manifestRaw = readTextIfExists(path.join(resolvedRoot, "manifest.yaml"));
  const sourcesRaw = readTextIfExists(path.join(resolvedRoot, "sources.yaml"));
  const patchRaw = readTextIfExists(path.join(resolvedRoot, "patch.yaml"));

  const generatedMetaFiles = walkFiles(
    resolvedRoot,
    "generated/content",
    (relativePath) => relativePath.endsWith("/meta.yaml"),
  );
  const generatedNoteFiles = walkFiles(
    resolvedRoot,
    "generated/content",
    (relativePath) => relativePath.endsWith("/note.md"),
  );
  const blockTypeFiles = walkFiles(
    resolvedRoot,
    "block-types",
    (relativePath) => /\.ya?ml$/i.test(relativePath),
  );
  const reviewFiles = walkFiles(
    resolvedRoot,
    "review",
    () => true,
  );

  return normalizeAiPackageFiles({
    packageRoot: resolvedRoot,
    packageId,
    manifestRaw,
    sourcesRaw,
    patchRaw,
    generatedMetaFiles,
    generatedNoteFiles,
    blockTypeFiles,
    reviewFiles,
  });
}
