# Source Extraction Guide

## Purpose

Use this guide before writing notes. The AI must transform source material into reusable knowledge, not summarize paragraphs in order.

## Extraction protocol

For each source, extract the following:

### 1. Source identity

Record:

```yaml
source_id:
title:
author:
url:
source_type: article | paper | documentation | video | code | other
date:
language:
```

### 2. Scope

Answer:

```text
What is this source mainly about?
What problem does it address?
What does it not cover?
```

### 3. Core claims

Extract the main technical claims.

Each claim should be phrased as:

```yaml
claim:
  statement:
  source_evidence:
  confidence: high | medium | low
```

### 4. Mechanisms

Extract cause-effect or process mechanisms.

Look for patterns like:

```text
X causes Y because Z.
X is transformed into Y through steps A, B, C.
Changing parameter P affects result R.
```

### 5. Procedures

Extract actionable workflows:

```yaml
procedure:
  goal:
  steps:
    - id:
      action:
      reason:
      output:
```

### 6. Parameters and variables

For technical content, identify parameters:

```yaml
parameter:
  name:
  meaning:
  affects:
  typical_range:
  failure_mode:
```

If the source does not give a range, say unknown. Do not invent precise ranges.

### 7. Examples

Extract concrete examples. Examples are important because they turn abstract descriptions into reusable knowledge.

```yaml
example:
  setup:
  input:
  process:
  output:
  lesson:
```

### 8. Limitations and failure modes

Extract what the method cannot do, where it breaks, or what the source leaves unresolved.

### 9. Misconceptions

Infer likely misconceptions only when grounded in the source or the technical mechanism.

Good misconception:

```text
Curl noise is not a full fluid solver; it only produces fluid-like vector-field motion.
```

Bad misconception:

```text
This method is always physically accurate.
```

### 10. Candidate nodes

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

## Extraction quality rules

Do not:
- summarize the article paragraph by paragraph,
- copy marketing language,
- preserve source order when conceptual order is better,
- create nodes for every heading,
- invent missing details.

Do:
- extract reusable concepts,
- explain mechanisms,
- define variables,
- preserve implementation-relevant details,
- identify relations,
- keep uncertainty explicit.
