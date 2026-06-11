# Note Composition Guide

## Purpose

A note should be a reusable learning unit. It should teach one knowledge object clearly enough that the user can review it later without reopening the original source.

Do not produce a loose article summary. Do not merely translate the source.

## Output language

Use Chinese for explanations. Keep common technical terms in English when precise.

Recommended style:

```text
Curl Noise 是一种从标量噪声场构造旋转向量场的方法。它常用于实时 VFX 中生成类似流体的纹理运动，而不需要运行完整流体模拟。
```

Avoid:

```text
这篇文章介绍了 Curl Noise，很有用。
```

## Node granularity

Each note should correspond to one reusable knowledge object.

### Good node objects

- A concept: `Curl Noise`
- A mechanism: `Pressure Projection`
- A skill: `Authoring Curl Noise Inputs`
- A question: `Can Curl Noise Tile Seamlessly?`
- A comparison: `Curl Noise vs Flow Map`
- A procedure: `Generating Flipbook VFX`

### Bad node objects

- Entire source article as one node
- One node per minor paragraph
- A vague node such as `Interesting Notes`
- A source-specific title with no reusable meaning

## Required note structure

A high-quality note should include most of the following, adapted to content type:

1. **Definition**  
   One precise sentence defining the concept.

2. **Problem solved**  
   What problem does this knowledge solve?

3. **Core intuition**  
   A simple mental model.

4. **Mechanism**  
   How it works internally. Include cause-effect.

5. **Formal / technical detail**  
   Equations, data structures, algorithmic steps, shader logic, architecture, or implementation details when relevant.

6. **Minimal example**  
   A small concrete example.

7. **Parameters / variables**  
   Explain names, meanings, effects, typical ranges if known, and failure modes.

8. **Common mistakes**  
   List misunderstandings or pitfalls.

9. **Relation to other nodes**  
   Explain why it depends on or is used in another concept.

10. **Review questions**  
   2-5 questions that test understanding, not trivia.

## Depth requirements

Each important concept note should include at least one of:

```text
- a causal mechanism: changing X affects Y because Z
- a procedural workflow: step A -> B -> C
- a contrast: A differs from B in mechanism or use case
- an implementation detail: how it would be represented in code/shader/data
- a limitation: when it fails or becomes misleading
```

If a note only contains definition and summary, it is too shallow.

## Markdown and block syntax

Use triple-colon content block syntax. The block body is YAML.

```markdown
:::concept-card
title: Example
summary: Safe declarative content only.
:::
```

Prefer explicit, machine-parseable YAML. Avoid pseudo-YAML.

## Images and assets

Use images when a static diagram, screenshot, or source figure is the clearest explanation.

```markdown
![Solver loop](assets/solver-loop.png)
[Original figure](assets/source-figure.pdf)
```

Rules:
- Use lowercase-kebab-case filenames.
- Use local `assets/...` paths only.
- Do not use remote URLs or data URLs.
- Every image must have meaningful alt text.
- Do not use decorative images without explanatory value.

## Content block use

Use content blocks when they improve learning, not to decorate.

- `concept-card`: definition, why it matters, intuition.
- `process-flow`: ordered steps or dependency chains.
- `compare-table`: differences, tradeoffs, alternatives.
- `code-explain`: code or pseudo-code with line explanations.
- `quiz`: recall or conceptual checks.
- `expression-visualizer`: safe scalar curve/surface interaction only.
- declarative visual block: structured diagram, vector-field intuition, pipeline, state graph, architecture.

## Process-flow rules

Use stable step ids and dependencies.

```markdown
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
```

## Expression visualizer rules

Do not provide only `formula` or `formula_display`.

A render spec is required for actual drawing:

```yaml
render:
  kind: curve2d
  y: amplitude * sin(frequency * x + phase)
```

If the expression is a vector field, curl/divergence field, symbolic derivative, or otherwise unsupported, prefer a packaged image or declarative visual block.

## Declarative visual block rules

Use declarative visual blocks when explanation benefits from structured labels, process dependencies, comparison, formula callouts, simple geometry, or repeated generated elements.

Use element types from `DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md`.

## Review questions

Good questions test understanding:

```text
为什么把梯度旋转 90° 会得到更接近旋涡的运动？
如果 warp strength 过大，图像可能出现什么问题？
Curl Noise 和完整流体模拟的边界在哪里？
```

Bad questions ask trivial recall:

```text
这篇文章讲了什么？
Curl Noise 的英文是什么？
```

## Anti-patterns

Avoid:
- source paragraph summary,
- vague claims,
- block overuse,
- decorative diagrams,
- relations without explanation,
- ungrounded parameter ranges,
- note titles copied from article headlines when a concept name is better.
