# Note Quality Rubric

Use this rubric to self-check every generated note before packaging.

Target score: **4 or higher**.

## Score 5 — Excellent

The note is directly useful for learning and later review.

Criteria:
- precise definition,
- clear problem solved,
- strong intuition,
- mechanism explained,
- implementation or formal detail when relevant,
- concrete example,
- parameters/variables explained,
- limitations or misconceptions,
- meaningful relations to other nodes,
- review questions test understanding,
- visuals/blocks are purposeful.

## Score 4 — Good

The note is usable and mostly complete.

Criteria:
- definition and mechanism are clear,
- at least one concrete example,
- at least one common mistake or limitation,
- relations are meaningful,
- blocks support the explanation.

Missing one minor part is acceptable.

## Score 3 — Acceptable but shallow

The note is structurally valid but has limited learning value.

Problems may include:
- mostly summary,
- weak example,
- little mechanism,
- few implementation details,
- relations are generic,
- review questions are superficial.

Revise before packaging if the topic is important.

## Score 2 — Poor

The note is mainly a paraphrase of the source.

Problems:
- no clear mechanism,
- no example,
- no parameters,
- no real relation reasoning,
- content could not be used for review.

Do not package without revision.

## Score 1 — Invalid

The note is misleading or nearly empty.

Problems:
- incorrect explanation,
- fabricated details,
- missing core fields,
- broken block syntax,
- irrelevant content.

Reject or regenerate.

## Mandatory self-check

For each note, answer in `review/validation-checklist.md`:

```yaml
note_quality:
  node_id:
  estimated_score:
  strongest_part:
  weakest_part:
  missing_information:
  revision_done: true | false
```

If estimated score is below 4, revise before final package.
