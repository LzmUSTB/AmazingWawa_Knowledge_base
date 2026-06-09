# Relation Visual Final Addendum

## Final relation visual rules

```txt
contains:
  white or muted-white solid line
  no arrow

depends-on:
  yellow dashed line
  no arrow

used-in:
  purple solid forward arrow

compares-with:
  orange double line
  bidirectional arrowheads
  one relationship
  not two separated arrows
```

## compares-with arrow fix

The `compares-with` arrowhead must be the same visual size as the normal `used-in` arrowhead.

The arrowhead must not be split by the inner cut stroke used to create the double-line effect.

Recommended rendering:

```txt
body:
  orange outer path
  background-color inner cut path

arrowheads:
  rendered above the cut path
  same marker size as used-in
  marker-start and marker-end on the same relation
```

Avoid:

```txt
two point-wise offset opposite paths
oversized bidirectional arrowheads
inner cut stroke covering arrowheads
line protruding beyond arrowhead tips
```

## RelationSidebar final style

Direct relation rows use:

```txt
[source endpoint] [relation middle] [target endpoint]
```

The middle relation indicator fills the center column.

Do not add individual border/background/padding boxes to `.relation-endpoint` or `.relation-middle`.

Only the middle relation label and trace use relation color.
