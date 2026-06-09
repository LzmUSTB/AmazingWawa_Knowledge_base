# Right Relation Sidebar + Add Link

## 1. Purpose

The right relation sidebar replaces the old global `New Link` interaction with context-bound relationship maintenance.

```txt
current node
-> right relation sidebar
-> Add Link
-> write graph.yaml
-> reload vault without navigation reset
```

## 2. Current Scope

Implemented baseline:

```txt
right collapsible relation sidebar
selected node summary
node actions
hierarchy list
relation list
Add Link form
real graph.yaml write for non-hierarchical relations
```

Next refinement targets:

```txt
clearer target hierarchy list
direction toggle instead of select dropdown
relation rows with colored arrow/trace visualization
```

## 3. Layout

Desktop layout:

```txt
left vault sidebar | main workspace | right relation sidebar
```

Right sidebar widths:

```txt
expanded: 300px or 320px
collapsed: 44px
```

Preference key:

```txt
amazingwawa.relationSidebarCollapsed
```

## 4. Current Node Resolution

Right sidebar current node rule:

```txt
Note View:
  current node = currentNoteId

Graph View:
  current node = selectedNodeId if present
  otherwise current scope center node
```

In Graph View, clicking a node updates the selected node and refreshes the right sidebar content.

## 5. Sidebar Sections

Recommended order:

```txt
SELECTED NODE
<Title>
<id / type / domain>

ACTIONS
Open Note
Show Local Graph / Open Domain Graph
Add Link

ADD LINK
[current node] [direction toggle arrow] [Target]
relation selector
hierarchical target picker
preview

HIERARCHY
Parent
Children

RELATIONS
relation rows with colored label + arrow/trace preview
```

`contains` edges belong in Hierarchy, not the ordinary Relations list.

Ordinary Relations list includes only:

```txt
depends-on
used-in
compares-with
```

## 6. Add Link Direction Control

Do not use a direction dropdown.

Use a compact visual direction row:

```txt
[Current Node] [→] [Target]
```

Behavior:

```txt
click arrow button -> toggle direction
```

When reversed:

```txt
[Target] [→] [Current Node]
```

The preview should update immediately.

Direction is required because both are meaningful:

```txt
A depends-on B
B depends-on A
```

`compares-with` is conceptually undirected, but it is still stored once with concrete `from` and `to`.

## 7. Add Link Target Picker

The target node list must not be a flat unclear list.

Display targets grouped by hierarchy and domain.

Minimum requirement:

```txt
Domain / top-level group row
  direct child node
    child node
    child node
  direct child node
```

Top-level domain rows must show domain color at least as a left border, marker, or accent strip.

Filtering rules:

```txt
search by title, id, domain
preserve visible hierarchy context where possible
exclude current node
```

Each item should show at least:

```txt
title
id
type/domain or hierarchy depth
```

The UI should make it clear whether the user is choosing a domain or a normal knowledge item.

## 8. Relation List Display

For current node `A`, show all directly connected non-contains edges:

```txt
A depends-on B
A used-in B
B depends-on A
A compares-with B
```

Display the actual stored direction from `graph.yaml`.

Each row should include:

```txt
relation text
other node title/id
small relation arrow or trace preview under the text
```

Relation color mapping:

```txt
depends-on: var(--relation-depends-on)
used-in: var(--relation-used-in)
compares-with: var(--relation-compares-with)
```

Both relation text and arrow/trace preview should use the relation color.

Suggested row rendering:

```txt
渲染管线 DEPENDS-ON Shader
Shader

──────▶
```

For `used-in`, dashed or segmented line is recommended.

For `compares-with`, double/paired line or bidirectional marker is recommended.

Clicking the relation row's other node opens that node's local/focus graph:

```txt
openScope(otherNodeId, otherNodeId)
```

Do not default relation row click to opening Note View.

## 9. Add Link Validation

Before writing:

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

Recommended edge ID:

```txt
<source>-<relation>-<target>
```

## 10. graph.yaml Write

Add Link appends one edge to `graph.yaml`:

```yaml
- id: rendering-pipeline-depends-on-rasterization
  from: rendering-pipeline
  to: rasterization
  relation: depends-on
```

After writing:

```txt
reload vault
replace active vault without navigation reset
keep current view
keep current graph scope
keep selected/current node
close Add Link form
right sidebar relation list updates
```

If the current scope contains the new edge, Graph View updates. If not, do not force navigation.

## 11. Future Work

Later versions may add:

```txt
delete relation
edit relation
relation notes / reasons
filter relations by relation type
AI suggested links
drag-to-connect
Move Node / Change Parent for contains hierarchy
```
