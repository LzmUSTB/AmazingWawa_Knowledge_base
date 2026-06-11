# Wawa Package Guide

Final user-facing output must be a single .wawapkg file.

.wawapkg is a ZIP-compatible archive with a custom extension. The archive root must contain: mimetype, manifest.yaml, sources.yaml, patch.yaml, generated/, block-types/, review/.

The mimetype file must contain exactly:
```
application/x-wawa-kb-ai-import-package
```

Assets are allowed and encouraged. Put packaged assets under:
```text
generated/content/<domain>/<node-id>/assets/<lowercase-kebab-name.ext>
```

Reference local assets from note.md:
```markdown
![Alt text](assets/example-diagram.png)
[Attachment label](assets/source-notes.pdf)
```

Remote URLs and data URLs are not allowed for note assets. Package images locally.

Domain rules: If DOMAIN_INDEX.yaml is empty, start with add_domain. If no suitable existing domain fits, create a small, stable, broad domain with add_domain. Do not create excessive narrow domains.
