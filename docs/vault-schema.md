# Vault Schema

## 1. Purpose

This document defines the current schema for the knowledge vault.

The vault is the source of truth for the entire knowledge system. Apps may read from and write to it, but the data must remain plain files that are easy to inspect, edit, diff, and version through Git.

```txt
vault = source of truth
desktop app = maintenance tool
viewer app = reading tool
Git = version history
ChatGPT / Codex = assisted maintenance
```

## 1.1 Current Implementation Stage

Current desktop behavior:

```txt
desktop-vault-adapter.js = desktop file access boundary
static-vault-loader.js = repository sample fallback
note.md save = real disk write
New Note = real creation workflow
New Link = prototype-only, no graph.yaml write yet
Layout Edit Mode = next implementation stage
```

The desktop app may currently write:

```txt
vault/content/<domain>/<id>/note.md
vault/content/<domain>/<id>/meta.yaml
vault/content/<domain>/<id>/assets/
vault/graph.yaml
```

`graph.yaml` is only written by New Note creation to append one `contains` edge from parent to new node.

The desktop app must not write `graph-layout.yaml` until Layout Edit Mode is implemented.

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

### 4.2 `domains.yaml`

Defines top-level knowledge domains.

```yaml
schemaVersion: 1

domains:
  - id: graphics
    title: 图形学
    description: 渲染、Shader、PBR、材质、后处理、流体渲染等知识。
    color: "#00B7FF"
    order: 10
```

Required fields: `id`, `title`, `description`, `color`, `order`.

Domain ID rules: lowercase English, kebab-case, globally stable, used in paths and graph references.

### 4.3 `graph.yaml`

Stores semantic graph relations only. It does not store node positions, route points, zoom, pan, selection, or visual styling.

```yaml
schemaVersion: 1

edges:
  - id: graphics-contains-rendering-pipeline
    from: graphics
    to: rendering-pipeline
    relation: contains

  - id: rendering-pipeline-depends-on-shader
    from: rendering-pipeline
    to: shader
    relation: depends-on
```

Allowed relation types:

```txt
contains
depends-on
used-in
compares-with
```

New Note creation appends exactly one `contains` edge:

```yaml
- id: <parentId>-contains-<newNodeId>
  from: <parentId>
  to: <newNodeId>
  relation: contains
```

Cross-domain knowledge relationships must not be represented by `contains`. Use New Link later with `depends-on`, `used-in`, or `compares-with`.

### 4.4 `graph-layout.yaml`

Stores visual graph layout.

```txt
graph.yaml = semantic relation
graph-layout.yaml = visual board layout
```

Recommended structure:

```yaml
schemaVersion: 1

boards:
  root:
    width: 2400
    height: 1600
    grid: 32

    nodes:
      graphics:
        x: 320
        y: 240
        w: 180
        h: 80

    routes:
      graphics-compares-with-machine-learning:
        edge: graphics-compares-with-machine-learning
        fromPort: right
        toPort: left
        points:
          - [500, 280]
          - [620, 280]
          - [620, 280]
          - [720, 280]
```

First layout editing version:

```txt
Save user-adjusted board.nodes only.
Do not save generated route points.
routes are optional manual overrides.
Generated orthogonal routes are recalculated from node positions.
```

`graph-layout.yaml` may be optional. If absent or incomplete, the app uses deterministic generated layout and generated orthogonal routes.

## 5. Knowledge Item Structure

Each knowledge item is a folder.

```txt
vault/content/<domain>/<concept-id>/
├─ meta.yaml
├─ note.md
└─ assets/
```

## 6. `meta.yaml`

`meta.yaml` stores machine-readable metadata.

```yaml
id: rendering-pipeline
title: 渲染管线
domain: graphics
type: topic
status: growing
summary: 把三维场景转换成屏幕像素的一系列处理阶段。
createdAt: 2026-06-08
updatedAt: 2026-06-08
tags:
  - graphics
prerequisites: []
related: []
```

Required fields: `id`, `title`, `domain`, `type`, `status`, `summary`.

## 7. `type` Values

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

## 8. `status` Values

```txt
seed
growing
evergreen
deprecated
archive
```

Default for new knowledge item:

```yaml
status: seed
```

## 9. ID Rules

ID must be lowercase English, kebab-case, globally unique, stable, safe for file paths, and independent from display title.

Good examples:

```txt
rendering-pipeline
gradient-descent
soft-actor-critic
```

Bad examples:

```txt
渲染管线
Rendering Pipeline
rendering_pipeline
rendering pipeline
```

## 10. `note.md`

`note.md` stores human-readable explanation.

Recommended default structure:

```md
# 渲染管线

## 一句话定义

## 它解决什么问题？

## 核心直觉

## 正式解释

## 最小例子

## 常见误区

## 相关知识

## 复习问题
```

## 11. Rich Content Blocks

First-version supported blocks:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
```

Do not implement all blocks at once.

## 12. Assets

Place assets that belong to one knowledge item under that item's `assets/`.
