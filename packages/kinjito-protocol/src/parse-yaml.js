import YAML from "yaml";

export function parseYaml(raw, filePath = "unknown.yaml") {
  if (typeof raw !== "string") return {};

  try {
    return YAML.parse(raw) || {};
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

export function parseYamlFiles(fileMap = {}) {
  return Object.fromEntries(
    Object.entries(fileMap).map(([filePath, raw]) => [filePath, parseYaml(raw, filePath)]),
  );
}
