# Wawa Package Schema Guide

Archive extension: .wawapkg

Mimetype file content: application/x-wawa-kb-ai-import-package

Recommended packageId: wawa-import-YYYYMMDD-topic-name

```yaml
# manifest.yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
status: seed
preview:
  mode: in-app
  generatedHtmlPreview: false
```

```yaml
# patch.yaml
operations:
  - type: add_domain
    domain:
      id: computer-graphics
      title: Computer Graphics
      description: Rendering, geometry processing, shaders, and graphics pipelines.
      color: "#00B7FF"
      order: 10
  - type: add_node
    node:
      id: example-concept
      title: Example Concept
      domain: computer-graphics
      type: concept
      status: seed
      summary: One sentence summary.
    parentId: computer-graphics
```

Asset placement: generated/content/<domain>/<node-id>/assets/<file>.

Constraints: use add_domain first when no suitable domain exists; add_node may reference a domain created earlier; allowed add_edge relations are depends-on, used-in, compares-with; do not include executable/source files.
