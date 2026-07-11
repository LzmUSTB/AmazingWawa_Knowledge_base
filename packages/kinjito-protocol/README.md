# @kinjito/protocol

The single executable protocol implementation shared by Kinjito desktop, local
Codex integrations, and the remote MCP server. It exposes Vault normalization,
schema constants, ExerciseSet validation/progress semantics, authoring context,
proposal conversion, `.wawapkg` parsing/packing, validation, diff, duplicate
detection, and filesystem-independent apply-plan generation.

Current versions:

- protocol: `1.0.0`
- Vault schema: `1`
- `.wawapkg` schema: `1.1`

See `docs/kinjito-protocol.md` in the application repository for the archive
contract and compatibility rules.
