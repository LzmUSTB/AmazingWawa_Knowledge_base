use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
struct VaultRawFiles {
    vault_yaml: String,
    domains_yaml: String,
    graph_yaml: String,
    graph_layout_yaml: String,
    meta_files: HashMap<String, String>,
    note_files: HashMap<String, String>,
    block_type_files: HashMap<String, String>,
}

#[derive(Serialize)]
struct AiImportPackageSummary {
    package_id: String,
    relative_path: String,
}

#[derive(Serialize)]
struct AiImportPackageFiles {
    package_id: String,
    manifest_raw: String,
    sources_raw: String,
    patch_raw: String,
    generated_meta_files: HashMap<String, String>,
    generated_note_files: HashMap<String, String>,
    block_type_files: HashMap<String, String>,
    review_files: HashMap<String, String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiImportPlanWrite {
    relative_path: String,
    contents: String,
    create_only: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiImportApplyPlan {
    package_id: String,
    backup_relative_dir: String,
    backup_paths: Vec<String>,
    create_dirs: Vec<String>,
    writes: Vec<AiImportPlanWrite>,
}

fn is_safe_package_id(package_id: &str) -> bool {
    package_id.starts_with("ai-import-")
        && package_id
            .chars()
            .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-')
}

fn safe_join(root: &str, relative_path: &str) -> Result<PathBuf, String> {
    let root_path = PathBuf::from(root);
    let full_path = root_path.join(relative_path);
    let canonical_root = root_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_parent = full_path
        .parent()
        .unwrap_or(&root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve target path: {error}"))?;

    if !canonical_parent.starts_with(&canonical_root) {
        return Err("Refusing to access a path outside the vault root".into());
    }

    Ok(full_path)
}

fn safe_vault_path(root: &str, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path);
    if relative.is_absolute()
        || relative
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_) | Component::RootDir))
    {
        return Err("Refusing to access a path outside the vault root".into());
    }

    let root_path = PathBuf::from(root);
    let canonical_root = root_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    Ok(canonical_root.join(relative))
}

fn read_required(root: &Path, relative_path: &str) -> Result<String, String> {
    fs::read_to_string(root.join(relative_path))
        .map_err(|error| format!("Failed to read {relative_path}: {error}"))
}

fn looks_like_vault(path: &Path) -> bool {
    path.join("vault.yaml").is_file()
        && path.join("domains.yaml").is_file()
        && path.join("graph.yaml").is_file()
        && path.join("content").is_dir()
}

fn push_vault_candidates(base: &Path, candidates: &mut Vec<PathBuf>) {
    candidates.push(base.join("vault"));
    candidates.push(base.join("..").join("vault"));
    candidates.push(base.join("..").join("..").join("vault"));
    candidates.push(base.join("..").join("..").join("..").join("vault"));
}

fn read_content_files(
    root: &Path,
    current: &Path,
    target_name: &str,
    output: &mut HashMap<String, String>,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| {
        format!(
            "Failed to read directory {}: {error}",
            current.to_string_lossy()
        )
    })? {
        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            read_content_files(root, &path, target_name, output)?;
        } else if path.file_name().and_then(|name| name.to_str()) == Some(target_name) {
            let key = path
                .strip_prefix(root)
                .map_err(|error| format!("Failed to make relative path: {error}"))?
                .to_string_lossy()
                .replace('\\', "/");
            let contents = fs::read_to_string(&path)
                .map_err(|error| format!("Failed to read {}: {error}", path.to_string_lossy()))?;
            output.insert(key, contents);
        }
    }

    Ok(())
}

fn read_yaml_files_in_directory(
    root: &Path,
    relative_dir: &str,
    output: &mut HashMap<String, String>,
) -> Result<(), String> {
    let dir = root.join(relative_dir);
    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(&dir).map_err(|error| {
        format!(
            "Failed to read directory {}: {error}",
            dir.to_string_lossy()
        )
    })? {
        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let extension = path.extension().and_then(|value| value.to_str());
        if !matches!(extension, Some("yaml") | Some("yml")) {
            continue;
        }
        let key = path
            .strip_prefix(root)
            .map_err(|error| format!("Failed to make relative path: {error}"))?
            .to_string_lossy()
            .replace('\\', "/");
        let contents = fs::read_to_string(&path)
            .map_err(|error| format!("Failed to read {}: {error}", path.to_string_lossy()))?;
        output.insert(key, contents);
    }

    Ok(())
}

fn read_package_files(
    package_root: &Path,
    current: &Path,
    output: &mut HashMap<String, String>,
    predicate: fn(&Path) -> bool,
) -> Result<(), String> {
    if !current.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(current).map_err(|error| {
        format!(
            "Failed to read directory {}: {error}",
            current.to_string_lossy()
        )
    })? {
        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            read_package_files(package_root, &path, output, predicate)?;
        } else if path.is_file() && predicate(&path) {
            let key = path
                .strip_prefix(package_root)
                .map_err(|error| format!("Failed to make relative path: {error}"))?
                .to_string_lossy()
                .replace('\\', "/");
            let contents = fs::read_to_string(&path)
                .map_err(|error| format!("Failed to read {}: {error}", path.to_string_lossy()))?;
            output.insert(key, contents);
        }
    }
    Ok(())
}

#[tauri::command]
fn choose_vault_root() -> Result<Option<String>, String> {
    if !cfg!(target_os = "windows") {
        return Err("Folder picker command is currently implemented for Windows only".into());
    }

    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Open Knowledge Vault'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to open folder picker: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let selected_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected_path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(selected_path))
    }
}

#[tauri::command]
fn read_vault_files(vault_root_path: String) -> Result<VaultRawFiles, String> {
    let root = PathBuf::from(&vault_root_path);
    if !root.is_dir() {
        return Err("Vault root is not a directory".into());
    }

    for required_path in ["vault.yaml", "domains.yaml", "graph.yaml", "content"] {
        if !root.join(required_path).exists() {
            return Err(format!("Invalid vault: missing {required_path}"));
        }
    }

    let mut meta_files = HashMap::new();
    let mut note_files = HashMap::new();
    let mut block_type_files = HashMap::new();
    read_content_files(&root, &root.join("content"), "meta.yaml", &mut meta_files)?;
    read_content_files(&root, &root.join("content"), "note.md", &mut note_files)?;
    read_yaml_files_in_directory(&root, "block-types", &mut block_type_files)?;

    Ok(VaultRawFiles {
        vault_yaml: read_required(&root, "vault.yaml")?,
        domains_yaml: read_required(&root, "domains.yaml")?,
        graph_yaml: read_required(&root, "graph.yaml")?,
        graph_layout_yaml: fs::read_to_string(root.join("graph-layout.yaml")).unwrap_or_default(),
        meta_files,
        note_files,
        block_type_files,
    })
}

#[tauri::command]
fn list_ai_import_packages(vault_root_path: String) -> Result<Vec<AiImportPackageSummary>, String> {
    let imports_dir = safe_vault_path(&vault_root_path, ".kb-ai/imports")?;
    if !imports_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut packages = Vec::new();
    for entry in fs::read_dir(&imports_dir).map_err(|error| {
        format!(
            "Failed to read directory {}: {error}",
            imports_dir.to_string_lossy()
        )
    })? {
        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let package_id = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();
        if !is_safe_package_id(&package_id) || !path.join("manifest.yaml").is_file() {
            continue;
        }
        packages.push(AiImportPackageSummary {
            relative_path: format!(".kb-ai/imports/{package_id}"),
            package_id,
        });
    }
    packages.sort_by(|left, right| left.package_id.cmp(&right.package_id));
    Ok(packages)
}

#[tauri::command]
fn read_ai_import_package_files(
    vault_root_path: String,
    package_id: String,
) -> Result<AiImportPackageFiles, String> {
    if !is_safe_package_id(&package_id) {
        return Err("Invalid AI import package id".into());
    }
    let package_root = safe_vault_path(&vault_root_path, &format!(".kb-ai/imports/{package_id}"))?;
    if !package_root.is_dir() {
        return Err(format!("AI import package not found: {package_id}"));
    }

    let mut generated_meta_files = HashMap::new();
    let mut generated_note_files = HashMap::new();
    let mut block_type_files = HashMap::new();
    let mut review_files = HashMap::new();
    read_package_files(&package_root, &package_root.join("generated").join("content"), &mut generated_meta_files, |path| {
        path.file_name().and_then(|name| name.to_str()) == Some("meta.yaml")
    })?;
    read_package_files(&package_root, &package_root.join("generated").join("content"), &mut generated_note_files, |path| {
        path.file_name().and_then(|name| name.to_str()) == Some("note.md")
    })?;
    read_package_files(&package_root, &package_root.join("block-types"), &mut block_type_files, |path| {
        matches!(path.extension().and_then(|value| value.to_str()), Some("yaml") | Some("yml"))
    })?;
    read_package_files(&package_root, &package_root.join("review"), &mut review_files, |_| true)?;

    Ok(AiImportPackageFiles {
        package_id,
        manifest_raw: fs::read_to_string(package_root.join("manifest.yaml")).unwrap_or_default(),
        sources_raw: fs::read_to_string(package_root.join("sources.yaml")).unwrap_or_default(),
        patch_raw: fs::read_to_string(package_root.join("patch.yaml")).unwrap_or_default(),
        generated_meta_files,
        generated_note_files,
        block_type_files,
        review_files,
    })
}

#[tauri::command]
fn apply_ai_import_plan(vault_root_path: String, plan: AiImportApplyPlan) -> Result<(), String> {
    if !is_safe_package_id(&plan.package_id) {
        return Err("Invalid AI import package id".into());
    }
    if plan.backup_relative_dir != format!(".kb-ai/backups/{}", plan.package_id) {
        return Err("Invalid backup directory for AI import package".into());
    }

    for relative_dir in &plan.create_dirs {
        fs::create_dir_all(safe_vault_path(&vault_root_path, relative_dir)?)
            .map_err(|error| format!("Failed to create {relative_dir}: {error}"))?;
    }

    for relative_path in &plan.backup_paths {
        let source = safe_vault_path(&vault_root_path, relative_path)?;
        if !source.exists() {
            continue;
        }
        let backup_relative_path = format!("{}/{}", plan.backup_relative_dir, relative_path);
        let target = safe_vault_path(&vault_root_path, &backup_relative_path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create backup directory: {error}"))?;
        }
        fs::copy(&source, &target).map_err(|error| {
            format!(
                "Failed to backup {} to {}: {error}",
                source.to_string_lossy(),
                target.to_string_lossy()
            )
        })?;
    }

    for write in &plan.writes {
        let target = safe_vault_path(&vault_root_path, &write.relative_path)?;
        if write.create_only && target.exists() {
            return Err(format!("Refusing to overwrite existing file: {}", write.relative_path));
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create target directory: {error}"))?;
        }
        fs::write(&target, &write.contents)
            .map_err(|error| format!("Failed to write {}: {error}", target.to_string_lossy()))?;
    }

    Ok(())
}

#[tauri::command]
fn resolve_default_vault_root() -> Result<Option<String>, String> {
    let mut candidates = Vec::new();

    if let Ok(env_path) = std::env::var("AMAZINGWAWA_DEFAULT_VAULT") {
        candidates.push(PathBuf::from(env_path));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        push_vault_candidates(&current_dir, &mut candidates);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    push_vault_candidates(&manifest_dir, &mut candidates);

    for candidate in candidates {
        let normalized_candidate = candidate
            .canonicalize()
            .unwrap_or(candidate.clone());
        if looks_like_vault(&normalized_candidate) {
            return Ok(Some(normalized_candidate.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
fn write_text_file(
    vault_root_path: String,
    relative_path: String,
    contents: String,
) -> Result<(), String> {
    let target_path = safe_join(&vault_root_path, &relative_path)?;
    fs::write(&target_path, contents)
        .map_err(|error| format!("Failed to write {}: {error}", target_path.to_string_lossy()))
}

#[tauri::command]
fn read_text_file(vault_root_path: String, relative_path: String) -> Result<String, String> {
    let target_path = safe_join(&vault_root_path, &relative_path)?;
    fs::read_to_string(&target_path)
        .map_err(|error| format!("Failed to read {}: {error}", target_path.to_string_lossy()))
}

#[tauri::command]
fn create_dir_all(vault_root_path: String, relative_path: String) -> Result<(), String> {
    let target_path = safe_vault_path(&vault_root_path, &relative_path)?;
    fs::create_dir_all(&target_path)
        .map_err(|error| format!("Failed to create {}: {error}", target_path.to_string_lossy()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            apply_ai_import_plan,
            choose_vault_root,
            create_dir_all,
            list_ai_import_packages,
            read_ai_import_package_files,
            read_text_file,
            read_vault_files,
            resolve_default_vault_root,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
