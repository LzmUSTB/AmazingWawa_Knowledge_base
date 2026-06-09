# Interaction Specification Addendum: Final Relation Visual Rules

## GraphView relation rendering

```txt
contains:
  solid white / muted-white line
  no arrow

depends-on:
  yellow dashed line
  no arrow

used-in:
  purple solid line
  forward arrow

compares-with:
  orange double line
  bidirectional arrowheads
  one relationship
  not two separated opposite arrows
```

## Right Relation Sidebar direct relation row

Direct relation rows use:

```txt
[source endpoint] [relation middle] [target endpoint]
```

The center relation middle fills the available width.

Do not add individual border/background boxes to endpoint or middle cells.

The relation row may keep an outer frame. Endpoint labels stay neutral. Only the middle relation label and trace are relation-colored.

## Context menu note for future Step 10

For relation edit/delete, do not add row buttons.

Use right-click context menu on the relation row:

```txt
Edit Relation
Delete Relation
```

Edit Relation should open a centered modal similar to Add Link, not an inline editor inside the sidebar.
