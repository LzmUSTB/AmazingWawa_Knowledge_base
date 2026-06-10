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
struct AiImportPackageFiles {
    package_id: String,
    external_root_path: String,
    imported_from_external: bool,
    package_file_path: String,
    package_format: String,
    manifest_raw: String,
    sources_raw: String,
    patch_raw: String,
    generated_meta_files: HashMap<String, String>,
    generated_note_files: HashMap<String, String>,
    asset_files: Vec<AiImportAssetFile>,
    block_type_files: HashMap<String, String>,
    review_files: HashMap<String, String>,
}

#[derive(Serialize)]
struct AiImportAssetFile {
    vault_relative_path: String,
    package_relative_path: String,
    base64: String,
    mime_type: String,
    size: u64,
}

const WAWAPKG_MIMETYPE: &str = "application/x-wawa-kb-ai-import-package";
const MAX_WAWAPKG_TOTAL_SIZE: u64 = 100 * 1024 * 1024;
const MAX_WAWAPKG_FILE_SIZE: u64 = 20 * 1024 * 1024;
const MAX_WAWAPKG_FILE_COUNT: usize = 1000;

#[derive(Serialize)]
struct AiImportHistory {
    applied: bool,
    applied_at: String,
    raw: String,
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
struct AiImportPlanBinaryWrite {
    relative_path: String,
    base64: String,
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
    binary_writes: Vec<AiImportPlanBinaryWrite>,
}

fn is_safe_package_id(package_id: &str) -> bool {
    (package_id.starts_with("ai-import-") || package_id.starts_with("wawa-import-"))
        && package_id
            .chars()
            .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-')
}

fn package_id_from_manifest(raw: &str) -> Result<String, String> {
    for line in raw.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("packageId:") {
            let package_id = rest.trim().trim_matches('"').trim_matches('\'').to_string();
            if is_safe_package_id(&package_id) {
                return Ok(package_id);
            }
            return Err("Invalid packageId in manifest.yaml".into());
        }
    }
    Err("manifest.yaml is missing packageId".into())
}

fn allowed_ai_apply_path(relative_path: &str) -> bool {
    relative_path == "domains.yaml"
        || relative_path == "graph.yaml"
        || relative_path == "vault.yaml"
        || relative_path.starts_with("content/")
        || relative_path.starts_with("block-types/")
        || relative_path == ".kb-ai/history"
        || relative_path.starts_with(".kb-ai/history/")
        || relative_path == ".kb-ai/backups"
        || relative_path.starts_with(".kb-ai/backups/")
}

fn read_u16(data: &[u8], offset: usize) -> Result<u16, String> {
    if offset + 2 > data.len() {
        return Err("Invalid zip: unexpected end of file".into());
    }
    Ok(u16::from_le_bytes([data[offset], data[offset + 1]]))
}

fn read_u32(data: &[u8], offset: usize) -> Result<u32, String> {
    if offset + 4 > data.len() {
        return Err("Invalid zip: unexpected end of file".into());
    }
    Ok(u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]))
}

fn normalize_zip_entry_path(entry_path: &str) -> Result<String, String> {
    let normalized = entry_path.replace('\\', "/");
    let trimmed = normalized.trim_end_matches('/');
    if normalized.is_empty()
        || normalized.starts_with('/')
        || normalized.contains("../")
        || normalized.contains("/..")
        || trimmed.split('/').any(|part| part == ".." || part.is_empty())
        || normalized.as_bytes().get(1) == Some(&b':')
    {
        return Err(format!("Invalid .wawapkg: unsafe path {entry_path}"));
    }
    Ok(normalized)
}

fn forbidden_wawapkg_extension(entry_path: &str) -> bool {
    let lower = entry_path.to_ascii_lowercase();
    [".js", ".ts", ".vue", ".css", ".html", ".exe", ".dll", ".bat", ".cmd", ".sh", ".ps1", ".jar", ".wasm"]
        .iter()
        .any(|extension| lower.ends_with(extension))
}

fn allowed_wawapkg_top_level(entry_path: &str) -> bool {
    let top = entry_path.split('/').next().unwrap_or("");
    matches!(top, "mimetype" | "manifest.yaml" | "sources.yaml" | "patch.yaml" | "generated" | "block-types" | "review")
        || top == "__MACOSX"
        || entry_path.ends_with(".DS_Store")
}

fn asset_entry(entry_path: &str) -> bool {
    entry_path.starts_with("generated/content/") && entry_path.contains("/assets/")
}

fn extension_of(entry_path: &str) -> String {
    Path::new(entry_path)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!(".{}", value.to_ascii_lowercase()))
        .unwrap_or_default()
}

fn allowed_asset_extension(entry_path: &str) -> bool {
    matches!(
        extension_of(entry_path).as_str(),
        ".csv"
            | ".gif"
            | ".jpeg"
            | ".jpg"
            | ".json"
            | ".md"
            | ".mp3"
            | ".mp4"
            | ".pdf"
            | ".png"
            | ".txt"
            | ".wav"
            | ".webm"
            | ".webp"
            | ".yaml"
            | ".yml"
    )
}

fn asset_mime_type(entry_path: &str) -> &'static str {
    match extension_of(entry_path).as_str() {
        ".csv" => "text/csv",
        ".gif" => "image/gif",
        ".jpeg" | ".jpg" => "image/jpeg",
        ".json" => "application/json",
        ".md" => "text/markdown",
        ".mp3" => "audio/mpeg",
        ".mp4" => "video/mp4",
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        ".txt" => "text/plain",
        ".wav" => "audio/wav",
        ".webm" => "video/webm",
        ".webp" => "image/webp",
        ".yaml" | ".yml" => "application/yaml",
        _ => "application/octet-stream",
    }
}

fn asset_vault_relative_path(entry_path: &str) -> Result<String, String> {
    let parts: Vec<&str> = entry_path.split('/').collect();
    if parts.len() < 6 || parts[0] != "generated" || parts[1] != "content" || parts[4] != "assets" {
        return Err(format!("Invalid .wawapkg: unsafe path {entry_path}"));
    }
    Ok(format!("content/{}/{}/assets/{}", parts[2], parts[3], parts[5..].join("/")))
}

fn manifest_yaml_field(raw: &str, field: &str) -> Option<String> {
    let prefix = format!("{field}:");
    raw.lines().find_map(|line| {
        let trimmed = line.trim();
        let rest = trimmed.strip_prefix(&prefix)?;
        Some(rest.trim().trim_matches('"').trim_matches('\'').to_string())
    })
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let mut output = Vec::new();
    let mut buffer: u32 = 0;
    let mut bits: u8 = 0;
    for byte in input.bytes().filter(|value| !value.is_ascii_whitespace()) {
        if byte == b'=' {
            break;
        }
        let value = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return Err("Invalid base64 data".into()),
        } as u32;
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
        }
    }
    Ok(output)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WawaZipEntryPayload {
    name: String,
    size: u64,
    base64: String,
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

fn read_wawapkg_archive(package_file_path: &str) -> Result<AiImportPackageFiles, String> {
    let package_file_path = package_file_path.trim();

    if package_file_path.contains('\0') || package_file_path.contains('\r') || package_file_path.contains('\n') {
        return Err("Invalid .wawapkg path: path contains control characters".into());
    }

    if !package_file_path.to_ascii_lowercase().ends_with(".wawapkg") {
        return Err("Package file must use .wawapkg extension".into());
    }

    let original_package_path = PathBuf::from(package_file_path);

    if !original_package_path.exists() {
        return Err(format!("Invalid .wawapkg path: file does not exist: {}", package_file_path));
    }

    if !original_package_path.is_file() {
        return Err(format!("Invalid .wawapkg path: not a file: {}", package_file_path));
    }

    let package_path = original_package_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve .wawapkg path: {error}"))?;

    let bytes = fs::read(&package_path)
        .map_err(|error| format!("Failed to read .wawapkg: {error}"))?;
    let mut eocd_offset = None;
    let min_offset = bytes.len().saturating_sub(0xffff + 22);
    for offset in (min_offset..=bytes.len().saturating_sub(22)).rev() {
        if read_u32(&bytes, offset)? == 0x06054b50 {
            eocd_offset = Some(offset);
            break;
        }
    }
    let eocd = eocd_offset.ok_or("Invalid .wawapkg: missing zip end record")?;
    let entry_count = read_u16(&bytes, eocd + 10)? as usize;
    if entry_count > MAX_WAWAPKG_FILE_COUNT {
        return Err("Too many files in .wawapkg".into());
    }
    let mut offset = read_u32(&bytes, eocd + 16)? as usize;
    let mut total_size: u64 = 0;
    let mut expected_entries: HashMap<String, u64> = HashMap::new();
    for _ in 0..entry_count {
        if offset + 46 > bytes.len() {
            return Err("Invalid .wawapkg central directory range".into());
        }
        if read_u32(&bytes, offset)? != 0x02014b50 {
            return Err("Invalid .wawapkg central directory".into());
        }
        let compression = read_u16(&bytes, offset + 10)?;
        let _compressed_size = read_u32(&bytes, offset + 20)? as usize;
        let uncompressed_size = read_u32(&bytes, offset + 24)? as u64;
        let name_len = read_u16(&bytes, offset + 28)? as usize;
        let extra_len = read_u16(&bytes, offset + 30)? as usize;
        let comment_len = read_u16(&bytes, offset + 32)? as usize;
        let external_attributes = read_u32(&bytes, offset + 38)?;
        let name_start = offset + 46;
        let name_end = name_start + name_len;
        let next_offset = name_end + extra_len + comment_len;
        if name_end > bytes.len() || next_offset > bytes.len() {
            return Err("Invalid .wawapkg central directory entry range".into());
        }
        let raw_name = std::str::from_utf8(&bytes[name_start..name_end])
            .map_err(|_| "Invalid UTF-8 zip entry name")?;
        let entry_name = normalize_zip_entry_path(raw_name)?;
        offset = next_offset;
        if entry_name.ends_with('/') || entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store") {
            continue;
        }
        if !allowed_wawapkg_top_level(&entry_name) {
            return Err(format!("Unknown top-level archive entry: {entry_name}"));
        }
        if forbidden_wawapkg_extension(&entry_name) {
            return Err(format!("Forbidden archive entry type: {entry_name}"));
        }
        if ((external_attributes >> 16) & 0o170000) == 0o120000 {
            return Err(format!("Invalid .wawapkg: unsafe path {entry_name}"));
        }
        if asset_entry(&entry_name) && !allowed_asset_extension(&entry_name) {
            return Err(format!("Unsupported asset file type: {entry_name}"));
        }
        total_size += uncompressed_size;
        if total_size > MAX_WAWAPKG_TOTAL_SIZE {
            return Err("Package exceeds 100 MB uncompressed size limit".into());
        }
        if uncompressed_size > MAX_WAWAPKG_FILE_SIZE {
            return Err(format!("Package file too large: {entry_name}"));
        }
        if compression != 0 && compression != 8 {
            return Err(format!("Invalid .wawapkg: unsupported compression method {compression}"));
        }
        expected_entries.insert(entry_name, uncompressed_size);
    }

    let script = r#"
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$PackagePath = [Environment]::GetEnvironmentVariable('WAWA_PKG_PATH', 'Process')

if ([string]::IsNullOrWhiteSpace($PackagePath)) {
  throw "Invalid .wawapkg path: WAWA_PKG_PATH is empty"
}

$PackagePath = $PackagePath.Trim()

if ($PackagePath.Contains([char]0) -or $PackagePath.Contains("`r") -or $PackagePath.Contains("`n")) {
  throw "Invalid .wawapkg path: path contains control characters"
}

$ResolvedPath = (Resolve-Path -LiteralPath $PackagePath).ProviderPath

if (-not (Test-Path -LiteralPath $ResolvedPath -PathType Leaf)) {
  throw "Package file does not exist: $ResolvedPath"
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($ResolvedPath)
$entries = @()
try {
  foreach ($entry in $zip.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $stream = $entry.Open()
    $memory = New-Object System.IO.MemoryStream
    try {
      $stream.CopyTo($memory)
      $entries += [pscustomobject]@{
        name = $entry.FullName
        size = [int64]$entry.Length
        base64 = [Convert]::ToBase64String($memory.ToArray())
      }
    } finally {
      $memory.Dispose()
      $stream.Dispose()
    }
  }
} finally {
  $zip.Dispose()
}
[Console]::Out.Write(($entries | ConvertTo-Json -Depth 4 -Compress))
"#;
    let powershell_package_path = original_package_path
        .to_string_lossy()
        .to_string();

    let output = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(script)
        .env("WAWA_PKG_PATH", &powershell_package_path)
        .output()
        .map_err(|error| format!("Failed to read .wawapkg zip entries: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

        return Err(format!(
            "Failed to read .wawapkg archive via PowerShell.\nPath: {}\nStderr: {}\nStdout: {}",
            powershell_package_path,
            stderr,
            stdout
        ));
    }
    let raw_json = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let entries: Vec<WawaZipEntryPayload> = if raw_json.is_empty() {
        Vec::new()
    } else if raw_json.starts_with('[') {
        serde_json::from_str(&raw_json).map_err(|error| format!("Failed to parse .wawapkg entries: {error}"))?
    } else {
        vec![serde_json::from_str(&raw_json).map_err(|error| format!("Failed to parse .wawapkg entry: {error}"))?]
    };

    let mut text_files: HashMap<String, String> = HashMap::new();
    let mut asset_files: Vec<AiImportAssetFile> = Vec::new();
    for entry in entries {
        let entry_name = normalize_zip_entry_path(&entry.name)?;
        if entry_name.ends_with('/') || entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store") {
            continue;
        }
        let Some(expected_size) = expected_entries.get(&entry_name) else {
            return Err(format!("Invalid .wawapkg: unexpected entry {entry_name}"));
        };
        if *expected_size != entry.size {
            return Err(format!("Invalid .wawapkg: size mismatch for {entry_name}"));
        }
        if asset_entry(&entry_name) {
            asset_files.push(AiImportAssetFile {
                vault_relative_path: asset_vault_relative_path(&entry_name)?,
                package_relative_path: entry_name.clone(),
                base64: entry.base64,
                mime_type: asset_mime_type(&entry_name).into(),
                size: entry.size,
            });
        } else {
            let bytes = decode_base64(&entry.base64)?;
            let contents = String::from_utf8(bytes).map_err(|_| format!("Text file is not UTF-8: {entry_name}"))?;
            text_files.insert(entry_name, contents);
        }
    }

    if !text_files.contains_key("mimetype") {
        return Err("Invalid .wawapkg: missing mimetype".into());
    }
    if text_files.get("mimetype").map(|value| value.as_str()) != Some(WAWAPKG_MIMETYPE) {
        return Err("Invalid .wawapkg mimetype".into());
    }
    let manifest_raw = text_files.get("manifest.yaml").cloned().ok_or("Invalid .wawapkg: missing manifest.yaml")?;
    if !text_files.contains_key("sources.yaml") {
        return Err("Invalid .wawapkg: missing sources.yaml".into());
    }
    if !text_files.contains_key("patch.yaml") {
        return Err("Invalid .wawapkg: missing patch.yaml".into());
    }
    if manifest_yaml_field(&manifest_raw, "packageFormat").as_deref() != Some("wawapkg") {
        return Err("Invalid .wawapkg: manifest.packageFormat must be wawapkg".into());
    }
    let package_kind = manifest_yaml_field(&manifest_raw, "packageKind").unwrap_or_default();
    if package_kind != "import" && package_kind != "ai-import" {
        return Err("Invalid .wawapkg: manifest.packageKind must be import".into());
    }
    if manifest_yaml_field(&manifest_raw, "schemaVersion").as_deref() != Some("1.1") {
        return Err("Invalid .wawapkg: manifest.schemaVersion must be 1.1".into());
    }
    let package_id = package_id_from_manifest(&manifest_raw)?;
    let mut package = AiImportPackageFiles {
        package_id,
        external_root_path: String::new(),
        imported_from_external: true,
        package_file_path: package_path.to_string_lossy().to_string(),
        package_format: "wawapkg".into(),
        manifest_raw,
        sources_raw: text_files.get("sources.yaml").cloned().unwrap_or_default(),
        patch_raw: text_files.get("patch.yaml").cloned().unwrap_or_default(),
        generated_meta_files: HashMap::new(),
        generated_note_files: HashMap::new(),
        asset_files,
        block_type_files: HashMap::new(),
        review_files: HashMap::new(),
    };
    for (entry_path, contents) in text_files {
        if entry_path.starts_with("generated/content/") && entry_path.ends_with("/meta.yaml") {
            package.generated_meta_files.insert(entry_path, contents);
        } else if entry_path.starts_with("generated/content/") && entry_path.ends_with("/note.md") {
            package.generated_note_files.insert(entry_path, contents);
        } else if entry_path.starts_with("block-types/") && (entry_path.ends_with(".yaml") || entry_path.ends_with(".yml")) {
            package.block_type_files.insert(entry_path, contents);
        } else if entry_path.starts_with("review/") {
            package.review_files.insert(entry_path, contents);
        }
    }
    Ok(package)
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
fn choose_wawapkg_file() -> Result<Option<String>, String> {
    if !cfg!(target_os = "windows") {
        return Err("File picker command is currently implemented for Windows only".into());
    }
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Import Wawa Package'
$dialog.Filter = 'Wawa Package (*.wawapkg)|*.wawapkg'
$dialog.Multiselect = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.FileName)
}
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to open file picker: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected_path.is_empty() {
        Ok(None)
    } else if selected_path.to_ascii_lowercase().ends_with(".wawapkg") {
        Ok(Some(selected_path))
    } else {
        Err("Selected file must use .wawapkg extension".into())
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
fn read_wawapkg_file(package_file_path: String) -> Result<AiImportPackageFiles, String> {
    read_wawapkg_archive(&package_file_path)
}

#[tauri::command]
fn read_ai_import_history(vault_root_path: String, package_id: String) -> Result<AiImportHistory, String> {
    if !is_safe_package_id(&package_id) {
        return Err("Invalid AI import package id".into());
    }
    let relative_path = format!(".kb-ai/history/{package_id}.yaml");
    let history_path = safe_vault_path(&vault_root_path, &relative_path)?;
    if !history_path.is_file() {
        return Ok(AiImportHistory {
            applied: false,
            applied_at: String::new(),
            raw: String::new(),
        });
    }
    let raw = fs::read_to_string(&history_path)
        .map_err(|error| format!("Failed to read import history: {error}"))?;
    let mut applied_at = String::new();
    for line in raw.lines() {
        if let Some(rest) = line.trim().strip_prefix("appliedAt:") {
            applied_at = rest.trim().trim_matches('"').to_string();
        }
    }
    Ok(AiImportHistory {
        applied: true,
        applied_at,
        raw,
    })
}

#[tauri::command]
fn apply_ai_import_plan(vault_root_path: String, plan: AiImportApplyPlan) -> Result<(), String> {
    if !is_safe_package_id(&plan.package_id) {
        return Err("Invalid import package id".into());
    }
    if plan.backup_relative_dir != format!(".kb-ai/backups/{}", plan.package_id) {
        return Err("Invalid backup directory for AI import package".into());
    }

    for relative_dir in &plan.create_dirs {
        if !allowed_ai_apply_path(relative_dir) {
            return Err(format!("Refusing to create outside AI import allowlist: {relative_dir}"));
        }
        fs::create_dir_all(safe_vault_path(&vault_root_path, relative_dir)?)
            .map_err(|error| format!("Failed to create {relative_dir}: {error}"))?;
    }

    for relative_path in &plan.backup_paths {
        if !allowed_ai_apply_path(relative_path) {
            return Err(format!("Refusing to backup outside AI import allowlist: {relative_path}"));
        }
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
        if !allowed_ai_apply_path(&write.relative_path) {
            return Err(format!("Refusing to write outside AI import allowlist: {}", write.relative_path));
        }
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

    for write in &plan.binary_writes {
        if !allowed_ai_apply_path(&write.relative_path) {
            return Err(format!("Refusing to write outside AI import allowlist: {}", write.relative_path));
        }
        let target = safe_vault_path(&vault_root_path, &write.relative_path)?;
        if write.create_only && target.exists() {
            return Err(format!("Asset already exists: {}", write.relative_path));
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create target directory: {error}"))?;
        }
        let bytes = decode_base64(&write.base64)?;
        fs::write(&target, bytes)
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
            choose_wawapkg_file,
            create_dir_all,
            read_ai_import_history,
            read_wawapkg_file,
            read_text_file,
            read_vault_files,
            resolve_default_vault_root,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
