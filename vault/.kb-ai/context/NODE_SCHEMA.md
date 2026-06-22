# Node Schema

## Path and id

Node files live under `content/<domain>/<node-id>/`. IDs use lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

## meta.yaml

```yaml
id: vector-space
title: Vector Space
titleLocale: 向量空间
domain: mathematical-foundations
type: concept
status: growing
summary: A set equipped with vector addition and scalar multiplication satisfying the vector-space axioms.
summaryLocale: 配备向量加法与数乘并满足向量空间公理的集合。
contentFormat: markdown
aliases: []
tags: []
sourceIds: []
```

Allowed node types: `topic`, `concept`, `skill`, `project`, `tool`, `paper`, `question`, `note`.

Allowed statuses: `seed`, `growing`, `evergreen`, `deprecated`, `archive`.

Allowed content formats: `markdown`, `html`, `none`.

- `markdown` requires `note.md`.
- `html` requires `note.html`.
- `none` forbids both note files and is used for graph placeholders.

`title` is required and should be English or canonical technical English. `titleLocale` is recommended but not required. The same rule applies to `summary` and `summaryLocale`. Never invent awkward locale text merely to fill an optional field.
