# Development Vault Workflow

## Real Vault Only

The desktop app does not use a mock graph fallback or a static sample vault.

The repository `./vault` directory is the default real vault during development. It is loaded through Tauri filesystem commands, not through Vite raw imports.

## Load Order

On startup, the desktop app tries:

1. The last opened vault path stored in localStorage.
2. The repository `./vault` resolved by the Tauri `resolve_default_vault_root` command.
3. If neither can be loaded, the app shows `No Vault Loaded`.

Users can choose another real vault folder with `Open Vault`. The selected folder must contain `vault.yaml`.

## Frontend Boundary

Frontend source must not import files from `vault/**` with `?raw` or `import.meta.glob`.

Vault data enters the app through Tauri commands such as `read_vault_files`, `read_text_file`, and `write_text_file`.

## Browser Mode

Non-Tauri browser mode cannot access the desktop filesystem. In that mode, the app shows the no-vault/desktop-required message instead of loading fake data.

## HMR

Vite ignores `vault/**` changes. Saving `note.md` or `graph-layout.yaml` should not trigger frontend HMR.
