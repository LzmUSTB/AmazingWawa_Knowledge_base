# ProcessFlowBlock Refactor

## Purpose

Move `process-flow` rendering out of `NoteBlockRenderer.vue` into a dedicated component:

```txt
apps/desktop/src/components/note/blocks/ProcessFlowBlock.vue
```

## Reason

The previous implementation repeatedly called:

```txt
flowLayout(block.data)
```

inside the template.

This causes the same layout to be recalculated many times per render.

## Required implementation

`ProcessFlowBlock.vue` should compute the layout once per block:

```txt
layout = computed(() => flowLayout(props.data))
```

The template should then reuse:

```txt
layout.nodes
layout.edges
layout.width
layout.height
layout.nodesById
```

## Must preserve

```txt
current process-flow syntax
current visual style
click-to-inspect behavior
scroll behavior
arrows
parallel branches
fallback nodes for edges
```

## Not included

Do not refactor all content blocks in Step 9.

Only `process-flow` is required.
