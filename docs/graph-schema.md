# Graph Schema

## 1. Purpose

This document defines the current schema for `vault/graph.yaml`.

`graph.yaml` stores semantic relationships between knowledge nodes. It does not store visual layout, node positions, PCB trace routes, zoom, pan, UI state, note content, or content block data.

```txt
graph.yaml = semantic knowledge relations
graph-layout.yaml = visual node placement and optional PCB routing
note.md = node explanation content and optional content blocks
```

## 2. Recommended Structure

```yaml
schemaVersion: 1

edges:
  - id: graphics-contains-rendering-pipeline
    from: graphics
    to: rendering-pipeline
    relation: contains

  - id: rendering-pipeline-depends-on-rasterization
    from: rendering-pipeline
    to: rasterization
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

Do not use `contains` for cross-domain conceptual references. Use Add Link with `depends-on`, `used-in`, or `compares-with`.

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

```txt
lowercase English
kebab-case
stable over time
unique in graph.yaml
no spaces
no Chinese/Japanese characters
```

## 7. Duplicate Rules

Duplicate edge is not allowed. Duplicate means same `from`, same `to`, and same `relation`.

For `compares-with`, reverse direction is also considered duplicate.

## 8. Graph Scope Generation

### Root Scope

Root scope shows only top-level domain nodes.

### Domain Scope

Domain scope shows:

```txt
current domain
+ nodes directly contained by current domain
```

Do not show grandchildren in the same domain scope.

### Focus Scope

Focus scope shows:

```txt
current node
+ all one-hop directly connected nodes
+ only edges directly connected to current node
```

Focus scope ID is the focused node ID. Cross-domain one-hop neighbors are allowed and keep their own domain color.

## 9. Creation Rules

New Note creates exactly one `contains` edge.

Add Link creates exactly one non-hierarchical edge:

```txt
depends-on
used-in
compares-with
```

Add Link must reject `contains`.

## 10. Recommended Validation

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

When creating an Add Link relation, also validate:

```txt
source exists
target exists
source !== target
relation is depends-on / used-in / compares-with
relation is not contains
edge ID does not already exist
same from/to/relation does not already exist
for compares-with, reverse edge does not already exist
```
