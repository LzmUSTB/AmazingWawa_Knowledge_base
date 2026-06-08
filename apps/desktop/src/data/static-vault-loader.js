import { normalizeVault } from "../../../../packages/knowledge-core/src/index.js";
import domainsYaml from "../../../../vault/domains.yaml?raw";
import graphLayoutYaml from "../../../../vault/graph-layout.yaml?raw";
import graphYaml from "../../../../vault/graph.yaml?raw";
import vaultYaml from "../../../../vault/vault.yaml?raw";
import { createMockVault } from "../graph/graph-data-store.js";

const metaFiles = import.meta.glob("../../../../vault/content/*/*/meta.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});

const noteFiles = import.meta.glob("../../../../vault/content/*/*/note.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function loadStaticVault() {
  try {
    const normalizedVault = normalizeVault({
      vaultYaml,
      domainsYaml,
      graphYaml,
      graphLayoutYaml,
      metaFiles,
      noteFiles,
    });

    if (normalizedVault.validation.errors.length) {
      console.warn("[vault] Loaded with validation errors:", normalizedVault.validation.errors);
    }
    if (normalizedVault.validation.warnings.length) {
      console.warn("[vault] Loaded with validation warnings:", normalizedVault.validation.warnings);
    }

    return normalizedVault;
  } catch (error) {
    console.warn("[vault] Failed to load real vault. Falling back to mock demo data.", error);
    return createMockVault();
  }
}
