# Content Block Renderer

## 1. Purpose

The Content Block Renderer makes `note.md` readable as structured knowledge content while keeping the file plain-text, Git-friendly Markdown.

Editing remains raw Markdown in a textarea.

Reading mode parses and renders supported blocks.

The first implementation follows the hard-edged black technical HUD visual direction established for the desktop app.

## 2. Design Principles

```txt
plain Markdown remains valid and readable
custom blocks are optional
Git diff stays clean
Codex and ChatGPT can write blocks easily
renderer is read-mode only
no rich-text block editor in first version
```

The renderer must not mutate note content unless the user explicitly saves edits.

## 3. Supported Blocks

Current first-version supported block types:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
expression-visualizer
```

## 4. Block Syntax

Use Markdown-style fenced custom blocks:

```md
:::concept-card
title: View Matrix
summary: 将世界坐标变换到相机坐标的矩阵。
why: 它决定了物体相对于相机的位置。
:::
```

Rules:

```txt
opening fence: :::block-name
closing fence: :::
metadata: simple YAML-like key/value lines
unknown block: render as safe fallback
parse failure: render fallback, do not crash
```

Supported YAML-like value styles:

```txt
key: simple one-line value

key: |
  preserve line breaks exactly

key: >
  fold line breaks into paragraphs
```

The lightweight parser is not a full YAML parser. Keep supported syntax simple and predictable.

## 5. Plain Markdown Rendering

Plain Markdown should render as document typography, not boxed debug cards.

Requirements:

```txt
H1 comes from note header, not repeated as boxed content
H2/H3 are clear section headings
section headings are larger than tiny panel labels
ordinary paragraphs use readable line height
do not put every subsection in its own heavy border box
use subtle separators or spacing instead
lists render as lists, not raw pre text
inline code and fenced code blocks render distinctly
```

Recommended visual direction:

```txt
large note title
metadata chips
document body
subheadings with left accent or underline
paragraph spacing
code blocks in technical monospace panels
content blocks as intentional components
```

## 6. concept-card

Purpose:

```txt
definition + summary + why it matters
```

Example:

```md
:::concept-card
title: 渲染管线
summary: 把三维场景转换成二维图像的一系列处理阶段。
why: 它决定实时渲染的处理顺序、数据流和可插入的优化点。
:::
```

Render as a compact concept card with clear title, summary, and optional why/key intuition fields.

## 7. process-flow

Purpose:

```txt
visualize process order and dependency
```

It must support both sequential and parallel branches.

Example:

```md
:::process-flow
title: SSFR 基础流程
nodes:
  depth:
    label: Depth Pass
    description: 渲染粒子的深度。
  thickness:
    label: Thickness Pass
    description: 累积流体厚度。
  smooth:
    label: Depth Smoothing
    description: 对深度进行平滑。
  normal:
    label: Normal Reconstruction
    description: 从平滑后的深度恢复法线。
  shading:
    label: Shading / Composition
    description: 使用深度、厚度和法线合成最终水面。
edges:
  - depth -> smooth
  - smooth -> normal
  - normal -> shading
  - thickness -> shading
parallel:
  - [depth, thickness]
:::
```

Rendering requirements:

```txt
nodes must not overlap
parallel nodes should be visually separated
arrows show execution/data dependency
clicking a step may show its description
the flow board can be larger than the visible region
the flow chart area scrolls on the necessary axis when too large
```

Do not force all steps into one vertical list.

## 8. compare-table

Purpose:

```txt
compare concepts, methods, algorithms, or tools
```

Example:

```md
:::compare-table
columns: Forward Rendering, Deferred Rendering
rows:
  Lighting Cost: 高, 中
  Transparency: 容易, 较难
  G-buffer: 不需要, 需要
:::
```

Render as a clear hard-edged table matching the app's technical style.

## 9. code-explain

Purpose:

```txt
show code and explanation side-by-side or stacked
```

Block-level explanation example:

```md
:::code-explain
language: glsl
code: |
  hash = cell.x + cell.y * gridRes.x + cell.z * gridRes.x * gridRes.y;
explain: |
  将三维网格坐标压平成一维 index。
:::
```

Line-specific explanation example:

```md
:::code-explain
language: glsl
code: |
  uint hash = cell.x + cell.y * gridRes.x + cell.z * gridRes.x * gridRes.y;
  density += mass * kernel(r, h);
lines:
  1: 把三维 cell 坐标压平成一维 hash，用于定位粒子所属空间桶。
  2: 对邻居粒子的核函数贡献进行加权累积，得到密度估计的一部分。
explain: |
  这段代码展示 GPU SPH 邻居搜索和密度计算中常见的两个核心片段。
:::
```

Rendering requirements:

```txt
code panel shows all lines
long code lines scroll horizontally
code must not be truncated with ellipsis
line numbers remain visible
clicking a code line updates the explanation panel
if line-specific explanation exists, show it
otherwise show block-level explain/explanation
```

Line-specific explanation lookup should support:

```txt
lines:
  1: ...
  2: ...

line_explanations:
  1: ...
  2: ...

explanations:
  line-1: ...
  line-2: ...
```

No full syntax highlighter is required in the first version.

## 10. quiz

Purpose:

```txt
review question and answer
```

Example:

```md
:::quiz
question: 为什么 View Space normal 常用于屏幕空间效果？
answer: 因为屏幕空间 pass 的相机方向固定，计算更直接。
:::
```

Interaction:

```txt
show question first
answer hidden by default
click Show Answer to reveal
```

No spaced repetition or scoring in first version.

## 11. expression-visualizer

Purpose:

```txt
visualize how parameters in a specific expression affect the output
```

It is not a general graphing calculator. It is an educational block for intuitive parameter understanding.

Each `expression-visualizer` block renders exactly one mode.

```txt
mode: 2d -> render only a 2D curve
mode: 3d -> render only a 3D surface
```

The block must not show a 2D/3D switcher. The author chooses the mode in `note.md`.

Formula rules:

```txt
display formula at the top
use data.formula if provided
fallback formula is allowed only when formula is missing
do not evaluate arbitrary JavaScript
use fixed supported formula families
```

### 2D

Example:

```md
:::expression-visualizer
title: Sine Wave
mode: 2d
formula: y = a · sin(bx + c) + d
parameters:
  a: 1
  b: 1
  c: 0
  d: 0
range:
  x: [-6.28, 6.28]
:::
```

Requirements:

```txt
show formula at the top
show sliders for relevant parameters
draw graph on canvas
label x axis and y axis clearly
do not show 3D drag instructions
```

### 3D

Example:

```md
:::expression-visualizer
title: Parametric Surface
mode: 3d
formula: z = a · sin(bx + c) · cos(e y) + d
parameters:
  a: 1
  b: 1
  c: 0
  d: 0
  e: 1
range:
  x: [-3.14, 3.14]
  y: [-3.14, 3.14]
:::
```

Requirements:

```txt
show formula at the top
show sliders for relevant parameters
draw 3D surface on canvas
label x axis, y axis, z axis clearly
z axis should point upward on screen
drag canvas to rotate view
draw axes after the surface mesh so labels stay visible
```

The first version may use Canvas 2D projection instead of WebGL.

## 12. Parser and Renderer Files

Recommended files:

```txt
apps/desktop/src/content/note-block-parser.js
apps/desktop/src/components/note/NoteBlockRenderer.vue
apps/desktop/src/components/note/blocks/
  ConceptCardBlock.vue
  ProcessFlowBlock.vue
  CompareTableBlock.vue
  CodeExplainBlock.vue
  QuizBlock.vue
  ExpressionVisualizerBlock.vue
```

A simpler first version may keep several block renderers in one file if necessary, but parsing should remain separated from rendering.

## 13. Safety and Failure Behavior

```txt
invalid block syntax -> render fallback
unknown block -> render fallback
parser error -> do not crash NoteView
expression visualizer must not eval arbitrary JS
only supported formula families are allowed in first version
```

For expression visualizer, do not evaluate arbitrary user-provided code. Use fixed formula families controlled by `mode` and supported parameter names.

## 14. Not Included

Do not implement in the first content-block version:

```txt
rich-text editing
dragging/reordering note blocks
saving block AST
executing arbitrary JavaScript expressions
LaTeX engine
full Markdown spec parser if too large
AI block generation
spaced repetition scheduling
```
