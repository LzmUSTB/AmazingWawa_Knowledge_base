import path from "node:path";

export function assertSafeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error("Path must be a non-empty relative string.");
  }
  const normalized = relativePath.replaceAll("\\", "/");
  if (
    path.isAbsolute(normalized) ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error(`Unsafe relative path: ${relativePath}`);
  }
  return normalized;
}

export function safeJoin(root, relativePath) {
  const safeRelative = assertSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, safeRelative);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside root: ${relativePath}`);
  }
  return resolvedPath;
}

export function packageRelativePath(...parts) {
  return assertSafeRelativePath(parts.filter(Boolean).join("/"));
}
