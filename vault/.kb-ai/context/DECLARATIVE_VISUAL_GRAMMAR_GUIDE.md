# Declarative Visual Grammar Guide

Custom block-types live in block-types/*.yaml and must use kind: declarative-visual with renderer.engine: visual-grammar.

Supported element families include rect, line, text, arrow-like connectors, groups, and simple data-bound repeated elements when declared by the installed schema.

Unsupported in package block definitions:
- script, eval, iframe, HTML, CSS, JS, Vue
- remote URLs or external resources
- arbitrary event handlers
- inline SVG

Prefer packaged images for static diagrams. Use visual grammar for structured technical visuals that need labels, dependencies, states, or repeated generated geometry.
