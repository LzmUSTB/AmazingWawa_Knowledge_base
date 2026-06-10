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
  - type: add_edge
    from: example-concept
    to: another-concept
    relation: compares-with
```

Asset placement:
```text
generated/content/simulation/example-concept/assets/solver-loop.png
```

Note reference:
```markdown
![Solver loop](assets/solver-loop.png)
```

Constraints:
- Use add_domain first when the vault has no suitable domain.
- add_domain is create-only; it cannot update existing domains.
- add_node may reference a domain created earlier in the same patch.
- Allowed relations: contains, depends-on, used-in, compares-with
- Link relations in add_edge: depends-on, used-in, compares-with
- Do not include executable/source files: .js, .ts, .vue, .css, .html, .htm, .exe, .dll, .bat, .cmd, .sh, .ps1, .jar, .wasm
- Do not include SVG unless the app later adds sanitization.
