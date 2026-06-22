# Relation Schema

Allowed relations are frozen: `contains`, `depends-on`, `used-in`, `compares-with`.

- `contains`: hierarchy only. For new nodes, express it with `parentId`.
- `depends-on`: understanding the target helps understand the source.
- `used-in`: the source is used inside the target.
- `compares-with`: two nodes are alternatives, contrasts, or close comparison targets.

```yaml
operations:
  - type: add_edge
    from: thin-lens
    to: refraction
    relation: depends-on
    reason: Thin-lens behavior follows from refraction at curved surfaces.
```

`add_edge` fields are flat. `contains` is forbidden in `add_edge`; use `parentId`. Do not create weak edges merely because concepts occur in the same source.

Learning order is not a relation. Stage is not a relation. ExerciseSet coverage is not a relation. Do not invent relation types for any of them.
