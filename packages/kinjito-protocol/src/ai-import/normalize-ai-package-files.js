import { parseYaml } from "../parse-yaml.js";

export function normalizeAiPackageFiles(rawPackage = {}) {
  const packageId = rawPackage.packageId || rawPackage.package_id || "";
  const manifestRaw = rawPackage.manifestRaw || rawPackage.manifest_raw || "";
  const sourcesRaw = rawPackage.sourcesRaw || rawPackage.sources_raw || "";
  const patchRaw = rawPackage.patchRaw || rawPackage.patch_raw || "";

  return {
    packageRoot: rawPackage.packageRoot || rawPackage.package_root || "",
    packageId,
    packageFilePath: rawPackage.packageFilePath || rawPackage.package_file_path || "",
    packageFormat: rawPackage.packageFormat || rawPackage.package_format || "",
    importedFromExternal: Boolean(rawPackage.importedFromExternal || rawPackage.imported_from_external),
    manifestRaw,
    sourcesRaw,
    patchRaw,
    manifest: manifestRaw ? parseYaml(manifestRaw, "manifest.yaml") : {},
    sources: sourcesRaw ? parseYaml(sourcesRaw, "sources.yaml") : {},
    patch: patchRaw ? parseYaml(patchRaw, "patch.yaml") : {},
    generatedMetaFiles: rawPackage.generatedMetaFiles || rawPackage.generated_meta_files || {},
    generatedNoteFiles: rawPackage.generatedNoteFiles || rawPackage.generated_note_files || {},
    generatedHtmlNoteFiles: rawPackage.generatedHtmlNoteFiles || rawPackage.generated_html_note_files || {},
    generatedExerciseFiles: rawPackage.generatedExerciseFiles || rawPackage.generated_exercise_files || {},
    generatedConceptMapFiles: rawPackage.generatedConceptMapFiles || rawPackage.generated_concept_map_files || {},
    assetFiles: rawPackage.assetFiles || rawPackage.asset_files || [],
    blockTypeFiles: rawPackage.blockTypeFiles || rawPackage.block_type_files || {},
    reviewFiles: rawPackage.reviewFiles || rawPackage.review_files || {},
  };
}
