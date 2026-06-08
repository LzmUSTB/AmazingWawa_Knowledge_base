# Graph Schema

## 1. Purpose

This document defines the first-version schema for `vault/graph.yaml`.

`graph.yaml` stores semantic relationships between knowledge nodes.

It does not store visual layout, node positions, PCB trace routes, zoom, pan, or UI state.

```txt
graph.yaml = semantic knowledge relations
graph-layout.yaml = visual node placement and PCB routing
```

## 2. Core Principle

`graph.yaml` should answer:

```txt
Which knowledge nodes are related?
What kind of relation do they have?
```

It should not answer:

```txt
Where should nodes appear?
How should lines be routed?
What color should the line be?
What is the current selected node?
What is the current graph zoom or pan?
```

## 3. File Location

```txt
vault/graph.yaml
```

## 4. Recommended Structure

```yaml
schemaVersion: 1

edges:
  - id: graphics-contains-rendering-pipeline
    from: graphics
    to: rendering-pipeline
    relation: contains

  - id: rendering-pipeline-depends-on-coordinate-transform
    from: rendering-pipeline
    to: coordinate-transform
    relation: depends-on

  - id: shader-used-in-fluid-rendering
    from: shader
    to: fluid-rendering
    relation: used-in

  - id: ppo-compares-with-sac
    from: ppo
    to: sac
    relation: compares-with
```

## 5. Top-Level Fields

| Field | Required | Description |
|---|---:|---|
| `schemaVersion` | yes | Graph schema version |
| `edges` | yes | List of semantic relationships |

## 6. Edge Fields

| Field | Required | Description |
|---|---:|---|
| `id` | yes | Stable edge ID |
| `from` | yes | Source node ID |
| `to` | yes | Target node ID |
| `relation` | yes | Relation type |

Although `id` could be generated automatically, this project should store it explicitly.

Reason:

```txt
graph-layout.yaml can reference edge IDs directly.
Git diffs are clearer.
Codex/ChatGPT can update relations more safely.
```

## 7. Allowed Relation Types

First-version relation types:

```txt
contains
depends-on
used-in
compares-with
```

Do not add new relation types without updating this schema.

## 8. Relation Semantics

### 8.1 `contains`

Represents hierarchy.

Example:

```yaml
- id: graphics-contains-rendering-pipeline
  from: graphics
  to: rendering-pipeline
  relation: contains
```

Meaning:

```txt
graphics contains rendering-pipeline
```

Use for:

- domain to topic
- topic to concept
- project to submodule
- parent knowledge area to child knowledge area

Direction:

```txt
parent -> child
```

### 8.2 `depends-on`

Represents prerequisite or dependency.

Example:

```yaml
- id: rendering-pipeline-depends-on-coordinate-transform
  from: rendering-pipeline
  to: coordinate-transform
  relation: depends-on
```

Meaning:

```txt
rendering-pipeline depends on coordinate-transform
```

Direction:

```txt
A depends-on B
= A depends on B
= B is useful to understand before A
```

Do not reverse this direction.

### 8.3 `used-in`

Represents application or usage.

Example:

```yaml
- id: shader-used-in-fluid-rendering
  from: shader
  to: fluid-rendering
  relation: used-in
```

Meaning:

```txt
shader is used in fluid-rendering
```

Direction:

```txt
A used-in B
= A is applied in B
```

### 8.4 `compares-with`

Represents comparison.

Example:

```yaml
- id: ppo-compares-with-sac
  from: ppo
  to: sac
  relation: compares-with
```

Meaning:

```txt
ppo and sac should be compared
```

`compares-with` is conceptually undirected.

Store only one edge.

Do not write both:

```yaml
- from: ppo
  to: sac
  relation: compares-with

- from: sac
  to: ppo
  relation: compares-with
```

## 9. Edge ID Rules

Recommended ID format:

```txt
<from>-<relation>-<to>
```

Examples:

```txt
graphics-contains-rendering-pipeline
rendering-pipeline-depends-on-coordinate-transform
shader-used-in-fluid-rendering
ppo-compares-with-sac
```

Rules:

- lowercase English
- kebab-case
- stable over time
- unique in `graph.yaml`
- should not contain spaces
- should not contain Chinese/Japanese characters

## 10. Node ID Requirements

Every `from` and `to` must reference an existing node ID.

Valid node IDs can come from:

1. domain IDs in `domains.yaml`
2. knowledge item IDs in `content/*/*/meta.yaml`

Validation requirement:

```txt
all edge.from IDs exist
all edge.to IDs exist
```

## 11. Duplicate Rules

Duplicate edge is not allowed.

Duplicate means:

```txt
same from
same to
same relation
```

Invalid example:

```yaml
edges:
  - id: ppo-compares-with-sac
    from: ppo
    to: sac
    relation: compares-with

  - id: ppo-compares-with-sac-2
    from: ppo
    to: sac
    relation: compares-with
```

For `compares-with`, this is also considered duplicate:

```yaml
edges:
  - from: ppo
    to: sac
    relation: compares-with

  - from: sac
    to: ppo
    relation: compares-with
```

## 12. Graph Scope Generation

`graph.yaml` is not the same as what appears on screen.

The app generates graph scopes from graph data.

### 12.1 Root Scope

Root scope shows only top-level domain nodes.

Source:

```txt
domains.yaml
```

Root scope should show:

```txt
Graphics
Linear Algebra
Machine Learning
Web Dev
Game Dev
Career
Language
Simulation
```

Root scope must not show all child concepts.

Invalid root behavior:

```txt
Graphics
Rendering Pipeline
Shader
PBR
Machine Learning
Gradient Descent
SAC
```

### 12.2 Domain Scope

Domain scope shows:

```txt
current domain
+ nodes directly contained by current domain
```

Example:

```txt
Graphics
├─ Rendering Pipeline
├─ Shader
├─ PBR
├─ Rasterization
├─ Post Process
└─ Material System
```

Do not show grandchildren in the same domain scope.

### 12.3 Focus Scope

Focus scope shows:

```txt
current node
+ parent node
+ directly related nodes
```

Example:

```txt
Rendering Pipeline
├─ Graphics
├─ Shader
├─ PBR
└─ Rasterization
```

Focus scope is useful for local review and mobile local graph view.

## 13. Cross-Domain Edges

Cross-domain edges are allowed.

Example:

```yaml
- id: reinforcement-learning-used-in-game-ai
  from: reinforcement-learning
  to: game-ai
  relation: used-in
```

Display rule:

```txt
Cross-domain edges may be hidden or simplified depending on graph scope.
```

Root scope should not become cluttered by every cross-domain edge.

The app may show cross-domain relations only when:

- selected node is involved
- focus scope is active
- user enables relation filters

## 14. Recommended Validation

When loading `graph.yaml`, validate:

```txt
schemaVersion exists
edges is an array
each edge has id/from/to/relation
edge.id is unique
edge.from exists
edge.to exists
edge.relation is allowed
no duplicate from/to/relation
compares-with does not appear in both directions
```

## 15. What Not to Store in `graph.yaml`

Do not store:

- node x/y positions
- node width/height
- PCB route points
- node colors
- current scope
- selected node
- hover state
- zoom
- pan
- UI panel state
- window size
- note content

These belong elsewhere.

## 16. Summary

`graph.yaml` is the semantic graph layer.

It stores:

```txt
edge id
source node
target node
relation type
```

It does not store:

```txt
layout
style
interaction state
content
```
