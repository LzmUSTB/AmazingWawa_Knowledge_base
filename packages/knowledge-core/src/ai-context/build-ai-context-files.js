import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const EXPRESSION_VISUALIZER_CONTEXT_GUIDE = `# Expression Visualizer Context Guide

## Purpose

\`expression-visualizer\` is an educational block for visualizing a safe, explicit mathematical render specification.

It must not be used as a generic formula display block. If the package only needs to show a formula, use normal Markdown text or a \`concept-card\`. If the formula cannot be safely rendered by the supported render modes, do not use \`expression-visualizer\`.

## Required model

Separate human-readable formula text from machine-rendered expression:

- \`formula_display\`: shown to the user only.
- \`render\`: the safe render specification actually used for drawing.
- \`parameters\`: explicit slider definitions.

A block with only \`formula\` or \`formula_display\` and no \`render\` must be considered display-only and should not draw a fake graph.

## Supported render modes

### 2D curve

\`\`\`markdown
:::expression-visualizer
title: Sine Wave Parameter Demo
mode: 2d
formula_display: y = amplitude * sin(frequency * x + phase) + offset
render:
  kind: curve2d
  y: amplitude * sin(frequency * x + phase) + offset
  xRange: [-6.28, 6.28]
  valueRange: [-3, 3]
parameters:
  - name: amplitude
    label: Amplitude
    default: 1
    min: 0
    max: 3
    step: 0.05
  - name: frequency
    label: Frequency
    default: 1.5
    min: 0.1
    max: 8
    step: 0.1
  - name: phase
    label: Phase
    default: 0
    min: -3.14
    max: 3.14
    step: 0.05
  - name: offset
    label: Offset
    default: 0
    min: -2
    max: 2
    step: 0.05
:::
\`\`\`

### 3D surface

\`\`\`markdown
:::expression-visualizer
title: Wave Surface
mode: 3d
formula_display: z = amplitude * sin(freqX * x) * cos(freqY * y)
render:
  kind: surface3d
  z: amplitude * sin(freqX * x) * cos(freqY * y)
  xRange: [-3.14, 3.14]
  yRange: [-3.14, 3.14]
  zRange: [-2, 2]
parameters:
  - name: amplitude
    label: Amplitude
    default: 1
    min: 0
    max: 2
    step: 0.05
  - name: freqX
    label: X Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
  - name: freqY
    label: Y Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
:::
\`\`\`

## Supported expression syntax

Allowed: numbers, variables \`x\`, \`y\`, \`t\`, declared parameter names, operators \`+ - * / ^\`, parentheses, constants \`pi\`, \`PI\`, \`e\`, and functions \`sin\`, \`cos\`, \`tan\`, \`abs\`, \`sqrt\`, \`pow\`, \`exp\`, \`log\`, \`min\`, \`max\`, \`floor\`, \`ceil\`.

Unsupported: arbitrary JavaScript, member access, strings, arrays, objects, assignment, conditionals, semicolons, \`window\`, \`document\`, \`fetch\`, \`Function\`, \`eval\`, \`constructor\`, \`prototype\`, implicit multiplication such as \`2x\`, and symbolic derivatives such as \`∂N/∂x\`.

## When not to use expression-visualizer

Do not use \`expression-visualizer\` for vector fields such as \`F(x,y) = (∂N/∂y, -∂N/∂x)\`. This is not a 2D curve and not a scalar 3D surface. Prefer a packaged local image asset, a declarative visual block, or a future dedicated \`vector-field-visualizer\` block.
`;

const DECLARATIVE_VISUAL_GRAMMAR_GUIDE = `# Declarative Visual Grammar Guide

Custom block-types live in \`block-types/*.yaml\` and must use:

\`\`\`yaml
kind: declarative-visual
renderer:
  engine: visual-grammar
\`\`\`

Use declarative visual blocks when the note needs a structured technical visual: labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.

## Supported layout types

- \`split-panel\`: SVG scene plus inspector
- \`stack\`: scene only / vertical stack
- \`grid\`: responsive grid panels

## Supported panel types

- \`svg-scene\`
- \`inspector\`

## Supported element types

- \`node\`: selectable labeled rectangle, best for concepts/states/steps
- \`edge\`: connector between nodes
- \`arrow\`: directed connector between nodes or coordinates
- \`label\`: text label
- \`text\`: text label alias
- \`badge\`: boxed label
- \`formula-callout\`: boxed formula or symbolic note
- \`rect\`: primitive rectangle
- \`line\`: primitive line
- \`circle\`: primitive circle

Coordinates use normalized 2D values: \`x\`, \`y\`, \`x1\`, \`y1\`, \`x2\`, \`y2\`, \`width\`, \`height\`, and \`radius\` are in [0, 1].

## Data binding

Elements may bind to note block data with \`$.\` paths.

\`\`\`yaml
elements:
  - type: node
    each: $.items
    template:
      id: $.id
      label: $.label
      x: $.x
      y: $.y
\`\`\`

## Example block-type

\`\`\`yaml
type: vector-field-intuition
title: Vector Field Intuition
kind: declarative-visual
renderer:
  engine: visual-grammar
  layout:
    type: split-panel
    left:
      type: svg-scene
      scene: main
    right:
      type: inspector
visualGrammar:
  scenes:
    main:
      coordinateSystem: normalized-2d
      elements:
        - type: rect
          id: background-panel
          x: 0.08
          y: 0.12
          width: 0.84
          height: 0.72
        - type: node
          id: scalar-field
          label: Scalar Field
          x: 0.24
          y: 0.38
        - type: node
          id: gradient
          label: Gradient
          x: 0.5
          y: 0.38
        - type: node
          id: curl-like-field
          label: Curl-like Field
          x: 0.76
          y: 0.38
        - type: arrow
          from: scalar-field
          to: gradient
        - type: arrow
          from: gradient
          to: curl-like-field
        - type: formula-callout
          id: formula
          text: F(x,y) = (dN/dy, -dN/dx)
          x: 0.5
          y: 0.72
interactions:
  - select
\`\`\`

Do not include script, eval, iframe, HTML, CSS, JS, Vue, remote URLs, arbitrary event handlers, inline SVG, or executable code.
`;

function blockRegistryMarkdown(customBlocks) {
  return `# Block Registry

## Native Blocks

${NATIVE_BLOCK_TYPES.map((type) => `- ${type}`).join("\n")}

## Native Block Examples

\`\`\`markdown
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
  - id: update
    label: Update velocity
    depends_on: solve
:::

:::expression-visualizer
title: Wave Surface
mode: 3d
formula_display: z = amplitude * sin(freqX * x) * cos(freqY * y)
render:
  kind: surface3d
  z: amplitude * sin(freqX * x) * cos(freqY * y)
  xRange: [-3.14, 3.14]
  yRange: [-3.14, 3.14]
  zRange: [-2, 2]
parameters:
  - name: amplitude
    label: Amplitude
    default: 1
    min: 0
    max: 2
    step: 0.05
  - name: freqX
    label: X Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
  - name: freqY
    label: Y Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
:::

:::compare-table
columns: [A, B]
rows:
  stability: [high, medium]
:::

:::code-explain
language: glsl
code: |
  vec2 uv = fragCoord / resolution;
lines:
  1: Normalize pixel position to UV coordinates.
:::

:::quiz
question: Why does pressure projection reduce divergence?
choices: [It cancels compressive velocity components, It adds noise, It changes mesh topology]
answer: It cancels compressive velocity components.
:::
\`\`\`

## Custom Declarative Blocks

${customBlocks.length ? customBlocks.map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath}`).join("\n") : "- none installed"}
`;
}

export function buildAiContextFiles(vault = {}) {
  const registry = getBlockRegistry(vault);
  const nodes = (vault.nodes || []).filter((node) => node.type !== "domain").map((node) => ({ id: node.id, title: node.title, aliases: node.aliases || [], domain: node.domain, type: node.type, status: node.status, summary: node.summary || "", path: { meta: node.filePath || "", note: node.filePath ? node.filePath.replace(/meta\.yaml$/, "note.md") : "" }, tags: node.tags || [] }));
  const edges = (vault.edges || []).map((edge) => ({ id: edge.id, from: edge.from, to: edge.to, relation: edge.relation }));
  const domains = (vault.domains || []).map((domain) => ({ id: domain.id, title: domain.title, description: domain.description || "", color: domain.color, order: domain.order }));
  const customBlocks = Object.values(registry.declarative || {});
  const emptyDomains = domains.length === 0;

  return {
    "AI_KB_GUIDE.md": `# Wawa Package Guide

Final user-facing output must be a single .wawapkg file.

.wawapkg is a ZIP-compatible archive with a custom extension. The archive root must contain: mimetype, manifest.yaml, sources.yaml, patch.yaml, generated/, block-types/, review/.

The mimetype file must contain exactly:
\`\`\`
${WAWAPKG_MIMETYPE}
\`\`\`

Assets are allowed and encouraged. Put packaged assets under:
\`\`\`text
generated/content/<domain>/<node-id>/assets/<lowercase-kebab-name.ext>
\`\`\`

Reference local assets from note.md:
\`\`\`markdown
![Alt text](assets/example-diagram.png)
[Attachment label](assets/source-notes.pdf)
\`\`\`

Remote URLs and data URLs are not allowed for note assets. Package images locally.

Domain rules: If DOMAIN_INDEX.yaml is empty, start with add_domain. If no suitable existing domain fits, create a small, stable, broad domain with add_domain. Do not create excessive narrow domains.
`,
    "AI_CONTEXT.yaml": YAML.stringify({ vault: vault.vault, generatedAt: new Date().toISOString(), constraints: { idPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", allowedDomains: domains.map((domain) => domain.id), canAddDomains: true, allowedNodeTypes: KNOWLEDGE_TYPES.filter((type) => type !== "domain"), allowedStatuses: KNOWLEDGE_STATUS.filter((status) => status !== "domain"), allowedRelations: RELATION_TYPES, allowedLinkRelations: ["depends-on", "used-in", "compares-with"], packageFormat: "wawapkg", packageKind: "import", recommendedPackageIdPrefix: "wawa-import-", allowedPackageIdPrefixes: ["wawa-import-", "ai-import-"], assetRoot: "generated/content/<domain>/<node-id>/assets/", allowedAssetExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".mp3", ".wav", ".mp4", ".webm"] }, counts: { domains: domains.length, nodes: nodes.length, edges: edges.length, customBlockTypes: customBlocks.length }, state: { emptyVault: domains.length === 0 && nodes.length === 0 && edges.length === 0, emptyDomains, guidance: emptyDomains ? "This vault has no domains. A useful package should usually start with add_domain." : "Use existing domains when appropriate, or add a new broad domain if needed." } }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes }),
    "RELATION_INDEX.yaml": YAML.stringify({ edges }),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains }),
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
    "BLOCK_CREATION_POLICY.md": `# Block Creation Policy

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

If a simple static diagram or image is enough, prefer a packaged local asset image. If interaction, structured comparison, semantic highlighting, repeated geometry, or labeled technical structure is needed, use a declarative visual block. Propose a native block only when declarative blocks are insufficient.

Packages cannot create relation types or native renderer code. Relation types are frozen: ${RELATION_TYPES.join(", ")}.

Do not include executable JS, Vue, CSS, HTML, script, iframe, eval, inline event handlers, or remote resources.
`,
    "NOTE_COMPOSITION_GUIDE.md": `# Note Composition Guide

Each note should aim to include: definition, problem solved, intuition, formal explanation, minimal example, common mistakes, related knowledge, and review questions.

Use triple-colon content block syntax. The block body is YAML. Prefer clear, explicit, machine-parseable YAML instead of loose pseudo-YAML.

Use images when a static diagram, screenshot, or source figure is the clearest explanation.

For process-flow: use steps with stable id values and depends_on to express dependencies.

For expression-visualizer: do not provide only formula/formula_display. A render spec is required for actual drawing. Use render.kind: curve2d with render.y, or render.kind: surface3d with render.z. If the expression is a vector field, curl/divergence field, symbolic derivative, or otherwise unsupported, prefer a packaged image or declarative visual block.

For declarative visual blocks: use them when the explanation benefits from structured labels, process dependencies, comparison tables, formula callouts, simple geometry, or repeated generated elements. Use the element types documented in DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md.
`,
    "PACKAGE_SCHEMA_GUIDE.md": `# Wawa Package Schema Guide

Archive extension: .wawapkg

Mimetype file content: ${WAWAPKG_MIMETYPE}

Recommended packageId: wawa-import-YYYYMMDD-topic-name

\`\`\`yaml
# manifest.yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
status: seed
preview:
  mode: in-app
  generatedHtmlPreview: false
\`\`\`

\`\`\`yaml
# patch.yaml
operations:
  - type: add_domain
    domain:
      id: computer-graphics
      title: Computer Graphics
      description: Rendering, geometry processing, shaders, and graphics pipelines.
      color: "#00B7FF"
      order: 10
  - type: add_node
    node:
      id: example-concept
      title: Example Concept
      domain: computer-graphics
      type: concept
      status: seed
      summary: One sentence summary.
    parentId: computer-graphics
\`\`\`

Asset placement: generated/content/<domain>/<node-id>/assets/<file>.

Constraints: use add_domain first when no suitable domain exists; add_node may reference a domain created earlier; allowed add_edge relations are depends-on, used-in, compares-with; do not include executable/source files.
`,
    "DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md": DECLARATIVE_VISUAL_GRAMMAR_GUIDE,
    "EXPRESSION_VISUALIZER_CONTEXT_GUIDE.md": EXPRESSION_VISUALIZER_CONTEXT_GUIDE,
  };
}
