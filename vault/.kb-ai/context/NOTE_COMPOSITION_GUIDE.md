# Note Composition Guide

Each note should aim to include: definition, problem solved, intuition, formal explanation, minimal example, common mistakes, related knowledge, and review questions.

Use triple-colon content block syntax. The block body is YAML. Prefer clear, explicit, machine-parseable YAML instead of loose pseudo-YAML.

Use images when a static diagram, screenshot, or source figure is the clearest explanation.

For process-flow: use steps with stable id values and depends_on to express dependencies.

For expression-visualizer: do not provide only formula/formula_display. A render spec is required for actual drawing. Use render.kind: curve2d with render.y, or render.kind: surface3d with render.z. If the expression is a vector field, curl/divergence field, symbolic derivative, or otherwise unsupported, prefer a packaged image or declarative visual block.

For declarative visual blocks: use them when the explanation benefits from structured labels, process dependencies, comparison tables, formula callouts, simple geometry, or repeated generated elements. Use the element types documented in DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md.
