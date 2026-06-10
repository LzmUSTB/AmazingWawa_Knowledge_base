# Wawa Package Guide

Final user-facing output must be a single .wawapkg file.

.wawapkg is a ZIP-compatible archive with a custom extension. The archive root must contain:
- mimetype
- manifest.yaml
- sources.yaml
- patch.yaml
- generated/
- block-types/
- review/

The mimetype file must contain exactly:
```
application/x-wawa-kb-ai-import-package
```

manifest.yaml must include:
```yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
```

Assets are allowed and encouraged when they make the note clearer. Put packaged assets under:
```text
generated/content/<domain>/<node-id>/assets/<lowercase-kebab-name.ext>
```

Reference local assets from note.md:
```markdown
![Alt text](assets/example-diagram.png)
[Attachment label](assets/source-notes.pdf)
```

Remote URLs and data URLs are not allowed for note assets. Package images locally. Assets may come from source material or be simple original explanatory images generated for the note. Generated assets must be safe and non-executable.

Domain rules:
- Domains are high-level root categories.
- If DOMAIN_INDEX.yaml is empty, start the package with add_domain.
- If no suitable existing domain fits the content, create a small, stable, broad domain with add_domain.
- Do not force content into an unrelated existing domain.
- Do not create excessive narrow domains.
- After add_domain, add nodes under that domain by setting node.domain and parentId to the new domain id.

Do not ask the user to manually place package folders under .kb-ai/imports. Do not output an ordinary .zip as the final artifact.

If you cannot create .wawapkg directly, output a source package folder and ask the developer to pack it with:
```bash
npm run kb:pack-ai-import -- ./package-folder ./ai-import-xxx.wawapkg
```
