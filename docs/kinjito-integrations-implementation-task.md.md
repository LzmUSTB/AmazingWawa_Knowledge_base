# Codex implementation task: Kinjito App + Integrations + external Git Vault

You are working on the current repository:

`https://github.com/LzmUSTB/AmazingWawa_Knowledge_base`

Your task is to extend the existing architecture, not replace it. The final system must support:

1. The Kinjito desktop application can be downloaded and installed independently.
2. Knowledge data is stored in a separate user-controlled Vault directory and can be its own Git/GitHub repository.
3. Users can separately install a Kinjito Agent Skill for Codex.
4. Ordinary ChatGPT conversations can connect to a Kinjito remote MCP App and use the current conversation to create reviewed knowledge-base changes.
5. Every invocation reads the latest Vault state before generating or applying changes.
6. GPT-generated changes are previewed and validated first; remote writes create a branch and pull request and never push directly to the default branch.

Do not invent a new data model. Reuse the current Vault, AI-context, ExerciseSet, `.wawapkg`, validation, diff, apply-plan, Git, and active-Vault mechanisms already present in the repository.

---

## 0. Mandatory repository audit

Before editing anything:

```bash
git status --short
git rev-parse --show-toplevel
git rev-parse HEAD
git branch --show-current
git log -10 --oneline
```

Read the current versions of at least these files:

```text
README.md
AGENTS.md
package.json
.gitignore
apps/desktop/package.json
apps/desktop/src/data/desktop-vault-adapter.js
apps/desktop/src-tauri/src/lib.rs
apps/desktop/src-tauri/tauri.conf.json
packages/knowledge-core/package.json
packages/knowledge-core/src/index.js
packages/knowledge-core/src/schema.js
packages/knowledge-core/src/build-exercise-index.js
packages/knowledge-core/src/normalize-vault.js
packages/knowledge-core/src/ai-context/build-ai-context-files.js
packages/knowledge-core/src/ai-context/static-context-files.js
packages/knowledge-core/src/ai-import/validate-ai-package.js
packages/knowledge-core/src/ai-import/diff-ai-package.js
packages/knowledge-core/src/ai-import/build-ai-package-apply-plan.js
packages/knowledge-core/src/ai-import/normalize-ai-package-files.js
packages/knowledge-core/src/wawapkg/wawapkg.js
packages/knowledge-core/scripts/export-ai-context.js
packages/knowledge-core/scripts/validate-ai-import.js
packages/knowledge-core/scripts/diff-ai-import.js
packages/knowledge-core/scripts/apply-ai-import.js
packages/knowledge-core/scripts/pack-ai-import.js
packages/knowledge-core/scripts/reset-fixture-vault.js
```

Also inspect the current desktop components related to:

- first-run Vault selection;
- create/open/clone/move Vault;
- Git status, init, remote, pull, push, sync and history;
- AI context export;
- `.wawapkg` inspection, validation, preview and apply;
- ExerciseSet import/export and progress.

Do not trust old documentation when it conflicts with executable code. Record the audited repository HEAD in the implementation report.

Do not modify a real user Vault during development or tests. Use only temporary directories and existing fixture/test Vaults.

---

## 1. Preserve the current architecture

The implementation must preserve these concepts:

```text
Software repository
├─ apps/desktop          Tauri 2 + Vue 3 desktop app
├─ apps/viewer           web/mobile viewer
└─ packages/knowledge-core

User Vault repository
├─ vault.yaml
├─ domains.yaml
├─ graph.yaml
├─ graph-layout.yaml     optional/generated layout state
├─ content/
│  └─ <domain>/<node-id>/
│     ├─ meta.yaml
│     ├─ note.md OR note.html
│     ├─ exercises.yaml  optional, maximum one ExerciseSet per node
│     └─ assets/
├─ block-types/
├─ templates/
├─ .kinjito/
│  └─ exercise-progress.yaml
└─ .kb-ai/               generated/import history/cache; ignored by Vault Git by default
```

The software repository and user Vault must remain independently cloneable and independently versioned. Do not use a Git submodule or Git subtree for the user Vault or the integrations repository.

The desktop application must continue to treat `activeVaultPath` as the authoritative local Vault location. In development, an ignored repository-local `vault/` may still be used as a fixture/convenience path; release builds must default outside the software repository.

Keep the current project language policy: JavaScript/ESM for application and shared JavaScript packages unless a specific existing subsystem already uses Rust. Do not migrate the project to TypeScript as part of this task.

---

## 2. First fix the shared protocol boundary

The future MCP server and Codex Skill runtime must not reimplement or copy the Vault rules independently.

Create a stable publishable protocol package. Prefer:

```text
packages/kinjito-protocol/
```

with package name:

```text
@kinjito/protocol
```

If the audit proves that `packages/knowledge-core` can be made safely publishable without exposing UI-specific or browser-only internals, refactoring that package instead is acceptable. In either case, there must be exactly one executable source of truth for the protocol.

The protocol package must expose documented ESM APIs for:

- Vault schema constants and allowed relation/node/status values;
- ExerciseSet modes, types, difficulties and validation;
- raw-file-map to normalized Vault conversion;
- AI authoring-context generation;
- `.wawapkg` read, write/pack and normalization;
- AI proposal/package validation;
- duplicate detection;
- diff generation;
- apply-plan generation without directly touching the filesystem;
- protocol/version metadata.

Add explicit package dependencies and export maps. Do not rely on undeclared root-workspace dependencies.

### Mandatory `.wawapkg` parity work

Audit and reconcile the current Rust and JavaScript `.wawapkg` implementations. There must be one documented contract for:

- package mimetype;
- schema version;
- required top-level files;
- supported operations;
- `note.md` and `note.html`;
- `exercises.yaml`;
- block types;
- asset extensions;
- path traversal protection;
- symlink rejection;
- file count and size limits;
- UTF-8 handling;
- ZIP compression methods.

The Node implementation, Rust implementation, CLI packer and desktop importer must accept and reject the same contract. Do not weaken the existing safety checks.

Add shared contract fixtures covering at least:

1. empty node;
2. Markdown note;
3. HTML note with local CSS/JS/image assets;
4. ExerciseSet append;
5. custom block type;
6. unsafe `../` archive path;
7. forbidden executable file;
8. duplicate problem id with identical content;
9. duplicate problem id with conflicting content;
10. stale base/head conflict.

Both JavaScript tests and Rust tests must consume the same fixtures where practical.

---

## 3. Keep the current ExerciseSet semantics unchanged

Do not regress the current distinction between `recall` and `practice`.

Requirements:

- Allowed modes remain `recall` and `practice`.
- `diagnostic` is a problem type and must use `mode: practice`.
- `recall` is reserved for definitions, formulas, named terms/theorems, symbol conventions and durable reusable rules.
- Calculations, proofs, derivations, applications, comparisons, implementations, diagnostics and reasoning-based conceptual questions use `practice`.
- Practice progress stores only the latest `userAnswer`, `result`, `answeredAt` and `updatedAt`.
- Practice content/progress must not add attempts, accuracy, attemptsLog, mastery, ease, interval, mistake tags, weakness categories or AI judgement.
- Recall scheduling/progress remains separate in `.kinjito/exercise-progress.yaml`.
- ExerciseSet import remains append-only by problem id and must not silently overwrite a conflict.

Add regression tests for these rules in the shared protocol package and desktop integration.

---

## 4. Finish software/data separation in the desktop app

Reuse the current Vault settings and Git UI rather than adding a parallel settings system.

Implement or verify the following user flow:

```text
First run
├─ Create a new local Vault
├─ Open an existing Vault
└─ Clone a Vault from Git/GitHub
```

After activation, the app must be able to:

- initialize Git inside that Vault itself;
- set/test the remote;
- show grouped changes;
- commit, pull with rebase, push and sync;
- detect conflicts and dirty working trees;
- avoid treating a parent software repository as the Vault repository;
- avoid accidentally tracking the local development `vault/` in the software repository.

Add a stable, non-secret local integration pointer for Codex tools:

```text
~/.kinjito/config.json
```

Equivalent user-home paths must work cross-platform. Suggested shape:

```json
{
  "version": 1,
  "activeVaultPath": "...",
  "remoteUrl": "...",
  "updatedAt": "..."
}
```

The desktop app must update this pointer whenever a Vault is created, opened, cloned, moved or activated. Do not store GitHub tokens or other credentials in this file.

Update stale `README.md` and `AGENTS.md` statements that still imply the software repository's tracked `vault/` is the permanent source of truth. Clearly document:

- software repository;
- external active Vault;
- optional ignored development Vault;
- separate Vault Git repository;
- AI context and `.wawapkg` workflows.

---

## 5. Prepare standalone desktop releases

Keep the existing Tauri application structure. Do not create a second desktop application.

Make the user-facing product name and window title `Kinjito`, while preserving compatibility with existing settings. If changing the Tauri identifier would break settings or installed data, keep the identifier and document that decision rather than silently changing it.

Add a GitHub Actions release workflow that:

- builds from a version tag;
- runs JavaScript and Rust tests first;
- builds supported Tauri installers/artifacts;
- uploads artifacts to a GitHub Release;
- does not require signing credentials for local/test builds;
- clearly documents optional Windows/macOS signing secrets without inventing them.

Add installation documentation and a release checklist. The installer must not bundle or overwrite a user's knowledge Vault.

---

## 6. Create a separate integrations repository

Create a sibling local repository named:

```text
Kinjito-Integrations
```

Do not add it as a submodule of the application repository.

If GitHub CLI is authenticated and the remote repository does not exist, create:

```text
LzmUSTB/Kinjito-Integrations
```

Otherwise initialize the local repository, complete the implementation, and report the exact `gh repo create` / `git remote add` commands required. Do not fail the whole task only because remote creation credentials are unavailable.

Use a structure close to:

```text
Kinjito-Integrations/
├─ README.md
├─ package.json
├─ apps/
│  └─ mcp-server/
├─ packages/
│  ├─ github-vault-adapter/
│  └─ local-vault-runtime/
├─ skills/
│  └─ kinjito/
│     ├─ SKILL.md
│     └─ references/
├─ scripts/
│  ├─ install-skill.ps1
│  ├─ install-skill.sh
│  ├─ uninstall-skill.ps1
│  └─ uninstall-skill.sh
├─ docs/
└─ tests/
```

Adjust names only when the actual implementation gives a concrete reason. Keep the repository focused on integrations; do not copy the desktop UI or user knowledge data into it.

The integrations repository must consume a pinned version of `@kinjito/protocol`. During initial local development, `npm pack` may be used to test an unpublished package, but committed release configuration must not depend on an absolute local path. Prepare package/release automation; do not publish to a public registry without configured credentials.

---

## 7. Implement the Codex Agent Skill

Create a standard Agent Skill under:

```text
skills/kinjito/SKILL.md
```

The installer scripts must copy/update it into:

```text
Windows: %USERPROFILE%\.agents\skills\kinjito
macOS/Linux: ~/.agents/skills/kinjito
```

No administrator permission should be required. The scripts must be idempotent and must support uninstall.

The Skill must cover these intents:

- import knowledge from the current conversation;
- propose/revise node architecture;
- create one node note;
- create one ExerciseSet;
- create or repair a `.wawapkg`;
- inspect existing Vault knowledge before creating duplicates;
- validate a proposal before writing;
- create a Git branch/pull request when the GitHub-backed MCP tools are available.

Skill behavior:

1. Always load the latest workspace/Vault state before authoring.
2. Prefer MCP tools when available.
3. In local Codex, fall back to `~/.kinjito/config.json` and the local runtime.
4. Never assume access to arbitrary historical ChatGPT conversations.
5. For another conversation, instruct the user to invoke Kinjito in that source conversation or provide exported/pasted content.
6. Do not generate a `.wawapkg` unless explicitly requested.
7. For a broad chat import, first return a node/relation/note/exercise plan.
8. Do not write until validation succeeds and the user has approved the plan.
9. Default to one note or one ExerciseSet at a time unless the user explicitly approves a larger package.
10. Follow the current locale, node, relation, note, asset and ExerciseSet rules returned by the live context.

The Skill must not contain GitHub tokens, fixed user paths, copied user Vault data or stale generated indexes.

---

## 8. Implement a local Vault runtime for Codex

Create a CLI/runtime in the integrations repository that:

- resolves the Vault from an explicit `--vault` option, then `KINJITO_VAULT_PATH`, then `~/.kinjito/config.json`;
- reads the current files from disk on every command or invalidates cache by file state;
- uses `@kinjito/protocol` to normalize and validate the Vault;
- can print workspace state, authoring context and search results as JSON;
- can validate a proposed import/package without applying it;
- can create a `.wawapkg` in an explicitly selected output directory;
- never writes to a real Vault without an explicit apply/commit option;
- supports dry run by default.

Suggested commands:

```text
kinjito workspace-state
kinjito context [--domain ...] [--node ...]
kinjito search <query>
kinjito validate-proposal <proposal.json>
kinjito build-wawapkg <proposal.json> --output <path>
```

Do not add an OpenAI API dependency. Content generation is performed by the Codex/ChatGPT model using the Skill; the runtime supplies current data, validation and deterministic file operations.

---

## 9. Implement the GitHub-backed remote MCP App

Build a remote MCP server in `apps/mcp-server` using the current stable official MCP SDK and current OpenAI Apps/MCP requirements. Verify official documentation at implementation time; do not guess deprecated APIs.

The server must not call the OpenAI API to generate knowledge. The conversational model creates a structured proposal and passes it to deterministic MCP tools.

### Read-only tools

Implement at least:

```text
kinjito_get_workspace_state
kinjito_get_authoring_context
kinjito_search_knowledge
kinjito_validate_proposal
```

Every read result must include:

```text
repository
ref/branch
headSha
protocolVersion
vaultSchemaVersion
generatedAt
```

The server must fetch the latest branch HEAD at the start of every operation. Cache only by immutable commit SHA, with a short bounded cache. Do not treat `.kb-ai/context` as the remote source of truth because it is generated and normally ignored. Reconstruct the raw-file map from the Vault repository and generate context in memory through `@kinjito/protocol`.

### Write tool

Implement:

```text
kinjito_create_import_pull_request
```

Input must include:

- repository;
- base branch/ref;
- `expectedHeadSha` obtained during preview;
- structured proposal/package data;
- PR title/body metadata.

Required behavior:

1. Fetch current branch HEAD again.
2. Reject the request if it differs from `expectedHeadSha`.
3. Normalize the current Vault.
4. Validate the proposal with `@kinjito/protocol`.
5. Generate diff and apply plan.
6. Reject validation errors and path conflicts.
7. Create a new branch named similar to `kinjito/chat-import/<timestamp>-<short-id>`.
8. Commit only the files in the validated apply plan.
9. Open a pull request against the configured base branch.
10. Return PR URL, branch, base SHA, new commit SHA, created files, modified files, warnings and validation summary.
11. Never push directly to the default branch.
12. Never force-push.

Add an optional read-only `kinjito_build_wawapkg` resource/tool only after the same proposal successfully validates. Do not commit generated `.wawapkg` files to the Vault by default.

### Authentication and permissions

Use a GitHub App with repository selection limited to user-approved Vault repositories. Prefer installation tokens over personal access tokens.

Provide:

- local development mode using an environment-provided token;
- production GitHub App configuration;
- MCP/OAuth setup documentation;
- `.env.example` with names only, no secrets;
- minimal required permission documentation;
- CSRF/state validation and secure session handling;
- no logging of tokens or full private note contents.

If credentials are unavailable, implement and test the adapters with mocks and local fixtures, and leave exact setup instructions. Do not embed temporary credentials.

---

## 10. Proposal format

Define and document a versioned proposal envelope. It should map cleanly to the existing `.wawapkg` package files and apply-plan logic, for example:

```json
{
  "protocolVersion": "1.x",
  "packageId": "wawa-import-...",
  "source": {
    "type": "chat",
    "title": "...",
    "capturedAt": "..."
  },
  "operations": [],
  "generatedTextFiles": {},
  "generatedBinaryFiles": {},
  "reviewFiles": {}
}
```

Do not invent database-only entities. Convert the envelope deterministically into the current `manifest.yaml`, `sources.yaml`, `patch.yaml`, `generated/` and `review/` model before validation.

The source text from the current chat is model input, not automatically persisted in full. Store only source metadata unless the user explicitly requests retaining the conversation text.

---

## 11. Tests and acceptance criteria

Add automated tests for:

- external Vault creation/open/clone settings behavior;
- integration config pointer updates;
- parent repository is not mistaken for the Vault repository;
- protocol package exports and declared dependencies;
- Rust/JavaScript `.wawapkg` parity;
- current node/relation/contentFormat validation;
- recall/practice/diagnostic rules;
- append-only ExerciseSet behavior;
- latest-HEAD context generation;
- immutable-SHA caching;
- stale `expectedHeadSha` rejection;
- no direct default-branch writes;
- path traversal and symlink rejection;
- private repository adapter mocks;
- Skill install/update/uninstall on Windows paths and POSIX paths;
- no secrets in generated files or logs.

Run all existing tests and builds. Add real scripts instead of leaving the root `check` script as a placeholder if practical.

At minimum report the results of:

```bash
npm install
npm run check
npm run build -w apps/desktop
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Also run the integrations repository's test, lint/check and package commands.

Acceptance is not met by documentation-only scaffolding. At minimum the following must work locally with fixtures:

1. install the Codex Skill;
2. resolve a local active Vault;
3. read current workspace/context;
4. search existing nodes;
5. validate a proposal;
6. build a valid `.wawapkg`;
7. simulate a GitHub PR write through mocked GitHub APIs;
8. reject a stale HEAD and unsafe package.

---

## 12. Safety and scope rules

- Do not delete, move or rewrite unrelated user files.
- Do not reset or clean the working tree.
- Do not edit a real external Vault.
- Do not commit tokens, credentials, private notes or conversation exports.
- Do not add automatic AI answer judging.
- Do not add new relation types.
- Do not turn Stage/layout data into knowledge or learning-path entities.
- Do not bypass current `.wawapkg` validation.
- Do not duplicate protocol rules between repositories.
- Do not create a submodule.
- Do not silently publish packages or deploy a server.
- Do not claim arbitrary access to all ChatGPT history.
- Do not stop at a plan when implementation is possible with local fixtures and mocks.

---

## 13. Final output required from Codex

At completion, provide:

1. audited application repository HEAD;
2. concise architecture summary;
3. exact files added/changed in each repository;
4. protocol compatibility decision and version;
5. commands run and their results;
6. tests that remain unavailable and the precise reason;
7. local installation instructions for Kinjito desktop and Codex Skill;
8. local MCP development instructions;
9. GitHub App and remote MCP deployment checklist;
10. exact manual commands still required to create/push the integrations remote, publish the protocol package or configure secrets;
11. known limitations, especially that another ChatGPT conversation must be invoked directly or explicitly supplied.

Use small, reviewable commits grouped by milestone. Do not combine unrelated refactors into a single commit.
