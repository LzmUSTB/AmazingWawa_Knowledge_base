import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

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
packageId: wawa-import-YYYYMMDD-topic-name
${"```"}

Assets are allowed and encouraged when they make the note clearer. Put packaged assets under:
${"```text"}
generated/content/<domain>/<node-id>/assets/<lowercase-kebab-name.ext>
${"```"}

Reference local assets from note.md:
${"```markdown"}
![Alt text](assets/example-diagram.png)
[Attachment label](assets/source-notes.pdf)
${"```"}

Remote URLs and data URLs are not allowed for note assets. Package images locally. Assets may come from source material or be simple original explanatory images generated for the note. Generated assets must be safe and non-executable.

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
        recommendedPackageIdPrefix: "wawa-import-",
        allowedPackageIdPrefixes: ["wawa-import-", "ai-import-"],
        assetRoot: "generated/content/<domain>/<node-id>/assets/",
        allowedAssetExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".mp3", ".wav", ".mp4", ".webm"],
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

## Native Block Examples

${"```markdown"}
:::concept-card
title: Stable Fluids
summary: A concise definition.
why: The problem it solves.
key_intuition: The mental model.
:::

:::process-flow
title: Solver Loop
steps:
  - id: predict
    label: Predict positions
  - id: solve
    label: Solve constraints
    depends_on: predict
:::

:::expression-visualizer
formula: f(x, y) = sin(x) * cos(y)
mode: 3d
:::

:::compare-table
columns: [A, B]
rows:
  stability: [high, medium]
:::
${"```"}

## Custom Declarative Blocks

${customBlocks.length ? customBlocks.map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath}`).join("\n") : "- none installed"}
`,
    "BLOCK_CREATION_POLICY.md": `# Block Creation Policy

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

If a simple static diagram or image is enough, prefer a packaged local asset image. If interaction, structured comparison, or semantic highlighting is needed, use a declarative visual block. Propose a native block only when declarative blocks are insufficient.

Do not include executable JS, Vue, CSS, HTML, script, iframe, eval, inline event handlers, or remote resources.
`,
    "NOTE_COMPOSITION_GUIDE.md": `# Note Composition Guide

Each note should aim to include: definition, problem solved, intuition, formal explanation, minimal example, common mistakes, related knowledge, and review questions.

Use triple-colon content block syntax:

${"```markdown"}
:::concept-card
title: Example
summary: Safe declarative content only.
:::
${"```"}

Use images when a static diagram, screenshot, or source figure is the clearest explanation:

${"```markdown"}
![Solver loop](assets/solver-loop.png)
[Original figure](assets/source-figure.pdf)
${"```"}

Use lowercase-kebab-case filenames with no spaces, for example solver-loop.png. Prefer ASCII filenames.

Use declarative visual blocks when the explanation benefits from structured labels, process dependencies, comparison tables, or formula visualization.
`,
    "PACKAGE_SCHEMA_GUIDE.md": `# Wawa Package Schema Guide

Archive extension: .wawapkg
Mimetype file content: ${WAWAPKG_MIMETYPE}

Recommended packageId: wawa-import-YYYYMMDD-topic-name

${"```yaml"}
# manifest.yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
status: draft
preview:
  mode: in-app
  generatedHtmlPreview: false
${"```"}

${"```yaml"}
# patch.yaml
operations:
  - type: add_node
    node:
      id: example-concept
      title: Example Concept
      domain: simulation
      type: concept
      status: draft
      summary: One sentence summary.
    parentId: simulation
  - type: add_edge
    from: example-concept
    to: another-concept
    relation: compares-with
${"```"}

Asset placement:
${"```text"}
generated/content/simulation/example-concept/assets/solver-loop.png
${"```"}

Note reference:
${"```markdown"}
![Solver loop](assets/solver-loop.png)
${"```"}

Constraints:
- Allowed relations: ${RELATION_TYPES.join(", ")}
- Link relations in add_edge: depends-on, used-in, compares-with
- Do not include executable/source files: .js, .ts, .vue, .css, .html, .htm, .exe, .dll, .bat, .cmd, .sh, .ps1, .jar, .wasm
- Do not include SVG unless the app later adds sanitization.
`,
    "DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md": `# Declarative Visual Grammar Guide

Custom block-types live in block-types/*.yaml and must use kind: declarative-visual with renderer.engine: visual-grammar.

Supported element families include rect, line, text, arrow-like connectors, groups, and simple data-bound repeated elements when declared by the installed schema.

Unsupported in package block definitions:
- script, eval, iframe, HTML, CSS, JS, Vue
- remote URLs or external resources
- arbitrary event handlers
- inline SVG

Prefer packaged images for static diagrams. Use visual grammar for structured technical visuals that need labels, dependencies, states, or repeated generated geometry.
`,
  };
}
