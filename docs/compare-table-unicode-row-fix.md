# Compare Table Unicode Row Fix

## Problem

`compare-table` rows can be lost when row labels start with non-ASCII characters.

Example:

```md
rows:
  数据表示:
    - 粒子
    - 粒子 + 背景网格
    - 固定或自适应网格
  GPU 实现重点:
    - 邻居搜索、hash、prefix sum、cell bucket
    - P2G / Grid Update / G2P pass
    - pressure solve、advection、projection
```

If the nested parser only accepts keys beginning with `[A-Za-z0-9_-]`, then `数据表示:` is skipped while `GPU 实现重点:` is parsed.

## Required Parser Rule

Nested keys should accept any non-empty text before a colon.

Recommended nested key pattern:

```txt
^([^:\n]+):\s*(.*)$
```

Top-level custom block keys can remain stricter if needed, but nested compare-table row labels must support multilingual text.

## Acceptance

```txt
Chinese/Japanese row labels render
all rows in compare-table render
cells align with declared columns
no cell displays [object Object]
```
