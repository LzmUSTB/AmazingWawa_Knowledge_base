# Package and Relation Guide

## manifest.yaml

```yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
title: Human readable title
description: Short description
status: seed
language: zh-CN
preview:
  mode: in-app
  generatedHtmlPreview: false
```

For packages with JavaScript-rich HTML notes, include:

```yaml
htmlPolicy:
  allowJavaScript: true
  assetMode: source-snapshot-assets-first
  generatedImagesAllowed: false
  sourceBlocksRequired: conditional
```

## Generated node file requirements

For every `add_node`, include:

```text
generated/content/<domain>/<node-id>/meta.yaml
```

For `contentFormat: markdown`, include:

```text
generated/content/<domain>/<node-id>/note.md
```

For `contentFormat: html`, include:

```text
generated/content/<domain>/<node-id>/note.html
```

For `contentFormat: none`, omit both note files.

`meta.yaml` must include an English/canonical title and may include locale fields:

```yaml
id:
title: English or canonical technical title
titleLocale: Locale title when available; recommended but not required
domain:
type:
status:
summary: English or canonical one-sentence summary
summaryLocale: Locale summary when available; recommended but not required
contentFormat: markdown | html | none
aliases: []
tags: []
sourceIds: []
createdAt:
updatedAt:
```

For `contentFormat: none`, omit both `note.md` and `note.html`. Do not create blank note files.

Strict match required:

- `meta.id` must equal `node.id`
- `meta.title` must equal `node.title`
- `meta.titleLocale` must equal `node.titleLocale` when `node.titleLocale` is provided
- `meta.domain` must equal `node.domain`
- `meta.type` must equal `node.type`
- `meta.status` must equal `node.status`
- `meta.contentFormat` must equal `node.contentFormat` when provided

## Canonical operation shapes

### add_node

Use nested `node:` form for `add_node`. The top-level `type` is the operation type only. The knowledge node type must be placed at `node.type`.

Correct:

```yaml
- type: add_node
  node:
    id: sampling-and-aliasing
    title: Sampling and Aliasing
    titleLocale: 采样与走样
    domain: computer-graphics
    type: concept
    status: seed
    summary: How continuous signals become discrete samples and produce aliasing artifacts.
    summaryLocale: 连续信号离散化后如何产生走样现象。
    contentFormat: html
    aliases: []
    tags: []
  parentId: cg-digital-graphics-basic
```

Correct empty node:

```yaml
- type: add_node
  node:
    id: future-rendering-topic
    title: Future Rendering Topic
    titleLocale: 未来的渲染主题
    domain: computer-graphics
    type: topic
    status: seed
    summary: Placeholder node for a future rendering topic.
    summaryLocale: 用于未来渲染主题的占位节点。
    contentFormat: none
  parentId: computer-graphics
```

Forbidden:

```yaml
- id: sampling-and-aliasing
  title: Sampling and Aliasing
  type: add_node
  domain: computer-graphics
```

Forbidden because it duplicates the YAML key `type` at one level:

```yaml
- type: add_node
  id: sampling-and-aliasing
  type: concept
```

If a flat compatibility form is required, use `nodeType` for the knowledge type and keep top-level `type: add_node` as the operation type:

```yaml
- type: add_node
  id: sampling-and-aliasing
  title: Sampling and Aliasing
  titleLocale: 采样与走样
  domain: computer-graphics
  nodeType: concept
  status: seed
  summary: How continuous signals become discrete samples and produce aliasing artifacts.
  summaryLocale: 连续信号离散化后如何产生走样现象。
  contentFormat: html
  parentId: cg-digital-graphics-basic
```

### add_domain

Use nested `domain:` form when creating domains:

```yaml
- type: add_domain
  domain:
    id: computer-graphics
    title: Computer Graphics
    titleLocale: 计算机图形学
    description: Digital image formation, geometry, rendering, and visual computation.
    descriptionLocale: 数字图像形成、几何、渲染与视觉计算。
    color: "#00b7ff"
    order: 10
```

`titleLocale`, `summaryLocale`, and `descriptionLocale` are recommended when a natural target-locale phrase exists, but they are not mandatory. Do not invent awkward locale text just to fill the field.

### add_edge

Use flat `add_edge` operations only:

```yaml
- type: add_edge
  from: source-node-id
  to: target-node-id
  relation: depends-on
  reason: why this relationship is useful
```

Nested `edge:` objects are forbidden.

## Domain rules

If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`.

If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.

## Source block attribution rule

Do not force every HTML note to contain a source block.

Use a source block only when the note actually references original/source/network material, including:

- direct original images, videos, iframes, or source snapshot resources;
- local copied source media under `assets/original/`, `assets/source/`, `assets/source-assets/`, or `assets/source-snapshot/`;
- close paraphrases or claims derived from a source;
- external documentation, paper, article, or reference links used as evidence.

A CSS class definition, bibliography heading, or generic source list is not enough when source material is actually used; add a nearby literal element:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://example.com/article" target="_blank" rel="noreferrer">Original article</a>
  <span>Location: section title / figure number / demo name</span>
</aside>
```

If a note is original explanation and does not cite or embed source/network material, do not add a source block just to satisfy a template.

## Relation semantics

Relation types are frozen:

- `contains`
- `depends-on`
- `used-in`
- `compares-with`

Do not create new relation types.

### contains

Hierarchy only. Usually generated by `parentId`. Do not manually add with `add_edge`.

### depends-on

`A depends-on B` means understanding B helps understand A.

Direction matters.

Example:

```text
thin-lens-and-focus depends-on refraction-and-snell-law
```

### used-in

`A used-in B` means A is a technique/component/concept used inside B.

Example:

```text
pinhole-camera-geometry used-in camera-projection
```

### compares-with

A and B are alternatives, contrasts, or related concepts that answer similar questions.

## Relation quality rules

Do not create edges just because two concepts appeared in the same article.

Every non-contains relation should be explainable in one sentence.

## Archive entry and asset path rules

Temporary validation files must not be packaged:

```text
review/js-check/*.js
review/js-check/*.mjs
review/**/*.ts
review/**/*.tsx
```

If JavaScript syntax check results need to be preserved, write a text report instead:

```text
review/js-syntax-check.md
review/js-syntax-check.yaml
```

Runtime JavaScript belongs either inline in `note.html` or under node-local assets:

```text
generated/content/<domain>/<node-id>/assets/js/<file>.js
```

For HTML rich notes, local media files must use one of the source-marked roots:

```text
assets/original/<file>
assets/source/<file>
assets/source-assets/<file>
assets/source-snapshot/<source-id>/<file-or-_resources-path>
```

Forbidden in HTML rich notes:

```text
assets/foo.png
assets/foo.jpg
assets/foo.mp4
```

Package the corresponding files under:

```text
generated/content/<domain>/<node-id>/assets/source-assets/<file>
```

Every packaged asset under `generated/content/<domain>/<node-id>/assets/**` must be referenced by that node's `note.html` or `note.md`, unless it is source-snapshot infrastructure. Do not include unused copied images. If a source asset is inventoried but not used, set `required: false` or provide `omitted_reason`.

## Source asset review files

Packages based on visual or interactive sources must include:

```text
review/source-coverage-plan.md
review/source-asset-manifest.md
review/interactive-demo-coverage.md
```

`review/source-asset-manifest.md` must contain a fenced YAML block whose top-level key is `source_assets`. A human-readable bullet list alone is not sufficient.

Example:

```yaml
source_assets:
  - id: cg-1-basic-source-snapshot
    type: source-snapshot
    source_url: https://example.com/cg-1
    source_location: full source snapshot
    required: true
    represented_in_node: cg-digital-graphics-basic
    note_location: whole note
    snapshot_path: assets/source-snapshot/cg-1-basic/index.html
    snapshot_assets_used: []
    unavailable_reason: The source has no required standalone media; explanatory canvas sections are supplementary.
    preservation_strategy: source-link + supplementary-js-reproduction
```

Source-rich or snapshot-backed packages should also include:

```text
review/source-runtime-porting-notes.md
review/visual-contrast-audit.md
review/learner-facing-language-audit.md
review/content-sufficiency-audit.md
```
