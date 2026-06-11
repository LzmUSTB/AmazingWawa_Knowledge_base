# Note Quality Rubric

Target score: 4 or higher.

## 5 Excellent

Precise definition, clear problem, mechanism, examples, parameters, mistakes, relations, review questions, and purposeful visuals. Tutorial-style notes preserve and improve the original teaching rhythm.

## 4 Good

Usable and mostly complete. Clear mechanism and at least one concrete example.

## 3 Shallow

Structurally valid but too summary-like.

## 2 Poor

Mostly paraphrase with little mechanism. Tutorial source is heavily compressed.

## 1 Invalid

Incorrect, empty, misleading, or broken.

## Mandatory self-check

For each note, answer in `review/validation-checklist.md`:

```yaml
note_quality:
  node_id:
  contentFormat: markdown | html | none
  estimated_score:
  strongest_part:
  weakest_part:
  missing_information:
  revision_done: true | false
```

For rich HTML notes, also check:

- not shorter than the source when source is already clear,
- original assets are used where needed,
- visual rhythm helps understanding,
- app style classes are used,
- font-size scale can affect all text,
- no inline scripts/styles.
