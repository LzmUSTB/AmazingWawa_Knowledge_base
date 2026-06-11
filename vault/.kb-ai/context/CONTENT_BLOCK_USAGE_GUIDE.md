# Content Block Usage Guide

## Purpose

Use content blocks to improve learning density and clarity. Do not use blocks as decoration.

## concept-card

Use for:
- definition,
- why the concept matters,
- core intuition,
- compact high-level memory hook.

Good fields:
```yaml
title:
summary:
why:
key_intuition:
points:
tags:
```

Avoid making the concept-card the entire note. It should introduce the concept, not replace full explanation.

## process-flow

Use for:
- pipelines,
- algorithms,
- authoring workflows,
- dependency chains,
- cause-effect stages.

Use stable ids and `depends_on`.

Good:
```yaml
steps:
  - id: input-noise
    label: Input Noise
  - id: derivative
    label: Compute Derivative
    depends_on: input-noise
```

Avoid:
```yaml
steps:
  - Make it
  - Process it
  - Finish it
```

## compare-table

Use for:
- technique comparisons,
- tradeoffs,
- alternatives,
- misconception correction.

Rows should be conceptual dimensions, not random facts.

Good rows:
```yaml
rows:
  physical_accuracy: [...]
  authoring_control: [...]
  runtime_cost: [...]
  failure_mode: [...]
```

## code-explain

Use for:
- shader code,
- pseudo-code,
- formulas translated into algorithm,
- data transformation steps.

Provide line explanations.

## quiz

Use for:
- review questions,
- misconception checks,
- transfer of knowledge.

Good quiz questions ask why/how/what-if, not trivia.

## expression-visualizer

Use only when:
- the expression is a scalar 2D curve or scalar 3D surface,
- a safe render spec is provided,
- parameters have meaningful slider ranges.

Do not use for:
- vector fields,
- symbolic derivatives,
- formulas with no meaningful interactive parameter.

## declarative visual blocks

Use when:
- a structured visual explanation is more useful than text,
- labels and relationships matter,
- geometry or stages must be inspected.

Use for:
- vector field intuition,
- architecture diagrams,
- pipeline diagrams,
- formula decomposition,
- input/output mapping,
- state transition diagrams.

## packaged images

Use when:
- a static diagram is enough,
- source material has a useful figure,
- the visual depends on raster detail,
- a generated explanatory image is clearer than a block.

Every image must have meaningful alt text.
