# Graph Schema

## Relation visual semantics

This section locks the final pre-Step-9 relation visual rules.

The stored semantic direction in `graph.yaml` does not change.

```txt
contains:
  white or muted-white solid line
  no arrow

depends-on:
  yellow dashed line
  no arrow
  stored as A depends-on B
  visually displayed as a directionless dependency line
  do not render it as a reverse arrow

used-in:
  purple solid forward arrow
  A used-in B is displayed as A -> B

compares-with:
  orange solid double line
  bidirectional arrowheads on the same relation
  stored only once
  displayed as one bidirectional comparison relation
  do not render it as two separated opposite arrows
```

## Rendering implementation note

For `compares-with`, avoid drawing two independently offset opposite-direction routes. That can create internal crossings and make the relation look like two separate arrows.

Preferred graph rendering:

```txt
one base orthogonal route
outer orange stroke
inner background-color cut stroke
marker-start and marker-end on the same relation
```

`depends-on` must not use marker-start or marker-end.
