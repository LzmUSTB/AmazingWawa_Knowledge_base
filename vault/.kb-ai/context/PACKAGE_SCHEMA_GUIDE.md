# Wawa Package Schema Guide

## manifest.yaml

```yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
status: seed
preview:
  mode: in-app
  generatedHtmlPreview: false
```

## add_node

```yaml
- type: add_node
  node:
    id: curl-noise
    title: Curl Noise
    domain: computer-graphics
    type: concept
    status: growing
    summary: One sentence summary.
    contentFormat: html # markdown | html | none
  parentId: computer-graphics
```

Every add_node must include generated meta:

```text
generated/content/<domain>/<node-id>/meta.yaml
```

The generated meta must include and strictly match patch.yaml:

```yaml
id: curl-noise
title: Curl Noise
domain: computer-graphics
type: concept
status: growing
summary: One sentence summary.
contentFormat: html
aliases: []
tags: []
sourceIds: []
```

If `contentFormat: markdown`, include `note.md`.

If `contentFormat: html`, include `note.html` and follow `HTML_RICH_NOTE_GUIDE.md`.

If `contentFormat: none`, do not include note.md or note.html; this creates a graph-visible empty node.

Allowed add_edge relations: depends-on, used-in, compares-with. Do not use contains in add_edge; parentId creates contains.

## Assets

Markdown notes use packaged local assets only.

HTML notes may use packaged local assets or stable public HTTPS source assets.

Do not include executable/source files. `note.html` is allowed only as the canonical content file for an HTML note.
