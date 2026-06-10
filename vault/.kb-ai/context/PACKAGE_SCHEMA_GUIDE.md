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
status: draft
preview:
  mode: in-app
  generatedHtmlPreview: false
```

```yaml
# patch.yaml
operations:
  - type: add_node
    node:
      id: example-concept
      title: Example Concept
      domain: simulation
      type: concept
      status: draft
      summary: One sentence summary.
    parentId: simulation
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
- Allowed relations: contains, depends-on, used-in, compares-with
- Link relations in add_edge: depends-on, used-in, compares-with
- Do not include executable/source files: .js, .ts, .vue, .css, .html, .htm, .exe, .dll, .bat, .cmd, .sh, .ps1, .jar, .wasm
- Do not include SVG unless the app later adds sanitization.
