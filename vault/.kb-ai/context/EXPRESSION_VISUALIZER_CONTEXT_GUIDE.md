# Expression Visualizer Context Guide

## Purpose

`expression-visualizer` is an educational block for visualizing a safe, explicit mathematical render specification.

It must not be used as a generic formula display block. If the package only needs to show a formula, use normal Markdown text or a `concept-card`. If the formula cannot be safely rendered by the supported render modes, do not use `expression-visualizer`.

## Required model

Separate human-readable formula text from machine-rendered expression:

- `formula_display`: shown to the user only.
- `render`: the safe render specification actually used for drawing.
- `parameters`: explicit slider definitions.

A block with only `formula` or `formula_display` and no `render` must be considered display-only and should not draw a fake graph.

## Supported render modes

### 2D curve

```markdown
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
```

### 3D surface

```markdown
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
```

## Supported expression syntax

Allowed:
- numbers
- variables: `x`, `y`, `t`, and names declared in `parameters`
- operators: `+`, `-`, `*`, `/`, `^`
- parentheses
- constants: `pi`, `PI`, `e`
- functions:
  - `sin`
  - `cos`
  - `tan`
  - `abs`
  - `sqrt`
  - `pow`
  - `exp`
  - `log`
  - `min`
  - `max`
  - `floor`
  - `ceil`

Unsupported:
- arbitrary JavaScript
- member access
- strings
- arrays
- objects
- assignment
- conditionals
- semicolons
- `window`, `document`, `fetch`, `Function`, `eval`, `constructor`, `prototype`
- implicit multiplication such as `2x`; write `2 * x`
- symbolic derivatives such as `∂N/∂x`

## Parameter rules

Each slider parameter should include:

```yaml
- name: amplitude
  label: Amplitude
  default: 1
  min: 0
  max: 3
  step: 0.05
```

Use meaningful parameter names. Do not rely on automatic `a`, `b`, `c`, `d` sliders unless the formula actually uses those names.

## When not to use expression-visualizer

Do not use `expression-visualizer` for vector fields such as:

```text
F(x,y) = (∂N/∂y, -∂N/∂x)
```

This is not a 2D curve and not a scalar 3D surface. For curl, divergence, flow fields, or vector-field intuition, prefer:

1. a packaged local image asset,
2. a declarative visual block,
3. a future dedicated `vector-field-visualizer` block.

## Package validation guidance

A `.wawapkg` should be treated as invalid or should warn if:

- `expression-visualizer` has a `formula` but no `render`.
- `render.kind` is unsupported.
- `render.y` / `render.z` references undeclared variables.
- a parameter lacks a numeric `default`, `min`, `max`, or `step`.
- expression syntax contains unsupported characters or functions.

## Safe fallback

If a block has no valid render spec, the renderer should show the formula and an explicit "not rendered" message. It must not draw a default sine curve or any unrelated demo graph.
