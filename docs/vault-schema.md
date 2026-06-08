# Vault Schema

## 1. Purpose

This document defines the first-version schema for the knowledge vault.

The vault is the source of truth for the entire knowledge system.

Apps should read from and write to the vault, but the knowledge data itself must remain plain files that are easy to inspect, edit, diff, and version through Git.

```txt
vault = source of truth
desktop app = maintenance tool
viewer app = reading tool
Git = version history
ChatGPT / Codex = assisted maintenance
```

## 2. Core Principles

The vault must satisfy these requirements:

1. Human-readable
2. Git-friendly
3. AI-editable
4. Easy to parse
5. Stable over time
6. Public-first by default
7. Suitable for desktop maintenance and mobile viewing

The vault should not depend on a database as the source of truth.

Databases or indexes may be generated later, but they are caches only.

```txt
Source of truth = files
Cache = generated data
```

## 3. Recommended Vault Structure

```txt
vault/
├─ vault.yaml
├─ domains.yaml
├─ graph.yaml
├─ graph-layout.yaml
│
├─ content/
│  ├─ inbox/
│  ├─ graphics/
│  │  ├─ rendering-pipeline/
│  │  │  ├─ meta.yaml
│  │  │  ├─ note.md
│  │  │  └─ assets/
│  │  ├─ shader/
│  │  └─ pbr/
│  │
│  ├─ machine-learning/
│  ├─ web-dev/
│  ├─ game-dev/
│  ├─ simulation/
│  ├─ language/
│  └─ career/
│
├─ assets/
│  ├─ shared/
│  ├─ images/
│  ├─ diagrams/
│  └─ exports/
│
├─ templates/
│  ├─ concept/
│  │  ├─ meta.yaml
│  │  └─ note.md
│  ├─ project/
│  ├─ paper/
│  └─ tool/
│
└─ archive/
```

## 4. File Responsibilities

### 4.1 `vault.yaml`

Global vault configuration.

Example:

```yaml
schemaVersion: 1
title: AmazingWawa Knowledge Base
description: Local-first knowledge graph vault.
language: zh-CN
defaultDomain: graphics
createdAt: 2026-06-08
updatedAt: 2026-06-08

app:
  defaultView: graph
  restoreLastSession: true

policy:
  publicFirst: true
  allowPrivateNotes: false
```

Responsibilities:

- schema version
- vault title
- vault description
- default language
- default domain
- app behavior defaults
- public/private policy

First-version rule:

```txt
`vault.yaml` should exist.
The desktop app should validate it when opening a vault.
```

### 4.2 `domains.yaml`

Defines top-level knowledge domains.

Example:

```yaml
domains:
  - id: graphics
    title: 图形学
    description: 渲染、Shader、PBR、材质、后处理、流体渲染等知识。
    color: "#00B7FF"
    order: 10

  - id: machine-learning
    title: 机器学习
    description: 机器学习、强化学习、优化方法和实验记录。
    color: "#C8FF00"
    order: 20

  - id: web-dev
    title: Web 开发
    description: Nuxt、Vue、Astro、部署、SEO、前端工程。
    color: "#FF2BD6"
    order: 30
```

Required fields:

| Field | Required | Description |
|---|---:|---|
| `id` | yes | Stable domain ID |
| `title` | yes | Display title |
| `description` | yes | Short domain description |
| `color` | yes | Solid accent color |
| `order` | yes | UI ordering |

Domain ID rules:

- lowercase English
- kebab-case
- globally stable
- used in paths and graph references

### 4.3 `graph.yaml`

Stores semantic graph relations only.

It must not store visual layout.

Example:

```yaml
edges:
  - from: graphics
    to: rendering-pipeline
    relation: contains

  - from: rendering-pipeline
    to: shader
    relation: depends-on

  - from: shader
    to: fluid-rendering
    relation: used-in

  - from: ppo
    to: sac
    relation: compares-with
```

Allowed relation types:

```txt
contains
depends-on
used-in
compares-with
```

Responsibilities:

- semantic relationship
- graph navigation
- concept dependency
- cross-domain relation

Not responsible for:

- node position
- line route
- PCB trace points
- view state
- zoom or pan

### 4.4 `graph-layout.yaml`

Stores visual graph layout.

This file is separate from `graph.yaml`.

Purpose:

```txt
graph.yaml = semantic relation
graph-layout.yaml = visual position and PCB route
```

Example:

```yaml
layouts:
  root:
    nodes:
      graphics:
        x: 320
        y: 240
        w: 180
        h: 80

      machine-learning:
        x: 720
        y: 240
        w: 200
        h: 80

    routes:
      root-graphics-machine-learning:
        points:
          - [500, 280]
          - [620, 280]
          - [620, 280]
          - [720, 280]

  graphics:
    nodes:
      graphics:
        x: 960
        y: 720
        w: 200
        h: 96

      rendering-pipeline:
        x: 520
        y: 420
        w: 200
        h: 80
```

First-version rule:

```txt
`graph-layout.yaml` may be optional during early prototype.
If absent, the app can use generated default layout.
```

Long-term rule:

```txt
User-adjusted graph positions and PCB trace routes should be saved here.
```

## 5. Knowledge Item Structure

Each knowledge item is a folder.

```txt
vault/content/<domain>/<concept-id>/
├─ meta.yaml
├─ note.md
└─ assets/
```

Example:

```txt
vault/content/graphics/rendering-pipeline/
├─ meta.yaml
├─ note.md
└─ assets/
   ├─ pipeline.png
   └─ rasterization.svg
```

Reasons:

- keeps metadata, note, and assets together
- easy to edit manually
- easy to diff in Git
- easy for ChatGPT/Codex to understand
- easy to extend later with demos or attachments

## 6. `meta.yaml`

`meta.yaml` stores machine-readable metadata.

### 6.1 Minimal Example

```yaml
id: rendering-pipeline
title: 渲染管线
domain: graphics
type: concept
status: growing
summary: 把三维场景转换成屏幕像素的一系列处理阶段。

createdAt: 2026-06-08
updatedAt: 2026-06-08

tags:
  - graphics
  - rendering
  - shader

prerequisites:
  - coordinate-transform

related:
  - shader
  - pbr
```

### 6.2 Required Fields

| Field | Required | Description |
|---|---:|---|
| `id` | yes | Globally unique ID |
| `title` | yes | Display title |
| `domain` | yes | Domain ID |
| `type` | yes | Knowledge item type |
| `status` | yes | Knowledge status |
| `summary` | yes | One-sentence summary |

### 6.3 Recommended Fields

| Field | Required | Description |
|---|---:|---|
| `createdAt` | recommended | Creation date |
| `updatedAt` | recommended | Last update date |
| `tags` | recommended | Search and grouping |
| `prerequisites` | recommended | Prerequisite concept IDs |
| `related` | recommended | Related concept IDs |

### 6.4 Optional Future Fields

These fields are not required in the first version:

```yaml
difficulty: intermediate
source:
  - title: Example Source
    url: https://example.com
review:
  priority: normal
  lastReviewedAt: null
  nextReviewAt: null
externalAssets:
  - label: Demo video
    path: external://videos/demo.mp4
```

Do not add these fields unless needed.

## 7. `type` Values

Allowed first-version values:

```txt
domain
topic
concept
skill
project
tool
paper
question
note
```

Recommended usage:

| Type | Usage |
|---|---|
| `domain` | Top-level field, such as graphics |
| `topic` | Subfield or larger topic |
| `concept` | Specific concept |
| `skill` | Practical skill |
| `project` | Project note |
| `tool` | Tool or software |
| `paper` | Paper reading note |
| `question` | Question-driven note |
| `note` | General note |

First-version priority:

```txt
domain
topic
concept
project
tool
```

## 8. `status` Values

Allowed values:

```txt
seed
growing
evergreen
deprecated
archive
```

Meaning:

| Status | Meaning |
|---|---|
| `seed` | Newly created, not organized |
| `growing` | Being developed |
| `evergreen` | Mature and stable |
| `deprecated` | Outdated |
| `archive` | Archived, not actively maintained |

Default for new knowledge item:

```yaml
status: seed
```

## 9. ID Rules

ID must be:

- lowercase English
- kebab-case
- globally unique
- stable over time
- safe for file paths
- independent from display title

Good examples:

```txt
rendering-pipeline
gradient-descent
soft-actor-critic
fluid-simulation-tool
cloudflare-pages
```

Bad examples:

```txt
渲染管线
Rendering Pipeline
rendering_pipeline
rendering pipeline
new-note-1
```

Display title may be Chinese:

```yaml
id: rendering-pipeline
title: 渲染管线
```

## 10. Title Rules

`title` is for display.

Rules:

- can be Chinese, Japanese, or English
- can contain spaces
- does not need to be globally unique
- should be concise
- should remain stable if possible

`id` must be unique.

`title` may repeat.

## 11. `note.md`

`note.md` stores human-readable explanation.

Recommended default structure:

```md
# 渲染管线

## 一句话定义

渲染管线是把三维场景转换成二维图像的一系列处理阶段。

## 它解决什么问题？

## 核心直觉

## 正式解释

## 最小例子

## 常见误区

## 相关知识

## 复习问题
```

## 12. Rich Content Blocks

Markdown alone may not be expressive enough.

Use custom blocks for structured explanation.

First-version supported blocks:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
```

Example:

```md
::concept-card
title: 一句话理解
content: 渲染管线就是把三维世界一步步转换成屏幕像素的过程。
::

::process-flow
steps:
  - 应用阶段
  - 顶点处理
  - 光栅化
  - 片元处理
  - 后处理
::

::quiz
question: 为什么光栅化必须发生在顶点处理之后？
answer: 因为必须先得到屏幕空间中的三角形位置，才能判断它覆盖哪些像素。
::
```

Future blocks:

```txt
formula-block
image-annotation
timeline
interactive-demo
shader-preview
```

Do not implement all blocks at once.

## 13. Assets

### 13.1 Item-Specific Assets

Place assets that belong to one knowledge item under that item's `assets/`.

Example:

```txt
vault/content/graphics/rendering-pipeline/assets/pipeline.png
```

Suitable for:

- diagrams
- screenshots
- local SVGs
- small demo data
- small code snippets related only to this note

### 13.2 Shared Assets

Place shared assets under:

```txt
vault/assets/shared/
vault/assets/images/
vault/assets/diagrams/
```

Suitable for:

- global icons
- diagrams reused by multiple notes
- generated screenshots
- shared visual assets

### 13.3 Large Assets

Do not commit large local-only assets.

Avoid committing:

- large videos
- raw recordings
- datasets
- checkpoints
- large PSD / blend files
- compressed archives

Use external references instead:

```yaml
externalAssets:
  - label: Demo video
    path: external://videos/rendering-pipeline-demo.mp4
```

## 14. Inbox

`inbox/` is for unorganized notes.

Example:

```txt
vault/content/inbox/2026-06-08-rendering-note/
├─ meta.yaml
└─ note.md
```

Inbox note metadata:

```yaml
id: 2026-06-08-rendering-note
title: Rendering note draft
domain: inbox
type: note
status: seed
summary: Temporary note to be organized later.
```

Inbox rules:

- use only for temporary collection
- review regularly
- move useful notes to formal domains
- delete or archive unused notes

## 15. Archive

First-version decision:

```txt
Do not move archived notes by default.
Set `status: archive` instead.
```

Reason:

- moving files changes paths
- path changes make references harder to maintain
- Git history becomes harder to read
- graph links may break if tooling is incomplete

Future behavior may support moving archived content to:

```txt
vault/archive/
```

## 16. Templates

Templates should exist for different knowledge item types.

Recommended structure:

```txt
vault/templates/
├─ concept/
│  ├─ meta.yaml
│  └─ note.md
├─ project/
│  ├─ meta.yaml
│  └─ note.md
├─ paper/
│  ├─ meta.yaml
│  └─ note.md
└─ tool/
   ├─ meta.yaml
   └─ note.md
```

New note creation should copy from the template matching `type`.

First-version required templates:

```txt
concept
project
tool
```

## 17. Public-First Policy

This vault is public-first.

Allowed content:

- technical notes
- learning notes
- public project summaries
- paper notes
- public portfolio explanations
- general interview preparation
- reusable study materials

Forbidden content:

- private emails
- certificates
- transcripts
- contracts
- personal identification documents
- company-specific interview details
- confidential work materials
- unpublished business information

Rule:

```txt
If a note contains private or sensitive information, do not put it in this vault.
```

## 18. First-Version App Requirements

The first desktop version should support:

- read `vault.yaml`
- read `domains.yaml`
- read `graph.yaml`
- read `graph-layout.yaml` if it exists
- scan `content/*/*/meta.yaml`
- read `note.md`
- show file tree
- show graph
- open note
- edit `note.md`
- create knowledge item
- create graph edge

The first version may skip:

- full meta.yaml visual editor
- complex asset manager
- template picker UI
- external asset manager
- automatic archive movement
- multi-vault management
- real-time sync

## 19. Validation Rules

Minimum validation when opening a vault:

```txt
vault.yaml exists
domains.yaml exists
graph.yaml exists
content/ exists
```

Minimum validation for each knowledge item:

```txt
meta.yaml exists
note.md exists
meta.id exists
meta.title exists
meta.domain exists
meta.type exists
meta.status exists
meta.summary exists
```

Graph validation:

```txt
all edge.from IDs exist
all edge.to IDs exist
all relation values are allowed
no duplicate edge with same from/to/relation
```

ID validation:

```txt
id is kebab-case
id is globally unique
id matches folder name where possible
```

## 20. Summary

Final first-version vault model:

```txt
vault/
├─ vault.yaml              global vault config
├─ domains.yaml            domain definitions
├─ graph.yaml              semantic graph relations
├─ graph-layout.yaml       visual graph layout and PCB routes
├─ content/                knowledge items
├─ assets/                 shared assets
├─ templates/              note templates
└─ archive/                future archived content
```

Each knowledge item:

```txt
meta.yaml = machine-readable metadata
note.md = human-readable explanation
assets/ = item-specific resources
```

Graph files:

```txt
graph.yaml = what is related
graph-layout.yaml = where it is placed and how traces route
```
