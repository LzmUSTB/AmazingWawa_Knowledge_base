# ExerciseSet Schema

- File name: `exercises.yaml`
- Path: `content/<domain>/<nodeId>/exercises.yaml`
- One node has at most one ExerciseSet.
- Attach comprehensive exercises to the parent node.
- ExerciseSet is never bound to Stage.

```yaml
version: 1
nodeId: linear-algebra
title: 线性代数综合习题
locale: zh-CN
summary: >
  用于检查线性代数核心概念、前置概念和综合应用能力。

scope:
  coverageNodeIds:
    - linear-algebra-vector-space
    - linear-algebra-basis-dimension
    - linear-algebra-linear-map
  prerequisiteNodeIds:
    - mathematical-foundations
  relatedNodeIds: []

problems:
  - id: la-core-001
    type: proof
    difficulty: graduate
    title: 核与像的维数关系
    prompt: |
      设 \(T: V \to W\) 是有限维向量空间之间的线性映射。证明：
      \[\dim V = \dim \ker T + \dim \operatorname{im} T\]
    hints:
      - 从 \(\ker T\) 的一组基出发，将其扩充为 \(V\) 的一组基。
    answer: |
      该命题成立，即秩-零化度定理。
    solution: |
      设一组核的基并将其扩充为 V 的基，再证明剩余基向量的像构成 im T 的一组基。
```

Allowed problem types: `conceptual`, `calculation`, `proof`, `derivation`, `application`, `comparison`, `implementation`, `diagnostic`.

Allowed difficulties: `introductory`, `undergraduate`, `undergraduate-advanced`, `graduate`, `research-oriented`.

Every problem requires `id`, `type`, `difficulty`, `title`, `prompt`, `answer`, and `solution`. Problem ids must be unique within the ExerciseSet. `hints` is optional.
