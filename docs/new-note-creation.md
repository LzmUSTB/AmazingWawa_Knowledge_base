# New Note Creation

## 1. Purpose

New Note creates a new knowledge item folder, writes starter files, and adds one semantic `contains` edge to `graph.yaml`.

## 2. Form Fields

- `title`: display title, required
- `id`: stable node ID, required
- `domain`: existing domain ID, required
- `type`: one of `topic`, `concept`, `skill`, `project`, `tool`, `paper`, `question`, `note`
- `status`: one of `seed`, `growing`, `evergreen`, `deprecated`, `archive`
- `summary`: one-sentence summary
- `parentId`: existing node ID, required

## 3. ID Rules

IDs must be lowercase kebab-case. Allowed characters: `a-z`, `0-9`, `-`.

The form may auto-generate an ID from English titles. For Chinese or Japanese titles, the user should manually enter a stable English ID.

## 4. Parent Rules

Default parent selection:

- domain scope: current domain
- focus scope: focused node
- selected domain node: selected domain
- otherwise: current domain

The parent must already exist and must belong to the selected domain.

Do not use Parent for cross-domain relationships. Cross-domain `depends-on`, `used-in`, or `compares-with` links belong in New Link later.

## 5. File Creation

Creating a note writes:

```txt
vault/content/<domain>/<id>/
  meta.yaml
  note.md
  assets/
```

## 6. `meta.yaml`

Generated `meta.yaml` contains:

```yaml
id: deferred-rendering
title: Deferred Rendering
domain: graphics
type: concept
status: seed
summary: A rendering method that separates geometry and lighting work.
createdAt: 2026-06-08
updatedAt: 2026-06-08
tags:
  - graphics
prerequisites: []
related: []
```

Dates use the current local date.

## 7. `note.md`

Template fallback order:

```txt
vault/templates/<type>/note.md
vault/templates/concept/note.md
built-in default note text
```

The first Markdown H1 is replaced with the new title.

## 8. `graph.yaml` Edge

Creation appends exactly one edge:

```yaml
- id: <parentId>-contains-<newNodeId>
  from: <parentId>
  to: <newNodeId>
  relation: contains
```

Before writing:

- new node ID must not exist
- parent must exist
- parent must be in the selected domain
- edge ID must not exist
- duplicate `from/to/relation` edge must not exist

## 9. Layout

This phase does not write `graph-layout.yaml`.

New nodes appear through generated layout and route fallback until manual layout editing is implemented.

If a new note is created under a non-domain parent, it appears in that parent's Focus / Local Graph. It does not appear in the domain graph unless it is directly contained by the domain.

Double-click navigation rule:

```txt
node with contains children -> open Local Graph
leaf node -> open Note
center node in its own Local Graph -> open Note
```

## 10. Not Included

This phase does not implement real New Link writing, graph-layout saving, node dragging, route editing, or drag-to-connect.
