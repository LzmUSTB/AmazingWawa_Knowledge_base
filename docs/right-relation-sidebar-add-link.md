# Right Relation Sidebar + Add Link

## 1. Purpose

Step 7 replaces the global `New Link` interaction with context-bound relationship maintenance.

Relations are not created from a global menu. They are created from the current node's right sidebar.

```txt
current node
-> right relation sidebar
-> Add Link
-> write graph.yaml
-> reload vault without navigation reset
```

## 2. Scope

Step 7 includes:

```txt
right collapsible relation sidebar
selected node summary
node actions
hierarchy list
relation list
Add Link form
real graph.yaml write for non-hierarchical relations
```

Step 7 does not include:

```txt
relation deletion
relation editing
contains creation
node parent moving
manual route editing
drag-to-connect
AI suggestions
Git panel
content block renderer
```

## 3. Layout

Desktop layout becomes:

```txt
left vault sidebar | main workspace | right relation sidebar
```

Suggested CSS grid:

```css
grid-template-columns:
  var(--sidebar-width)
  minmax(0, 1fr)
  var(--relation-sidebar-width);
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

Collapsed rail label:

```txt
Relations
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

## 5. Replacing NodeContextMenu

The floating `NodeContextMenu` should be removed or disabled.

Its actions move to the right sidebar:

```txt
Selected Node -> right sidebar header
Open Note -> right sidebar action
Open Domain Graph -> right sidebar action when selected node is a domain
Local Graph -> right sidebar action
Add Link -> right sidebar + button
```

Right-clicking a node may simply select that node. It should not open a floating menu in Step 7.

## 6. Sidebar Sections

Recommended order:

```txt
SELECTED NODE
<Title>
<id / type / domain>

ACTIONS
Open Note
Show Local Graph / Open Domain Graph

HIERARCHY
Parent: <node>
Children:
- <child>

RELATIONS                         +
A depends-on B
A used-in B
B depends-on A
A compares-with B
```

`contains` edges belong in Hierarchy, not the ordinary Relations list.

Ordinary Relations list includes only:

```txt
depends-on
used-in
compares-with
```

## 7. Relation List Display

For current node `A`, show all directly connected non-contains edges:

```txt
A depends-on B
A used-in B
B depends-on A
A compares-with B
```

Display the actual stored direction from `graph.yaml`.

Each row should expose the other node as a clickable target.

Clicking the other node opens that node's local/focus graph:

```txt
openScope(otherNodeId, otherNodeId)
```

Do not default relation row click to opening Note View. Relation navigation should explore graph structure.

## 8. Add Link Entry Point

Add Link entry points:

```txt
right sidebar + button
right sidebar Add Link action
```

Remove global `New Link` buttons from:

```txt
TopMenu
GraphToolbar
```

Do not keep the old NewLinkDialog as a global prototype dialog.

## 9. Add Link Form

Current node is fixed as `A`.

Fields:

```txt
Direction:
  A -> Target
  Target -> A

Relation:
  depends-on
  used-in
  compares-with

Target:
  searchable node selector

Preview:
  A depends-on B
```

Direction is required because both of these are valid and mean different things:

```txt
A depends-on B
B depends-on A
```

`compares-with` is conceptually undirected, but it is still stored once with a concrete from/to direction.

## 10. Add Link Validation

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

## 11. graph.yaml Write

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

## 12. Save-State Requirements

Add Link must follow the same save-state pattern as note/layout saves:

```txt
write file
load vault from disk
replaceVaultWithoutNavigation(updatedVault)
restore currentView / graphScopeId / selectedNodeId / currentNoteId
```

Do not call `applyVault(updatedVault, { reset: true })` after Add Link.

## 13. Future Work

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
