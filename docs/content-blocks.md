# Content Blocks

## 1. Purpose

This document defines the first-version custom content blocks used inside `note.md`.

Plain Markdown is useful, but some knowledge is easier to understand through structured visual blocks.

Content blocks provide a richer way to represent:

- concept summaries
- process flows
- comparisons
- code explanations
- review questions

The format must remain:

```txt
human-readable
Git-friendly
AI-editable
safe to render
```

## 2. Basic Syntax

Use a simple block syntax inspired by MDC-style blocks.

```md
::block-name
key: value
list:
  - item
::
```

Example:

```md
::concept-card
title: 一句话理解
content: 渲染管线就是把三维世界一步步转换成屏幕像素的过程。
::
```

Inside the block, use YAML-like data.

## 3. First-Version Supported Blocks

First version supports only:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
```

Do not implement all possible blocks at once.

Future blocks may include:

```txt
formula-block
image-annotation
timeline
interactive-demo
shader-preview
```

## 4. Common Rendering Style

All content blocks should follow the app's visual system:

```txt
black background
white hard borders
solid domain accent markers
no glow
no blurred shadow
no soft gradients
technical panel style
```

Domain accent color may appear as:

- left border
- top marker
- small corner block
- label color
- line segment

Do not use large color fills.

## 5. Security Rules

Content blocks must be safe.

First-version parser rules:

```txt
Do not execute JavaScript from note.md.
Do not allow arbitrary HTML by default.
Do not support nested custom blocks.
If parsing fails, render the original raw block text.
```

## 6. `concept-card`

### Purpose

Use `concept-card` for concise summaries, core intuition, or one-sentence explanations.

### Syntax

```md
::concept-card
title: 一句话理解
content: 渲染管线就是把三维世界一步步转换成屏幕像素的过程。
::
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `title` | yes | Card title |
| `content` | yes | Main explanation |

### Recommended Rendering

```txt
Technical card
Left domain accent bar
Title label
Content body
```

### Usage Rule

A note should normally have one important `concept-card` near the top.

## 7. `process-flow`

### Purpose

Use `process-flow` to explain sequential stages.

### Syntax

```md
::process-flow
title: 渲染管线流程
steps:
  - 应用阶段
  - 顶点处理
  - 光栅化
  - 片元处理
  - 后处理
::
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `title` | no | Flow title |
| `steps` | yes | Ordered steps |

### Recommended Rendering

Render as:

```txt
rectangular modules
connected by hard-edge lines
horizontal on desktop
vertical on mobile
```

### Usage Rule

Use for processes, pipelines, state transitions, and learning order.

## 8. `compare-table`

### Purpose

Use `compare-table` to compare two or more concepts.

### Syntax

```md
::compare-table
title: PPO 和 SAC 的区别
columns:
  - PPO
  - SAC
rows:
  - item: 策略类型
    PPO: on-policy
    SAC: off-policy
  - item: 探索方式
    PPO: 依赖策略随机性
    SAC: 最大熵目标
::
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `title` | no | Table title |
| `columns` | yes | Compared items |
| `rows` | yes | Comparison rows |

### Recommended Rendering

Render as a hard-bordered table.

Use:

```txt
monochrome cells
domain accent as header marker
no soft shadows
```

### Usage Rule

Use when the goal is to compare tradeoffs, definitions, algorithms, or tools.

## 9. `code-explain`

### Purpose

Use `code-explain` to explain code snippets with line-level notes.

### Syntax

````md
::code-explain
title: any 的作用
language: glsl
code: |
  if (any(lessThan(cell, ivec3(0)))) {
      return false;
  }
points:
  - line: 1
    text: any 会检查布尔向量中是否至少有一个 true。
  - line: 2
    text: 如果 cell 任一分量小于 0，说明它在网格外。
::
````

### Fields

| Field | Required | Description |
|---|---:|---|
| `title` | no | Block title |
| `language` | yes | Code language |
| `code` | yes | Code body |
| `points` | no | Line-level explanations |

### Recommended Rendering

Render as:

```txt
code panel
line numbers
right or bottom explanation area
monospace font
high-contrast border
```

### Usage Rule

Use for shaders, algorithms, scripts, config files, and debugging notes.

## 10. `quiz`

### Purpose

Use `quiz` for active recall and review.

### Syntax

```md
::quiz
question: 为什么光栅化必须发生在顶点处理之后？
answer: 因为必须先得到屏幕空间中的三角形位置，才能判断它覆盖哪些像素。
hint: 想想顶点处理输出的是什么。
::
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `question` | yes | Review question |
| `answer` | yes | Answer |
| `hint` | no | Optional hint |

### Recommended Rendering

Desktop:

```txt
question card
click to reveal answer
optional hint
```

Mobile:

```txt
review-friendly collapsible card
large tap target
```

### Usage Rule

Every mature knowledge note should eventually include at least one `quiz`.

## 11. Parser Rules

First-version parser should:

```txt
scan note.md
detect custom block delimiters
parse block payload as YAML-like data
replace valid blocks with Vue components
render invalid blocks as plain code/text
```

Do not support:

```txt
nested blocks
arbitrary JavaScript
remote code execution
HTML script tags
custom user-defined components
```

## 12. Fallback Behavior

If a block fails to parse:

```txt
show raw block content
show a small parse warning in desktop app
do not break the whole note page
```

Viewer should fail gracefully.

## 13. Mobile Rendering Rules

Mobile viewer should render blocks in a reading-first way.

Rules:

```txt
process-flow becomes vertical
compare-table may scroll horizontally
code-explain wraps explanation below code
quiz uses large tap area
content-card remains compact
```

## 14. Relation to `meta.yaml`

Content blocks should not duplicate metadata.

Do not put these only inside note blocks:

```txt
id
domain
status
summary
prerequisites
related
```

These belong in `meta.yaml`.

`note.md` can explain them, but metadata source of truth remains `meta.yaml`.

## 15. Relation to `graph.yaml`

Content blocks should not define graph edges.

Do not use content blocks to create relations.

Wrong:

```md
::relation
from: shader
to: pbr
relation: depends-on
::
```

Correct:

```txt
Put relations in graph.yaml.
Use note.md to explain the relation if needed.
```

## 16. First-Version Implementation Priority

Implement in this order:

```txt
1. concept-card
2. quiz
3. process-flow
4. code-explain
5. compare-table
```

Reason:

- `concept-card` is easy and useful.
- `quiz` supports review.
- `process-flow` supports technical explanations.
- `code-explain` helps programming notes.
- `compare-table` is useful but needs more layout work.

## 17. Summary

Content blocks provide structured expression inside `note.md`.

First version supports:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
```

They should remain:

```txt
plain-text editable
Git-friendly
AI-editable
safe to render
consistent with hard-edged technical UI
```
