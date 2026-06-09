# Step 10: Relation Edit / Delete

## Purpose

Step 10 closes the graph maintenance loop by allowing existing non-hierarchical relations to be edited or deleted.

This is separate from Add Link.

```txt
Add Link:
  create new depends-on / used-in / compares-with edge

Step 10:
  edit existing relation
  delete existing relation
```

## UI Principle

Do not add Edit/Delete buttons inside relation rows.

The right relation sidebar is narrow, and inline buttons make relation rows crowded and easy to misclick.

Use right-click context menu instead.

## Relation Row Behavior

Left click:

```txt
open other node local/focus graph
```

Right click:

```txt
open relation context menu
```

Context menu items:

```txt
Edit Relation
Delete Relation
```

## Context Menu Style

```txt
hard-edged floating panel
black/elevated background
1px border
no rounded corners
no glassmorphism
no blur
delete item uses warning/red color
click outside closes
Esc closes
```

## Delete Relation

Delete flow:

```txt
right-click relation row
choose Delete Relation
show confirmation
remove edge from graph.yaml
reload vault
replace active vault without navigation reset
keep current view/scope/selected node when possible
```

Delete must not silently delete.

Confirmation should show:

```txt
source title
relation type
target title
edge id if useful
```

## Edit Relation

Edit opens a centered dialog, not an inline sidebar editor.

Dialog shape:

```txt
EDIT RELATION

Source / Direction
[Source Node] [→ toggle] [Target Node]

Relation
[depends-on / used-in / compares-with]

Target Picker
[filter input]
hierarchical target list grouped by domain

Preview
A depends-on B

[Cancel] [Save Relation]
```

## Save Behavior

Edit Relation should replace the old edge.

```txt
old edge removed
new edge written at same position if practical
new edge id regenerated as <source>-<relation>-<target>
```

Validation:

```txt
source exists
target exists
source !== target
relation is depends-on / used-in / compares-with
relation is not contains
new edge id does not already exist, excluding current edge
same from/to/relation does not already exist, excluding current edge
for compares-with, reverse duplicate does not exist, excluding current edge
```

## Not Included

Do not implement in Step 10:

```txt
relation row buttons
inline edit form inside sidebar
contains edit/move parent
drag-to-connect
relation notes
manual route editing
AI suggested links
```
