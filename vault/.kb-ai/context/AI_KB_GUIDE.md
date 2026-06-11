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

Create learnable knowledge, not a loose summary. A good package should help the user understand, recall, connect, and apply the source material.

## Required planning

Before writing package files, create a plan and include it in `review/import-plan.md`:

1. source scope,
2. knowledge extraction,
3. candidate nodes and rejected nodes,
4. relation plan,
5. note format decision: `markdown`, `html`, or `none`,
6. block/asset plan,
7. quality self-check.

## Content format decision

Use `contentFormat: markdown` and `note.md` for compact structured notes.

Use `contentFormat: html` and `note.html` for high-quality tutorial/article notes, figure-heavy explanations, source-asset-heavy notes, and visual reading experiences.

Use `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.

## Source asset policy

Prefer original source assets when they are public/stable and improve explanation. HTML notes may reference stable `https://` image/video URLs directly, but packaged local assets are preferred for durability.

For Markdown notes, use local packaged assets only:

```markdown
![Alt text](assets/example-diagram.png)
```

## Output language

Write explanatory note content in Chinese by default. Keep standard technical terms in English when they are more precise.

Do not mechanically translate English. Explain mechanisms.

## Domain rules

If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`. If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.
