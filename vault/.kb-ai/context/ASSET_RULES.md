# Asset Rules

Package node assets live under `generated/content/<domain>/<node-id>/assets/` and must be referenced by that node's note unless they are source-snapshot infrastructure.

Allowed source-marked local roots in HTML notes:

```text
assets/original/
assets/source/
assets/source-assets/
assets/source-snapshot/
```

Bare paths such as `assets/foo.png` are forbidden. Do not package unused copied media. Mark an unused inventory item `required: false` or provide `omitted_reason`.

Do not replace important original figures or demonstrations with generated raster images. Runtime JavaScript belongs inline in `note.html` or under the node-local assets directory. Temporary validation programs do not belong in final packages.

For source-rich HTML notes, inventory original assets and important demos. Preserve canvas compositing, intended light/dark context, control behavior, and readable contrast.
