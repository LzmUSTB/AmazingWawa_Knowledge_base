# Kinjito

Kinjito is a local-first knowledge graph desktop application. The software and
knowledge data are separate:

- this repository contains the Tauri/Vue application and `@kinjito/protocol`;
- a user-selected external active Vault contains knowledge and may be its own
  independent Git/GitHub repository;
- an ignored repository-local `vault/` is only a development convenience.

The desktop app stores its active path in application settings and publishes a
non-secret integration pointer at `~/.kinjito/config.json`. It never stores a
GitHub token there. Release builds suggest `Documents/Kinjito/vault`, outside
the software checkout.

## Development

```bash
npm install
npm run check
npm run dev:desktop
npm run build -w apps/desktop
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

On first run choose one of: create a local Vault, open/import an existing Vault,
or clone a Vault Git repository. Git init/status/remote/pull-rebase/push/sync
operate only when the active Vault itself is the repository root; a parent
software repository is never treated as the Vault repository.

## AI authoring workflow

Kinjito regenerates authoring context from current Vault files. AI proposals are
validated and previewed before an apply plan is written. `.wawapkg` is an
explicit portable import/export format; ExerciseSet import is append-only by
problem id and conflicts never overwrite silently. Generated `.kb-ai/` context,
history, cache, backups, and exports remain local/ignored by default.

See [the protocol contract](docs/kinjito-protocol.md),
[desktop installation](docs/install-desktop.md), and
[release checklist](docs/release-checklist.md).
