# Kinjito release checklist

1. Update compatible versions in root, desktop, Tauri, Cargo, and protocol manifests.
2. Run `npm ci`, `npm run check`, desktop build, Rust tests, and protocol pack dry-run.
3. Verify a temporary external Vault create/open/clone flow and `~/.kinjito/config.json`.
4. Verify no Vault data, `.env`, token, certificate, or signing material is tracked.
5. Tag `vX.Y.Z` and push the tag. The release workflow builds platform artifacts.
6. Review generated draft release artifacts before publishing the GitHub Release.
7. If signing is enabled, configure repository secrets documented in the workflow;
   never commit certificates, passwords, Apple credentials, or private keys.
