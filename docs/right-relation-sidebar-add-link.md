# Right Relation Sidebar Final Relation Row Style

This document locks the final pre-Step-9 relation row visual style.

## Direct relation row structure

```txt
[source endpoint] [relation middle] [target endpoint]
```

Final layout rule:

```txt
.relation-row--direct:
  grid-template-columns: auto 1fr auto

.relation-middle:
  fills the center column

.relation-endpoint:
  auto width
```

## Endpoint and middle boxes

Do not add individual boxes around endpoint or middle cells.

Forbidden style:

```txt
.relation-endpoint,
.relation-middle:
  border: 1px solid ...
  background: ...
  padding: 8px
```

Reason:

```txt
the right sidebar is narrow
inner boxes make relation rows visually crowded
the middle relation indicator should stretch cleanly across the center
```

The outer relation row may keep its own frame / left accent.

## Color rule

```txt
source endpoint:
  neutral / white text

target endpoint:
  neutral / white text

relation middle:
  relation-colored label
  relation-colored trace
```

Do not color the whole row by relation type.

## Relation indicator rules

```txt
depends-on:
  yellow dashed line
  no arrow

used-in:
  purple solid line
  right arrow only

compares-with:
  orange double line
  left and right arrowheads
  one relation indicator, not two separated arrows
```

For compares-with, the double line should stop before the arrowheads. The line should not visually protrude past the arrowhead tips.
