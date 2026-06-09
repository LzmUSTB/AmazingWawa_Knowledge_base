# Step 12: Recent and Pinned Nodes

## Purpose

Step 12 adds personal navigation shortcuts to the Search Overlay.

These shortcuts are local UI state, not knowledge content.

```txt
Pinned:
  manually selected personal shortcuts

Recent:
  automatically recorded recently opened nodes
```

## Storage

Use localStorage.

```txt
amazingwawa.pinnedNodeIds
amazingwawa.recentNodeIds
```

Do not write Pinned or Recent into the vault.

## Search Overlay Empty Query

When Search Overlay is in Quick mode and the query is empty:

```txt
PINNED
[PIN] SPH                  sph / simulation / concept

RECENT
SSFR                       ssfr / graphics / concept
MLS-MPM                    mls-mpm / simulation / concept
```

Pinned appears above Recent.

If a node is pinned, it should not be repeated in Recent display.

Full-text empty query does not show Pinned or Recent. It keeps the full-text hint.

## Pin / Unpin UI

Pin and Unpin are shown in the RelationSidebar Actions section for the current node.

Do not add pin buttons to every search result, graph node, file tree row, or relation row.

Allow pinning:

```txt
normal nodes
domain nodes
```

Do not pin:

```txt
relation edges
content block items
```

## Actions

Pinned and Recent rows behave like normal node/domain results:

```txt
Enter / click:
  open note or domain graph

Shift + Enter:
  open local graph for normal node
```

## Non-goals

Do not implement:

```txt
pinned folders
pinned groups
drag reorder
vault sync
pin relation
```
