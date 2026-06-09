# Graph Schema

## 1. Purpose

This document defines the current schema for `vault/graph.yaml`.

`graph.yaml` stores semantic relationships between knowledge nodes. It does not store visual layout, node positions, PCB trace routes, zoom, pan, or UI state.

```txt
graph.yaml = semantic knowledge relations
graph-layout.yaml = visual node placement and PCB routing
```

## 2. Recommended Structure

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
```

## 3. Edge Fields

| Field | Required | Description |
|---|---:|---|
| `id` | yes | Stable edge ID |
| `from` | yes | Source node ID |
| `to` | yes | Target node ID |
| `relation` | yes | Relation type |

## 4. Allowed Relation Types

```txt
contains
depends-on
used-in
compares-with
```

## 5. Relation Semantics

### `contains`

Represents hierarchy.

```txt
parent -> child
```

New Note uses `contains` to attach a new node to a parent.

New Note parent rule:

```txt
Parent must belong to the selected domain.
```

Do not use `contains` for cross-domain conceptual references. Use `depends-on`, `used-in`, or `compares-with` through Add Link.

### `depends-on`

```txt
A depends-on B
= A depends on B
= B is useful to understand before A
```

### `used-in`

```txt
A used-in B
= A is applied in B
```

### `compares-with`

Conceptually undirected. Store only one edge.

## 6. Edge ID Rules

Recommended ID format:

```txt
<from>-<relation>-<to>
```

Rules:

- lowercase English
- kebab-case
- stable over time
- unique in `graph.yaml`
- should not contain spaces
- should not contain Chinese/Japanese characters

## 7. Node ID Requirements

Every `from` and `to` must reference an existing node ID from `domains.yaml` or `content/*/*/meta.yaml`.

## 8. Duplicate Rules

Duplicate edge is not allowed. Duplicate means same `from`, same `to`, and same `relation`.

For `compares-with`, reverse direction is also considered duplicate.

## 9. Graph Scope Generation

### Root Scope

Root scope shows only top-level domain nodes.

### Domain Scope

Domain scope shows:

```txt
current domain
+ nodes directly contained by current domain
```

Do not show grandchildren in the same domain scope.

If `graphics contains rendering-pipeline` and `rendering-pipeline contains test-note`, the Graphics Domain Graph shows `graphics` and `rendering-pipeline`, not `test-note`.

### Focus Scope

Focus scope shows:

```txt
current node
+ all one-hop directly connected nodes
+ only edges directly connected to current node
```

Focus scope ID is the focused node ID. Cross-domain one-hop neighbors are allowed and keep their own domain color.

## 10. Cross-Domain Edges

Cross-domain edges are allowed for `depends-on`, `used-in`, and `compares-with`.

Cross-domain `contains` should be rejected by New Note creation.

## 11. Edge Creation Responsibilities

```txt
New Note -> creates contains only
Add Link -> creates depends-on / used-in / compares-with only
```

Add Link must not create `contains`. Hierarchy changes should later be handled by a dedicated Move Node / Change Parent flow.

## 12. Recommended Validation

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

When creating a New Note, also validate:

```txt
parent exists
parent belongs to selected domain
new node ID does not exist
new contains edge ID does not exist
```

When creating an Add Link edge, validate:

```txt
source exists
target exists
source != target
relation is depends-on / used-in / compares-with
edge ID does not exist
no duplicate from/to/relation
for compares-with, reverse direction also does not exist
```

## 13. What Not to Store in `graph.yaml`

Do not store layout, style, interaction state, note content, UI font size, camera state, or selection.
