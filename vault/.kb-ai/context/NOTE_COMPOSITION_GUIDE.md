# Note Composition Guide

A note should be a reusable learning unit. It should teach one knowledge object clearly enough that the user can review it later without reopening the original source.

Do not produce a loose article summary. Do not merely translate the source.

## Node granularity

Each note should correspond to one reusable knowledge object.

Good node objects:

- concept: `Curl Noise`
- mechanism: `Pressure Projection`
- skill: `Authoring Curl Noise Inputs`
- question: `Can Curl Noise Tile Seamlessly?`
- comparison: `Curl Noise vs Flow Map`
- procedure: `Generating Flipbook VFX`

Bad node objects:

- an entire source article as one node when the source contains multiple reusable concepts,
- one node per minor paragraph,
- vague titles such as `Interesting Notes`,
- source-specific titles with no reusable meaning.

## Required note structure

A high-quality note should include most of the following, adapted to content type:

1. precise definition,
2. problem solved,
3. core intuition,
4. mechanism and cause-effect,
5. formal/technical detail,
6. concrete examples,
7. parameters or variables,
8. common mistakes,
9. relation to other nodes,
10. review questions.

## Tutorial-style source rule

When a source is already a clear tutorial or article, the note must be at least as detailed as the source. It may reorganize or expand, but must not omit important examples, insights, figures, videos, or authoring observations.

Use a direct teaching voice. Do not say `原文中说`, `这篇文章提到`, or `作者表示` inside the note body. Explain the concept as knowledge.

## Markdown and block syntax

Use triple-colon content block syntax. The block body is YAML.

Use content blocks when they improve learning, not to decorate.

## Depth requirements

Each important concept note should include at least one of:

```text
- changing X affects Y because Z
- step A -> B -> C
- A differs from B in mechanism or use case
- implementation representation in code/shader/data
- failure mode or limitation
```
