# Source Extraction Guide

Extract reusable knowledge, not paragraph summaries.

For each source, derive:

- source identity,
- source scope,
- core claims,
- mechanisms,
- procedures,
- parameters and variables,
- concrete examples,
- limitations,
- misconceptions,
- candidate nodes,
- relation plan.

## Tutorial / visual source rule

For visual/tutorial sources, preserve the teaching sequence when it improves learning.

If the source already explains something clearly, the note must not shrink it. Expand it by adding transitions, variable definitions, implementation implications, and review questions.

Prefer original figures/videos when they are central to understanding.

## Candidate node protocol

Before writing files, list candidate nodes:

```yaml
candidate_nodes:
  - id:
    type: topic | concept | skill | question | paper | tool | project
    why_node:
    keep_or_reject:
    reason:
```

Reject nodes that are too small, duplicate, or only source-specific.
