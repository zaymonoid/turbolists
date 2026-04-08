use std::fs;
use std::path::Path;
use tauri::Manager;

fn read_store_file(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(contents) => Ok(contents),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok("{}".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn write_store_file(path: &Path, json: &str) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(path, json).map_err(|e| e.to_string())
}

fn store_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("store.json"))
}

#[tauri::command]
fn read_store(app_handle: tauri::AppHandle) -> Result<String, String> {
    read_store_file(&store_path(&app_handle)?)
}

#[tauri::command]
fn write_store(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    write_store_file(&store_path(&app_handle)?, &json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init());

    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_haptics::init());

    builder
        .invoke_handler(tauri::generate_handler![read_store, write_store])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_path(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join("turbolists_test");
        fs::create_dir_all(&dir).unwrap();
        dir.join(name)
    }

    fn cleanup(path: &Path) {
        let _ = fs::remove_file(path);
    }

    #[test]
    fn read_returns_empty_object_when_file_missing() {
        let path = temp_path("missing.json");
        cleanup(&path);
        let result = read_store_file(&path).unwrap();
        assert_eq!(result, "{}");
    }

    #[test]
    fn write_then_read_round_trips() {
        let path = temp_path("round_trip.json");
        cleanup(&path);

        let data = r#"{"items":[],"facets":[],"trips":[]}"#;
        write_store_file(&path, data).unwrap();
        let result = read_store_file(&path).unwrap();
        assert_eq!(result, data);

        cleanup(&path);
    }

    #[test]
    fn write_creates_parent_directories() {
        let path = temp_path("nested/dir/store.json");
        let _ = fs::remove_dir_all(path.parent().unwrap());

        write_store_file(&path, "{}").unwrap();
        assert!(path.exists());

        let _ = fs::remove_dir_all(temp_path("nested"));
    }

    #[test]
    fn write_overwrites_existing_file() {
        let path = temp_path("overwrite.json");
        cleanup(&path);

        write_store_file(&path, r#"{"old": true}"#).unwrap();
        write_store_file(&path, r#"{"new": true}"#).unwrap();
        let result = read_store_file(&path).unwrap();
        assert_eq!(result, r#"{"new": true}"#);

        cleanup(&path);
    }

    #[test]
    fn read_returns_exact_file_contents() {
        let path = temp_path("exact.json");
        cleanup(&path);

        let data = "{\n  \"items\": [\n    {\"id\": \"i1\", \"name\": \"Headlamp\"}\n  ]\n}\n";
        fs::write(&path, data).unwrap();
        let result = read_store_file(&path).unwrap();
        assert_eq!(result, data);

        cleanup(&path);
    }
}
