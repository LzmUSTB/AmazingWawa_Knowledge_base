import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

export function buildAiContextFiles(vault = {}) {
  const registry = getBlockRegistry(vault);
  const nodes = (vault.nodes || []).filter((node) => node.type !== "domain").map((node) => ({
    id: node.id,
    title: node.title,
    aliases: node.aliases || [],
    domain: node.domain,
    type: node.type,
    status: node.status,
    summary: node.summary || "",
    path: {
      meta: node.filePath || "",
      note: node.filePath ? node.filePath.replace(/meta\.yaml$/, "note.md") : "",
    },
    tags: node.tags || [],
  }));
  const edges = (vault.edges || []).map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
  }));
  const domains = (vault.domains || []).map((domain) => ({
    id: domain.id,
    title: domain.title,
    description: domain.description || "",
    color: domain.color,
    order: domain.order,
  }));
  const customBlocks = Object.values(registry.declarative || {});

  return {
    "AI_KB_GUIDE.md": `# Wawa Package Guide

Final user-facing output must be a single .wawapkg file.

.wawapkg is a ZIP-compatible archive with a custom extension. The archive root must contain:
- mimetype
- manifest.yaml
- sources.yaml
- patch.yaml
- generated/
- block-types/
- review/

The mimetype file must contain exactly:
${"```"}
application/x-wawa-kb-ai-import-package
${"```"}

manifest.yaml must include:
${"```yaml"}
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
${"```"}

Do not ask the user to manually place package folders under .kb-ai/imports. Do not output an ordinary .zip as the final artifact.

If you cannot create .wawapkg directly, output a source package folder and ask the developer to pack it with:
${"```bash"}
npm run kb:pack-ai-import -- ./package-folder ./ai-import-xxx.wawapkg
${"```"}
`,
    "AI_CONTEXT.yaml": YAML.stringify({
      vault: vault.vault,
      generatedAt: new Date().toISOString(),
      constraints: {
        idPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        allowedDomains: domains.map((domain) => domain.id),
        allowedNodeTypes: KNOWLEDGE_TYPES.filter((type) => type !== "domain"),
        allowedStatuses: KNOWLEDGE_STATUS.filter((status) => status !== "domain"),
        allowedRelations: RELATION_TYPES,
        allowedLinkRelations: ["depends-on", "used-in", "compares-with"],
        packageFormat: "wawapkg",
        packageKind: "import",
      },
      counts: {
        domains: domains.length,
        nodes: nodes.length,
        edges: edges.length,
        customBlockTypes: customBlocks.length,
      },
    }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes }),
    "RELATION_INDEX.yaml": YAML.stringify({ edges }),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains }),
    "BLOCK_REGISTRY.md": `# Block Registry

## Native Blocks

${NATIVE_BLOCK_TYPES.map((type) => `- ${type}`).join("\n")}

## Custom Declarative Blocks

${customBlocks.length ? customBlocks.map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath}`).join("\n") : "- none installed"}
`,
    "BLOCK_CREATION_POLICY.md": `# Block Creation Policy

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

Do not include executable JS, Vue, CSS, HTML, script, iframe, eval, inline event handlers, or remote resources.
`,
    "NOTE_COMPOSITION_GUIDE.md": `# Note Composition Guide

Use triple-colon content block syntax:

${"```markdown"}
:::concept-card
title: Example
summary: Safe declarative content only.
:::
${"```"}
`,
  };
}
