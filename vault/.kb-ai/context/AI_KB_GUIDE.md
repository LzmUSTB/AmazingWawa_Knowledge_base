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
```

Do not ask the user to manually place package folders under .kb-ai/imports. Do not output an ordinary .zip as the final artifact.

If you cannot create .wawapkg directly, output a source package folder and ask the developer to pack it with:
```bash
npm run kb:pack-ai-import -- ./package-folder ./ai-import-xxx.wawapkg
```
