# Domain Color Generalization

## Problem

Domain colors must not be hardcoded by business domain ID.

This is not scalable:

```txt
graphics = blue
simulation = purple
machine-learning = lime
```

Real vaults may have arbitrary domains:

```txt
papers
projects
biology
reading
companies
people
personal
```

## Source of Truth

Domain color should come from `domains.yaml`.

```yaml
domains:
  - id: papers
    title: Papers
    color: "#00B7FF"
```

## Runtime Fallback

If `domain.color` is missing:

```txt
domain id
-> stable hash
-> generic fallback palette
```

Do not write the generated fallback color back to `domains.yaml`.

## Correct Priority

```txt
1. domains.yaml color
2. stable hash(domainId) fallback palette
3. #EDEDED
```

## Relation Colors

Relation colors remain semantic and may stay hardcoded:

```txt
depends-on = yellow dashed
used-in = purple arrow
compares-with = orange double-line
contains = white/muted
```

Domain colors are vault-specific metadata. Relation colors are UI semantics.
