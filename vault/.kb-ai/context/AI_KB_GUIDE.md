# Wawa Knowledge Base AI Guide

## Final output

Final user-facing output must be a single `.wawapkg` file.

A `.wawapkg` is a ZIP-compatible archive. The archive root must contain:

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
block-types/
review/
```

The `mimetype` file must contain exactly:

```text
application/x-wawa-kb-ai-import-package
```

## Primary goal

Create knowledge pages that are at least as clear as the source material and preferably clearer.

Do not compress a high-quality tutorial, visual explanation, or interactive article into a short summary. Preserve the source's strongest teaching devices: images, videos, animations, interaction rhythm, original variables, source runtime behavior, figure-caption explanations, and review structure.

The AI may reorganize, expand, annotate, add explanations, add interactions, and improve the teaching sequence. The AI must not make the result weaker, shorter in substance, less visual, or less interactive than the original source.

## Rule priority

When rules conflict:

1. `RULE_PRIORITY.yaml`
2. `AI_CONTEXT.yaml`
3. The strict rules in this guide
4. `SOURCE_TO_NOTE_GUIDE.md`
5. `PACKAGE_AND_RELATION_GUIDE.md`
6. `NOTE_AND_BLOCK_GUIDE.md`
7. `NOTE_QUALITY_RUBRIC.md`
8. Dynamic indexes

Newer source-snapshot and source-porting rules override older iframe-oriented wording.

## Required planning

Before writing package files, create a plan and include it in `review/import-plan.md`:

1. source scope,
2. source teaching structure,
3. source asset and interactive demo inventory,
4. knowledge extraction,
5. candidate nodes and rejected nodes,
6. relation plan,
7. note format decision: `markdown`, `html`, or `none`,
8. asset preservation and porting plan,
9. quality self-check.

## Content format decision

Use `contentFormat: markdown` and `note.md` for compact structured notes.

Use `contentFormat: html` and `note.html` for tutorial/article pages, figure-heavy notes, source-asset-heavy notes, and any source whose clarity depends on visual flow or interactive demonstrations.

Use `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.

For `contentFormat: none`, create `meta.yaml` only. Do not generate `note.md`, `note.html`, or a blank note file.


## Empty node policy

Empty nodes are allowed. Use them for graph structure, future notes, prerequisites, or concepts that should appear as relations but do not need a note yet.

Rules:

```yaml
contentFormat: none
```

- Do not create a blank `note.md`.
- Do not create a blank `note.html`.
- Still create `generated/content/<domain>/<node-id>/meta.yaml`.
- Still create relations with `parentId` and normal relation operations where useful.

## Locale title policy

Always include an English/canonical `title`.

Also include `titleLocale` when a natural target-locale title is available. It is recommended but not mandatory.

Likewise:

- `summary` is English/canonical when possible.
- `summaryLocale` is recommended when a target-locale explanation is available.

Do not romanize Chinese as `Xiao Kong Xiang Ji`. Use real locale text:

```yaml
title: Pinhole Camera
titleLocale: 小孔相机
summary: Image formation through a small aperture.
summaryLocale: 通过极小开口限制入射方向形成图像。
```

## Learner-facing voice

The final note must teach directly. It must not read like a report about implementation, source snapshots, locale compliance, or AI behavior.

Forbidden learner-facing phrases include:

- `strictly ported`
- `source-ported`
- `source snapshot`
- `原 snapshot`
- `根据 snapshot`
- `按照 zh-CN`
- `保留原交互结构`
- `严格移植的交互式笔记`

Implementation details belong in `review/`, not in note body.

Use:

```text
小孔相机的核心是...
当 aperture 变大时...
这个交互演示说明...
```

Do not use:

```text
原文中说...
这篇文章提到...
作者在这里表示...
```

## Locale policy

Use the target locale for explanations, section titles, captions, review questions, and answers.

Locale priority:

1. `manifest.yaml.language`,
2. `AI_CONTEXT.yaml.vault.language`,
3. source language,
4. `zh-CN` fallback.

Keep precise English technical terms when they are more accurate, but explain them in the target locale.

## Package validation contract

These are mechanical importer/validator rules, not style preferences:

- Do not include temporary validation artifacts such as `review/js-check/*.js` in final packages.
- Runtime JavaScript must be inline in `note.html` or packaged under `generated/content/<domain>/<node-id>/assets/`.
- Local media in HTML rich notes must use a source-marked asset root:
  - `assets/original/...`
  - `assets/source/...`
  - `assets/source-assets/...`
  - `assets/source-snapshot/...`
- Do not use bare local media paths such as `assets/foo.png`, `assets/foo.jpg`, or `assets/foo.mp4`.
- Every packaged asset under `generated/content/<domain>/<node-id>/assets/**` must be referenced by that node's note, unless it is source-snapshot infrastructure.
- If an inventory item is not represented in the final note, mark it `required: false` or give an `omitted_reason`.

Source blocks are conditional. Add `<aside class="source-block">...</aside>` only when the note actually cites, embeds, closely paraphrases, or derives a concrete claim/media/demo from original source material or another network resource. Do not add source blocks merely to satisfy a template.

## V2 hard failures

A package is unacceptable if any of the following is true:

- `patch.yaml` uses `type: add_node` as the node's knowledge type;
- learner-facing title or prose contains implementation/meta language listed above;
- an important original demo is replaced by a conceptually similar AI-authored demo when direct source-porting is feasible;
- original demo DOM ids are present but original runtime context is missing, causing incorrect canvas background, blend mode, dark/light section behavior, or slider overlap;
- a canvas, table, source block, slider, or review panel has low contrast text/content in the actual KB rendering context;
- source explanations are compressed into one-line captions when the source provides a fuller explanation;
- source-grounded statements that explicitly cite original/source/network material have no nearby source block;
- generated raster images are used as substitutes for source visuals;
- package paths are invalid or unsupported assets are included in a way that the importer rejects.
