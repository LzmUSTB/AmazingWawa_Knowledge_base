# Block Creation Policy

## Priority

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

If a simple static diagram or image is enough, prefer a packaged local asset image.

If interaction, structured comparison, semantic highlighting, repeated geometry, labeled technical structure, or staged inspection is needed, use a declarative visual block.

Propose a native block only when declarative blocks are insufficient.

## Frozen restrictions

Packages cannot create:
- relation types,
- native renderer code,
- executable logic,
- app components.

Relation types are frozen:

```text
contains
depends-on
used-in
compares-with
```

## Prohibited content

Do not include:
- executable JS,
- Vue,
- CSS,
- HTML,
- script,
- iframe,
- eval,
- inline event handlers,
- remote resources,
- arbitrary code execution.

## Block decision matrix

| Teaching goal | Preferred representation |
|---|---|
| Define a concept | concept-card |
| Explain why it matters | concept-card |
| Show a process or pipeline | process-flow |
| Show prerequisite/order/dependency | process-flow |
| Compare alternatives | compare-table |
| Explain code or pseudo-code | code-explain |
| Test recall | quiz |
| Show safe scalar 2D/3D formula behavior | expression-visualizer |
| Show vector fields / curl / divergence intuition | packaged image or declarative visual |
| Show architecture, staged system, labeled geometry | declarative visual |
| Show source screenshot or final visual result | packaged image |

## Block quality rule

Every block must answer one of:

```text
define
compare
sequence
inspect
simulate
test recall
explain implementation
show structure
```

Do not add a block only to make the note visually rich.

## Declarative block creation rule

Create a new declarative block type only if:
1. the visual pattern will clarify the note,
2. native blocks cannot express it well,
3. the block can be represented with safe visual grammar,
4. it does not require JS/CSS/HTML/SVG code.

Write why the block was created in:

```text
review/block-decision-report.md
```
