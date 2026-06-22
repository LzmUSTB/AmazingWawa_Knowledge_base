# Format Contract

This file defines mechanical format rules. They are stricter than authoring preferences.

## Source of truth

The vault uses plain files. Do not invent database-only entities. Knowledge content belongs under `content/`; graph relations belong in `graph.yaml`; domain metadata belongs in `domains.yaml`.

## Package root

A `.wawapkg` is a ZIP-compatible archive containing:

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
review/
```

`block-types/` is optional and only used for custom block types. The `mimetype` file must contain exactly `application/x-wawa-kb-ai-import-package`.

## No UI documents

Do not use UI design documents, layout-editing plans, Stage interaction plans, or historical patch instructions as content-authoring rules.

## Stage separation

Stage is visual layout data. It is not a knowledge node, ExerciseSet owner, relation type, or learning-path object.

## ExerciseSet separation

ExerciseSet is attached to a node, never to Stage. One node has at most one ExerciseSet.

## Package generation gate

Format knowledge does not authorize package generation. Generate package files only after an explicit request or approval of an import plan.
