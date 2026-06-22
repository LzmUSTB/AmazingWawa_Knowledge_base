use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
struct VaultRawFiles {
    vault_yaml: String,
    domains_yaml: String,
    graph_yaml: String,
    graph_layout_yaml: String,
    meta_files: HashMap<String, String>,
    note_files: HashMap<String, String>,
    note_html_files: HashMap<String, String>,
    exercise_files: HashMap<String, String>,
    exercise_progress_yaml: String,
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
    generated_html_note_files: HashMap<String, String>,
    asset_files: Vec<AiImportAssetFile>,
    block_type_files: HashMap<String, String>,
    review_files: HashMap<String, String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiImportAssetFile {
    vault_relative_path: String,
    package_relative_path: String,
    base64: String,
    mime_type: String,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BinaryAssetPayload {
    base64: String,
    mime_type: String,
    size: u64,
}

const WAWAPKG_MIMETYPE: &str = "application/x-wawa-kb-ai-import-package";
const MAX_WAWAPKG_TOTAL_SIZE: u64 = 100 * 1024 * 1024;
const MAX_WAWAPKG_FILE_SIZE: u64 = 20 * 1024 * 1024;
const MAX_WAWAPKG_FILE_COUNT: usize = 1000;
const MAX_NOTE_ASSET_READ_SIZE: u64 = 20 * 1024 * 1024;
const MAX_HTML_NOTE_IMPORT_TOTAL_SIZE: u64 = 120 * 1024 * 1024;
const MAX_HTML_NOTE_IMPORT_FILE_SIZE: u64 = 25 * 1024 * 1024;
const MAX_HTML_NOTE_IMPORT_FILE_COUNT: usize = 3000;

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SourceSnapshotResult {
    url: String,
    zip_path: String,
    output_dir: String,
    mode: String,
    file_count: u64,
    total_size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlNoteImportResult {
    note_relative_path: String,
    copied_asset_relative_paths: Vec<String>,
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

fn html_note_entry(entry_path: &str) -> bool {
    entry_path.starts_with("generated/content/") && entry_path.ends_with("/note.html")
}

fn forbidden_wawapkg_extension(entry_path: &str) -> bool {
    if html_note_entry(entry_path) || asset_entry(entry_path) {
        return false;
    }
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
        ".avif"
            | ".bin"
            | ".css"
            | ".csv"
            | ".gif"
            | ".glb"
            | ".gltf"
            | ".htm"
            | ".html"
            | ".jpeg"
            | ".jpg"
            | ".js"
            | ".json"
            | ".md"
            | ".mjs"
            | ".mp3"
            | ".mp4"
            | ".otf"
            | ".pdf"
            | ".png"
            | ".svg"
            | ".ttf"
            | ".txt"
            | ".wasm"
            | ".wav"
            | ".webm"
            | ".webp"
            | ".woff"
            | ".woff2"
            | ".yaml"
            | ".yml"
    )
}

fn allowed_note_asset_read_path(relative_path: &str) -> bool {
    let normalized = relative_path.replace('\\', "/");
    let trimmed = normalized.trim_end_matches('/');
    !trimmed.is_empty()
        && !normalized.starts_with('/')
        && normalized.as_bytes().get(1) != Some(&b':')
        && normalized.starts_with("content/")
        && normalized.contains("/assets/")
        && normalized
            .split('/')
            .all(|part| !part.is_empty() && part != "." && part != "..")
}

fn is_safe_content_id(value: &str) -> bool {
    !value.is_empty()
        && value
            .chars()
            .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-')
}

fn allowed_html_import_file(path: &Path) -> bool {
    let value = path.to_string_lossy();
    allowed_asset_extension(&value)
}

fn normalize_relative_file_path(path: &Path) -> Result<String, String> {
    if path
        .components()
        .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_) | Component::RootDir))
    {
        return Err("Unsafe imported file path".into());
    }
    let normalized = path.to_string_lossy().replace('\\', "/");
    if normalized.is_empty()
        || normalized.starts_with('/')
        || normalized.split('/').any(|part| part.is_empty() || part == "." || part == "..")
    {
        return Err("Unsafe imported file path".into());
    }
    Ok(normalized)
}

fn html_note_target_dir(vault_root_path: &str, node_domain: &str, node_id: &str) -> Result<PathBuf, String> {
    if !is_safe_content_id(node_domain) || !is_safe_content_id(node_id) {
        return Err("Invalid node id or domain for HTML note import".into());
    }
    safe_vault_path(vault_root_path, &format!("content/{node_domain}/{node_id}"))
}

fn assert_empty_note_target(target_dir: &Path) -> Result<(), String> {
    if target_dir.join("note.md").exists() || target_dir.join("note.html").exists() {
        return Err("Target node already has a note.".into());
    }
    if !target_dir.join("meta.yaml").is_file() {
        return Err("Target node meta.yaml was not found.".into());
    }
    Ok(())
}

fn copy_import_file(source: &Path, target: &Path) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create {}: {error}", parent.to_string_lossy()))?;
    }
    if target.exists() {
        return Err(format!("Refusing to overwrite existing imported file: {}", target.to_string_lossy()));
    }
    fs::copy(source, target).map_err(|error| {
        format!(
            "Failed to copy {} to {}: {error}",
            source.to_string_lossy(),
            target.to_string_lossy()
        )
    })?;
    Ok(())
}

fn find_folder_main_html(source_dir: &Path) -> Result<PathBuf, String> {
    let note_html = source_dir.join("note.html");
    if note_html.is_file() {
        return Ok(note_html);
    }
    let index_html = source_dir.join("index.html");
    if index_html.is_file() {
        return Ok(index_html);
    }
    let index_htm = source_dir.join("index.htm");
    if index_htm.is_file() {
        return Ok(index_htm);
    }

    let html_files: Vec<PathBuf> = fs::read_dir(source_dir)
        .map_err(|error| format!("Failed to read HTML note folder: {error}"))?
        .filter_map(|entry| entry.ok().map(|item| item.path()))
        .filter(|path| {
            path.is_file()
                && matches!(
                    path.extension().and_then(|value| value.to_str()).map(|value| value.to_ascii_lowercase()),
                    Some(extension) if extension == "html" || extension == "htm"
                )
        })
        .collect();

    if html_files.len() == 1 {
        return Ok(html_files[0].clone());
    }
    Err("HTML folder must contain note.html, index.html, index.htm, or exactly one root HTML file.".into())
}

fn collect_import_files(source_dir: &Path, current: &Path, output: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| {
        format!(
            "Failed to read import directory {}: {error}",
            current.to_string_lossy()
        )
    })? {
        let entry = entry.map_err(|error| format!("Failed to read import directory entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_import_files(source_dir, &path, output)?;
        } else if path.is_file() {
            path.strip_prefix(source_dir)
                .map_err(|error| format!("Failed to normalize import path: {error}"))?;
            output.push(path);
        }
    }
    Ok(())
}

fn allowed_remove_vault_path(relative_path: &str) -> bool {
    let normalized = relative_path.replace('\\', "/");
    let parts: Vec<&str> = normalized.trim_end_matches('/').split('/').collect();
    parts.len() >= 2
        && parts.len() <= 3
        && parts[0] == "content"
        && parts
            .iter()
            .all(|part| !part.is_empty() && *part != "." && *part != "..")
        && normalized.as_bytes().get(1) != Some(&b':')
        && !normalized.starts_with('/')
}

fn asset_mime_type(entry_path: &str) -> &'static str {
    match extension_of(entry_path).as_str() {
        ".avif" => "image/avif",
        ".bin" => "application/octet-stream",
        ".css" => "text/css",
        ".csv" => "text/csv",
        ".gif" => "image/gif",
        ".glb" => "model/gltf-binary",
        ".gltf" => "model/gltf+json",
        ".htm" | ".html" => "text/html",
        ".jpeg" | ".jpg" => "image/jpeg",
        ".js" | ".mjs" => "text/javascript",
        ".json" => "application/json",
        ".md" => "text/markdown",
        ".mp3" => "audio/mpeg",
        ".mp4" => "video/mp4",
        ".otf" => "font/otf",
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        ".svg" => "image/svg+xml",
        ".ttf" => "font/ttf",
        ".txt" => "text/plain",
        ".wasm" => "application/wasm",
        ".wav" => "audio/wav",
        ".webm" => "video/webm",
        ".webp" => "image/webp",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
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

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity(((bytes.len() + 2) / 3) * 4);
    let mut index = 0;
    while index < bytes.len() {
        let b0 = bytes[index];
        let b1 = if index + 1 < bytes.len() { bytes[index + 1] } else { 0 };
        let b2 = if index + 2 < bytes.len() { bytes[index + 2] } else { 0 };
        output.push(TABLE[(b0 >> 2) as usize] as char);
        output.push(TABLE[(((b0 & 0b0000_0011) << 4) | (b1 >> 4)) as usize] as char);
        if index + 1 < bytes.len() {
            output.push(TABLE[(((b1 & 0b0000_1111) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            output.push('=');
        }
        if index + 2 < bytes.len() {
            output.push(TABLE[(b2 & 0b0011_1111) as usize] as char);
        } else {
            output.push('=');
        }
        index += 3;
    }
    output
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
    if !package_file_path.to_ascii_lowercase().ends_with(".wawapkg") {
        return Err("Package file must use .wawapkg extension".into());
    }
    let package_path = PathBuf::from(package_file_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve .wawapkg path: {error}"))?;
    let bytes = fs::read(&package_path).map_err(|error| format!("Failed to read .wawapkg: {error}"))?;
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
$PackagePath = [Environment]::GetEnvironmentVariable('WAWA_PKG_PATH')
if ([string]::IsNullOrWhiteSpace($PackagePath)) {
  throw 'Missing WAWA_PKG_PATH environment variable.'
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)
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
    let output = Command::new("powershell")
        .env("WAWA_PKG_PATH", package_path.to_string_lossy().to_string())
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to read .wawapkg zip entries: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
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
        generated_html_note_files: HashMap::new(),
        asset_files,
        block_type_files: HashMap::new(),
        review_files: HashMap::new(),
    };
    for (entry_path, contents) in text_files {
        if entry_path.starts_with("generated/content/") && entry_path.ends_with("/meta.yaml") {
            package.generated_meta_files.insert(entry_path, contents);
        } else if entry_path.starts_with("generated/content/") && entry_path.ends_with("/note.md") {
            package.generated_note_files.insert(entry_path, contents);
        } else if html_note_entry(&entry_path) {
            package.generated_html_note_files.insert(entry_path, contents);
        } else if entry_path.starts_with("block-types/") && (entry_path.ends_with(".yaml") || entry_path.ends_with(".yml")) {
            package.block_type_files.insert(entry_path, contents);
        } else if entry_path.starts_with("review/") {
            package.review_files.insert(entry_path, contents);
        }
    }
    Ok(package)
}


fn sanitize_snapshot_slug(url: &str) -> String {
    let mut slug = url
        .trim()
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();

    while slug.contains("--") {
        slug = slug.replace("--", "-");
    }
    slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "source-snapshot".into()
    } else {
        slug.chars().take(72).collect()
    }
}

fn default_snapshot_output_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(repo_root) = manifest_dir
        .parent()
        .and_then(|path| path.parent())
        .and_then(|path| path.parent())
    {
        return repo_root.join("snapshot");
    }

    std::env::current_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("snapshot")
}

fn open_directory(directory_path: &Path) -> Result<(), String> {
    if !directory_path.is_dir() {
        return Err(format!("Directory does not exist: {}", directory_path.to_string_lossy()));
    }

    let mut command = if cfg!(target_os = "windows") {
        Command::new("explorer")
    } else if cfg!(target_os = "macos") {
        Command::new("open")
    } else {
        Command::new("xdg-open")
    };

    command
        .arg(directory_path)
        .spawn()
        .map_err(|error| format!("Failed to open {}: {error}", directory_path.to_string_lossy()))?;
    Ok(())
}

#[tauri::command]
fn open_snapshot_output_dir() -> Result<String, String> {
    let output_dir = default_snapshot_output_dir();
    fs::create_dir_all(&output_dir).map_err(|error| {
        format!(
            "Failed to create snapshot output directory {}: {error}",
            output_dir.to_string_lossy()
        )
    })?;
    let canonical_output_dir = output_dir
        .canonicalize()
        .map_err(|error| format!("Failed to resolve snapshot output directory: {error}"))?;
    open_directory(&canonical_output_dir)?;
    Ok(canonical_output_dir.to_string_lossy().to_string())
}

fn parse_snapshot_result(raw_json: &str, fallback_url: &str, fallback_zip_path: &Path) -> Result<SourceSnapshotResult, String> {
    let value: serde_json::Value =
        serde_json::from_str(raw_json).map_err(|error| format!("Failed to parse snapshot capture result: {error}"))?;

    Ok(SourceSnapshotResult {
        url: value
            .get("url")
            .and_then(|item| item.as_str())
            .unwrap_or(fallback_url)
            .to_string(),
        zip_path: value
            .get("zipPath")
            .and_then(|item| item.as_str())
            .map(|item| item.to_string())
            .unwrap_or_else(|| fallback_zip_path.to_string_lossy().to_string()),
        output_dir: value
            .get("outputDir")
            .and_then(|item| item.as_str())
            .unwrap_or("")
            .to_string(),
        mode: value
            .get("mode")
            .and_then(|item| item.as_str())
            .unwrap_or("unknown")
            .to_string(),
        file_count: value
            .get("fileCount")
            .and_then(|item| item.as_u64())
            .unwrap_or(0),
        total_size: value
            .get("totalSize")
            .and_then(|item| item.as_u64())
            .unwrap_or(0),
    })
}

#[tauri::command]
fn capture_source_snapshot(url: String) -> Result<SourceSnapshotResult, String> {
    let trimmed_url = url.trim().to_string();
    if !(trimmed_url.starts_with("http://") || trimmed_url.starts_with("https://")) {
        return Err("Snapshot URL must start with http:// or https://.".into());
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let desktop_dir = manifest_dir
        .parent()
        .ok_or("Failed to resolve desktop app directory.")?
        .to_path_buf();
    let script_path = desktop_dir.join("scripts").join("capture-source-snapshot.mjs");
    if !script_path.is_file() {
        return Err(format!(
            "Snapshot capture script was not found: {}",
            script_path.to_string_lossy()
        ));
    }

    let output_dir = default_snapshot_output_dir();
    fs::create_dir_all(&output_dir).map_err(|error| {
        format!(
            "Failed to create snapshot output directory {}: {error}",
            output_dir.to_string_lossy()
        )
    })?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock error: {error}"))?
        .as_secs();
    let output_zip_path = output_dir.join(format!(
        "{}-{}.zip",
        sanitize_snapshot_slug(&trimmed_url),
        timestamp
    ));

    let output = Command::new("node")
        .current_dir(&desktop_dir)
        .arg(&script_path)
        .arg(&trimmed_url)
        .arg(&output_zip_path)
        .output()
        .map_err(|error| {
            format!(
                "Failed to run snapshot capture script. Install Node.js and run npm install in the repository. Details: {error}"
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Err(if stderr.is_empty() { stdout } else { stderr });
    }

    let raw_json = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw_json.is_empty() {
        return Err("Snapshot capture script returned no result.".into());
    }

    parse_snapshot_result(&raw_json, &trimmed_url, &output_zip_path)
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
fn choose_exercise_set_file() -> Result<Option<String>, String> {
    if !cfg!(target_os = "windows") {
        return Err("File picker command is currently implemented for Windows only".into());
    }
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Import ExerciseSet'
$dialog.Filter = 'YAML Files (*.yaml;*.yml)|*.yaml;*.yml'
$dialog.Multiselect = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.FileName)
}
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to open ExerciseSet file picker: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let lower = selected_path.to_ascii_lowercase();
    if selected_path.is_empty() {
        Ok(None)
    } else if lower.ends_with(".yaml") || lower.ends_with(".yml") {
        Ok(Some(selected_path))
    } else {
        Err("Selected file must use .yaml or .yml extension".into())
    }
}

#[tauri::command]
fn read_external_text_file(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve selected file: {error}"))?;
    if !path.is_file() {
        return Err("Selected path is not a file".into());
    }
    let lower = path.to_string_lossy().to_ascii_lowercase();
    if !(lower.ends_with(".yaml") || lower.ends_with(".yml")) {
        return Err("Selected file must use .yaml or .yml extension".into());
    }
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Failed to read selected file metadata: {error}"))?;
    if metadata.len() > 2 * 1024 * 1024 {
        return Err("ExerciseSet file exceeds 2 MB limit".into());
    }
    fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read selected file: {error}"))
}

#[tauri::command]
fn choose_html_note_file() -> Result<Option<String>, String> {
    if !cfg!(target_os = "windows") {
        return Err("File picker command is currently implemented for Windows only".into());
    }
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Import HTML Note File'
$dialog.Filter = 'HTML Files (*.html;*.htm)|*.html;*.htm'
$dialog.Multiselect = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.FileName)
}
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to open HTML file picker: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected_path.is_empty() {
        Ok(None)
    } else if selected_path.to_ascii_lowercase().ends_with(".html")
        || selected_path.to_ascii_lowercase().ends_with(".htm")
    {
        Ok(Some(selected_path))
    } else {
        Err("Selected file must use .html or .htm extension".into())
    }
}

#[tauri::command]
fn choose_html_note_folder() -> Result<Option<String>, String> {
    if !cfg!(target_os = "windows") {
        return Err("Folder picker command is currently implemented for Windows only".into());
    }
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Import HTML Note Folder'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to open HTML folder picker: {error}"))?;

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
fn import_html_note_files(
    vault_root_path: String,
    node_domain: String,
    node_id: String,
    source_path: String,
    source_kind: String,
) -> Result<HtmlNoteImportResult, String> {
    let target_dir = html_note_target_dir(&vault_root_path, &node_domain, &node_id)?;
    fs::create_dir_all(&target_dir)
        .map_err(|error| format!("Failed to create node directory: {error}"))?;
    assert_empty_note_target(&target_dir)?;

    let canonical_root = PathBuf::from(&vault_root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_target_dir = target_dir
        .canonicalize()
        .map_err(|error| format!("Failed to resolve target node directory: {error}"))?;
    if !canonical_target_dir.starts_with(&canonical_root) {
        return Err("Refusing to import outside the vault root".into());
    }

    let source = PathBuf::from(&source_path);
    let canonical_source = source
        .canonicalize()
        .map_err(|error| format!("Failed to resolve import source: {error}"))?;
    let note_relative_path = format!("content/{node_domain}/{node_id}/note.html");
    let note_target = target_dir.join("note.html");

    if source_kind == "file" {
        if !canonical_source.is_file() {
            return Err("Selected HTML source is not a file".into());
        }
        if !allowed_html_import_file(&canonical_source) {
            return Err("Selected HTML source is not an allowed HTML file".into());
        }
        let metadata = fs::metadata(&canonical_source)
            .map_err(|error| format!("Failed to read source file metadata: {error}"))?;
        if metadata.len() > MAX_HTML_NOTE_IMPORT_FILE_SIZE {
            return Err("HTML file exceeds 25 MB import limit".into());
        }
        copy_import_file(&canonical_source, &note_target)?;
        return Ok(HtmlNoteImportResult {
            note_relative_path,
            copied_asset_relative_paths: Vec::new(),
        });
    }

    if source_kind != "folder" {
        return Err("HTML note import sourceKind must be file or folder".into());
    }
    if !canonical_source.is_dir() {
        return Err("Selected HTML source is not a folder".into());
    }
    if canonical_target_dir.starts_with(&canonical_source) {
        return Err("Refusing to import a folder into one of its own descendants".into());
    }

    let main_html = find_folder_main_html(&canonical_source)?;
    let mut files = Vec::new();
    collect_import_files(&canonical_source, &canonical_source, &mut files)?;
    if files.len() > MAX_HTML_NOTE_IMPORT_FILE_COUNT {
        return Err("HTML folder has too many files to import".into());
    }

    let mut total_size = 0_u64;
    let mut copied_asset_relative_paths = Vec::new();
    for file in files {
        let relative = file
            .strip_prefix(&canonical_source)
            .map_err(|error| format!("Failed to normalize import file path: {error}"))?;
        let relative_path = normalize_relative_file_path(relative)?;
        let metadata = fs::metadata(&file)
            .map_err(|error| format!("Failed to read import file metadata: {error}"))?;
        if metadata.len() > MAX_HTML_NOTE_IMPORT_FILE_SIZE {
            return Err(format!("Imported file exceeds 25 MB limit: {relative_path}"));
        }
        total_size += metadata.len();
        if total_size > MAX_HTML_NOTE_IMPORT_TOTAL_SIZE {
            return Err("HTML folder exceeds 120 MB import limit".into());
        }
        if relative_path.eq_ignore_ascii_case("meta.yaml") || relative_path.eq_ignore_ascii_case("note.md") {
            return Err(format!("HTML import folder contains unsupported root file: {relative_path}"));
        }
        if !allowed_html_import_file(&file) {
            return Err(format!("Unsupported imported file type: {relative_path}"));
        }

        if file == main_html {
            copy_import_file(&file, &note_target)?;
            continue;
        }

        let asset_relative_path = format!("content/{node_domain}/{node_id}/assets/imported-html/{relative_path}");
        let asset_target = safe_vault_path(&vault_root_path, &asset_relative_path)?;
        copy_import_file(&file, &asset_target)?;
        copied_asset_relative_paths.push(asset_relative_path);
    }

    if !note_target.exists() {
        return Err("HTML folder import did not produce note.html".into());
    }

    Ok(HtmlNoteImportResult {
        note_relative_path,
        copied_asset_relative_paths,
    })
}

#[tauri::command]
fn remove_node_note_files(
    vault_root_path: String,
    node_domain: String,
    node_id: String,
) -> Result<(), String> {
    let target_dir = html_note_target_dir(&vault_root_path, &node_domain, &node_id)?;
    if !target_dir.join("meta.yaml").is_file() {
        return Err("Target node meta.yaml was not found.".into());
    }

    let canonical_root = PathBuf::from(&vault_root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_target_dir = target_dir
        .canonicalize()
        .map_err(|error| format!("Failed to resolve target node directory: {error}"))?;
    if !canonical_target_dir.starts_with(&canonical_root) {
        return Err("Refusing to remove note files outside the vault root".into());
    }

    for file_name in ["note.md", "note.html"] {
        let note_path = canonical_target_dir.join(file_name);
        if note_path.is_file() {
            fs::remove_file(&note_path)
                .map_err(|error| format!("Failed to remove {}: {error}", note_path.to_string_lossy()))?;
        }
    }

    let assets_path = canonical_target_dir.join("assets");
    if assets_path.is_dir() {
        fs::remove_dir_all(&assets_path)
            .map_err(|error| format!("Failed to remove {}: {error}", assets_path.to_string_lossy()))?;
    }

    Ok(())
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
    let mut note_html_files = HashMap::new();
    let mut exercise_files = HashMap::new();
    let mut block_type_files = HashMap::new();
    read_content_files(&root, &root.join("content"), "meta.yaml", &mut meta_files)?;
    read_content_files(&root, &root.join("content"), "note.md", &mut note_files)?;
    read_content_files(&root, &root.join("content"), "note.html", &mut note_html_files)?;
    read_content_files(&root, &root.join("content"), "exercises.yaml", &mut exercise_files)?;
    read_yaml_files_in_directory(&root, "block-types", &mut block_type_files)?;

    Ok(VaultRawFiles {
        vault_yaml: read_required(&root, "vault.yaml")?,
        domains_yaml: read_required(&root, "domains.yaml")?,
        graph_yaml: read_required(&root, "graph.yaml")?,
        graph_layout_yaml: fs::read_to_string(root.join("graph-layout.yaml")).unwrap_or_default(),
        meta_files,
        note_files,
        note_html_files,
        exercise_files,
        exercise_progress_yaml: fs::read_to_string(root.join(".kinjito/exercise-progress.yaml")).unwrap_or_default(),
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
fn read_binary_file_base64(
    vault_root_path: String,
    relative_path: String,
) -> Result<BinaryAssetPayload, String> {
    if !allowed_note_asset_read_path(&relative_path) {
        return Err("Refusing to read a non-asset path".into());
    }
    if !allowed_asset_extension(&relative_path) {
        return Err("Unsupported asset file type".into());
    }

    let target_path = safe_vault_path(&vault_root_path, &relative_path)?;
    let canonical_root = PathBuf::from(&vault_root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_target = target_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve asset path: {error}"))?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Refusing to read a path outside the vault root".into());
    }
    if !canonical_target.is_file() {
        return Err("Asset path is not a file".into());
    }

    let metadata = fs::metadata(&canonical_target)
        .map_err(|error| format!("Failed to read asset metadata: {error}"))?;
    if metadata.len() > MAX_NOTE_ASSET_READ_SIZE {
        return Err("Asset exceeds 20 MB read limit".into());
    }

    let bytes = fs::read(&canonical_target)
        .map_err(|error| format!("Failed to read {}: {error}", canonical_target.to_string_lossy()))?;
    Ok(BinaryAssetPayload {
        base64: encode_base64(&bytes),
        mime_type: asset_mime_type(&relative_path).into(),
        size: bytes.len() as u64,
    })
}

#[tauri::command]
fn create_dir_all(vault_root_path: String, relative_path: String) -> Result<(), String> {
    let target_path = safe_vault_path(&vault_root_path, &relative_path)?;
    fs::create_dir_all(&target_path)
        .map_err(|error| format!("Failed to create {}: {error}", target_path.to_string_lossy()))
}

#[tauri::command]
fn remove_file(vault_root_path: String, relative_path: String) -> Result<(), String> {
    let normalized = relative_path.replace('\\', "/");
    let parts: Vec<&str> = normalized.split('/').collect();
    if parts.len() != 4
        || parts[0] != "content"
        || !is_safe_content_id(parts[1])
        || !is_safe_content_id(parts[2])
        || parts[3] != "exercises.yaml"
    {
        return Err("Only a node exercises.yaml file can be removed by this command".into());
    }
    let target = safe_vault_path(&vault_root_path, &relative_path)?;
    if !target.exists() {
        return Ok(());
    }
    if !target.is_file() {
        return Err("Selected vault path is not a file".into());
    }
    fs::remove_file(&target)
        .map_err(|error| format!("Failed to remove {relative_path}: {error}"))
}

#[tauri::command]
fn open_vault_relative_dir(vault_root_path: String, relative_path: String) -> Result<String, String> {
    if relative_path != ".kb-ai/context" {
        return Err("Only the exported context directory can be opened from the vault.".into());
    }
    let target_path = safe_vault_path(&vault_root_path, &relative_path)?;
    fs::create_dir_all(&target_path)
        .map_err(|error| format!("Failed to create {}: {error}", target_path.to_string_lossy()))?;
    let canonical_root = PathBuf::from(&vault_root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_target = target_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve target path: {error}"))?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Refusing to open a path outside the vault root".into());
    }
    open_directory(&canonical_target)?;
    Ok(canonical_target.to_string_lossy().to_string())
}

#[tauri::command]
fn remove_vault_path(vault_root_path: String, relative_path: String) -> Result<(), String> {
    if !allowed_remove_vault_path(&relative_path) {
        return Err("Refusing to remove outside allowed content paths".into());
    }
    let target_path = safe_vault_path(&vault_root_path, &relative_path)?;
    if !target_path.exists() {
        return Ok(());
    }
    let canonical_root = PathBuf::from(&vault_root_path)
        .canonicalize()
        .map_err(|error| format!("Failed to resolve vault root: {error}"))?;
    let canonical_target = target_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve target path: {error}"))?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Refusing to remove a path outside the vault root".into());
    }
    if canonical_target.is_dir() {
        fs::remove_dir_all(&canonical_target)
            .map_err(|error| format!("Failed to remove {}: {error}", canonical_target.to_string_lossy()))?;
    } else if canonical_target.is_file() {
        fs::remove_file(&canonical_target)
            .map_err(|error| format!("Failed to remove {}: {error}", canonical_target.to_string_lossy()))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            apply_ai_import_plan,
            capture_source_snapshot,
            choose_exercise_set_file,
            choose_html_note_file,
            choose_html_note_folder,
            choose_vault_root,
            choose_wawapkg_file,
            create_dir_all,
            import_html_note_files,
            read_ai_import_history,
            read_binary_file_base64,
            read_external_text_file,
            read_wawapkg_file,
            read_text_file,
            read_vault_files,
            remove_node_note_files,
            remove_file,
            remove_vault_path,
            open_snapshot_output_dir,
            open_vault_relative_dir,
            resolve_default_vault_root,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
