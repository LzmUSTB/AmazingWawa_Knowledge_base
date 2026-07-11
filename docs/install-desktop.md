# Install Kinjito desktop

## Release artifact

Download the installer for your operating system from the matching versioned
GitHub Release and run it as a normal user. Signing/notarization status is shown
in release notes. The installer contains the application only: it never bundles,
moves, deletes, or overwrites a Vault.

The Tauri identifier remains `com.amazingwawa.knowledge_base.desktop` to retain
compatibility with existing application settings. The product and window title
are `Kinjito`.

## Local unsigned build

```bash
npm install
npm run check
npm run tauri build -w apps/desktop
```

Unsigned local builds require no signing secrets. On first run, create, open, or
clone an external Vault. Development builds may suggest the ignored local
`vault/`; release builds default to `Documents/Kinjito/vault`.
