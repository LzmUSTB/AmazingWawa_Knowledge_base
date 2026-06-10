# Note Composition Guide

Each note should aim to include: definition, problem solved, intuition, formal explanation, minimal example, common mistakes, related knowledge, and review questions.

Use triple-colon content block syntax:

```markdown
:::concept-card
title: Example
summary: Safe declarative content only.
:::
```

Use images when a static diagram, screenshot, or source figure is the clearest explanation:

```markdown
![Solver loop](assets/solver-loop.png)
[Original figure](assets/source-figure.pdf)
```

Use lowercase-kebab-case filenames with no spaces, for example solver-loop.png. Prefer ASCII filenames.

For expression-visualizer, do not provide only formula/formula_display. A render spec is required for actual drawing. Use render.kind: curve2d with render.y, or render.kind: surface3d with render.z. If the expression is a vector field, curl/divergence field, symbolic derivative, or otherwise unsupported, prefer a packaged image or declarative visual block.

Use declarative visual blocks when the explanation benefits from structured labels, process dependencies, comparison tables, or formula visualization.
