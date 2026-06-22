# Wawa Package Schema

A `.wawapkg` is a ZIP-compatible archive. `patch.yaml` must be a YAML object with an `operations` array; a top-level array is invalid.

## Shared package files

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
review/
```

### mimetype

```text
application/x-wawa-kb-ai-import-package
```

### manifest.yaml

```yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-20260622-linear-algebra
title: Linear Algebra Import
description: Adds a reviewed linear algebra node.
status: seed
language: zh-CN
preview:
  mode: in-app
  generatedHtmlPreview: false
```

### sources.yaml

```yaml
sources:
  - id: author-plan
    title: User-approved architecture plan
    source_type: user-plan
    language: zh-CN
```

## Minimal empty-node package

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/content/mathematical-foundations/linear-algebra/meta.yaml
review/import-plan.md
```

```yaml
# patch.yaml
operations:
  - type: add_node
    node:
      id: linear-algebra
      title: Linear Algebra
      titleLocale: 线性代数
      domain: mathematical-foundations
      type: topic
      status: seed
      summary: Vector spaces, linear maps, matrices, eigenvalues, and related structures.
      summaryLocale: 研究向量空间、线性映射、矩阵、特征值及相关结构。
      contentFormat: none
    parentId: mathematical-foundations
```

```yaml
# generated/content/mathematical-foundations/linear-algebra/meta.yaml
id: linear-algebra
title: Linear Algebra
titleLocale: 线性代数
domain: mathematical-foundations
type: topic
status: seed
summary: Vector spaces, linear maps, matrices, eigenvalues, and related structures.
summaryLocale: 研究向量空间、线性映射、矩阵、特征值及相关结构。
contentFormat: none
aliases: []
tags: []
sourceIds: []
```

`contentFormat: none` means no `note.md` and no `note.html`.

## Markdown-note package

Use the same package root, set `contentFormat: markdown`, and include both:

```text
generated/content/mathematical-foundations/vector-space/meta.yaml
generated/content/mathematical-foundations/vector-space/note.md
```

The metadata must match the `add_node` operation exactly. `note.md` may use Markdown, LaTeX, and supported native content blocks.

## HTML-note package

Set `contentFormat: html` and include:

```text
generated/content/optics/pinhole-camera/meta.yaml
generated/content/optics/pinhole-camera/note.html
generated/content/optics/pinhole-camera/assets/source-assets/diagram.png
review/source-coverage-plan.md
review/source-asset-manifest.md
review/interactive-demo-coverage.md
```

Every packaged asset must be referenced by the note. HTML review files are required by the current validator for source-rich HTML packages.

## ExerciseSet package

An ExerciseSet artifact uses the owner node path:

```text
generated/content/mathematical-foundations/linear-algebra/exercises.yaml
```

Its contents must follow `EXERCISE_SCHEMA.md`. Use this only when the user explicitly requests an ExerciseSet package workflow; otherwise produce one reviewed `exercises.yaml` for the target node.

## add_edge example

```yaml
operations:
  - type: add_edge
    from: linear-map
    to: vector-space
    relation: depends-on
    reason: Linear maps are defined on vector spaces.
```

`add_edge` is flat. Do not nest an `edge` object. Use `parentId` for structural `contains` relations.
