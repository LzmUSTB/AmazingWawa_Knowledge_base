# Compare Table Addendum

## Problem

`compare-table` must never render `[object Object]`.

This can happen when a YAML-like nested row is parsed as an object and then stringified directly.

## Supported Syntax

### Columns as list, row values as list

```md
:::compare-table
columns:
  - SPH
  - MLS-MPM
  - Grid Fluid
rows:
  GPU 实现重点:
    - 邻居搜索、hash、prefix sum、cell bucket
    - P2G / Grid Update / G2P pass
    - pressure solve、advection、projection
:::
```

### Columns as inline list, row values as inline comma-separated values

```md
:::compare-table
columns: SPH, MLS-MPM, Grid Fluid
rows:
  GPU 实现重点: 邻居搜索、hash、prefix sum、cell bucket, P2G / Grid Update / G2P pass, pressure solve、advection、projection
:::
```

### Rows as column-keyed object

```md
:::compare-table
columns:
  - SPH
  - MLS-MPM
  - Grid Fluid
rows:
  GPU 实现重点:
    SPH: 邻居搜索、hash、prefix sum、cell bucket
    MLS-MPM: P2G / Grid Update / G2P pass
    Grid Fluid: pressure solve、advection、projection
:::
```

## Renderer Requirement

```txt
array cell:
  join items with comma or readable separator

object row:
  use columns to pick values in order if possible

object cell:
  do not call String(object)
  render Object.values in readable form or empty fallback

missing cell:
  render empty string
```

## Acceptance

```txt
no table cell displays [object Object]
list-style rows render one cell per declared column
object-style rows render in declared column order
```
