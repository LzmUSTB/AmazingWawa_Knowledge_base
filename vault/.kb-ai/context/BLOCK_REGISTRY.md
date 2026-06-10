# Block Registry

## Native Blocks

- concept-card
- process-flow
- compare-table
- code-explain
- quiz
- expression-visualizer

## Native Block Examples

```markdown
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
```

## Custom Declarative Blocks

- none installed
