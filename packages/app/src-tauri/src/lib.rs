use std::fs;
use std::io::Write;
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
    // Replace from the same directory so readers see a complete old or new file.
    let temporary = path.with_extension("json.tmp");
    let result = (|| -> std::io::Result<()> {
        let mut file = fs::File::create(&temporary)?;
        file.write_all(json.as_bytes())?;
        file.sync_all()?;
        fs::rename(&temporary, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result.map_err(|e| e.to_string())
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

#[tauri::command]
async fn share_checklist(window: tauri::WebviewWindow, text: String) -> Result<(), String> {
    #[cfg(target_os = "ios")]
    {
        let (sender, receiver) = std::sync::mpsc::channel();
        window
            .with_webview(move |webview| {
                let result = present_checklist(webview.view_controller(), &text);
                let _ = sender.send(result);
            })
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|e| e.to_string())?)
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (window, text);
        Err("Native sharing is available on iOS.".into())
    }
}

#[cfg(target_os = "ios")]
fn present_checklist(controller: *mut std::ffi::c_void, text: &str) -> Result<(), String> {
    use objc2::{runtime::AnyObject, MainThreadMarker, MainThreadOnly};
    use objc2_foundation::{NSArray, NSString};
    use objc2_ui_kit::{UIActivityViewController, UIViewController};

    let mtm = MainThreadMarker::new().ok_or("Sharing must run on the main thread.")?;
    // Tauri supplies the live UIKit controller and runs with_webview on the main thread.
    let controller = unsafe { (controller as *mut UIViewController).as_ref() }
        .ok_or("The app window is unavailable.")?;
    if controller.presentedViewController().is_some() {
        return Err("Close the current sheet before sharing.".into());
    }
    let text = NSString::from_str(text);
    let items = NSArray::from_slice(&[&*text as &AnyObject]);
    let activity = unsafe {
        UIActivityViewController::initWithActivityItems_applicationActivities(
            UIActivityViewController::alloc(mtm),
            &items,
            None,
        )
    };
    // iPad requires an anchor even though iPhone presents this as a bottom sheet.
    if let (Some(popover), Some(view)) =
        (activity.popoverPresentationController(), controller.view())
    {
        popover.setSourceView(Some(&view));
        let mut rect = view.bounds();
        rect.origin.x += rect.size.width / 2.0;
        rect.origin.y += rect.size.height / 2.0;
        rect.size.width = 1.0;
        rect.size.height = 1.0;
        popover.setSourceRect(rect);
    }
    controller.presentViewController_animated_completion(&activity, true, None);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_haptics::init());

    builder
        .invoke_handler(tauri::generate_handler![
            read_store,
            write_store,
            share_checklist
        ])
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
    fn failed_write_preserves_previous_file() {
        let path = temp_path("failed_write.json");
        let temporary = path.with_extension("json.tmp");
        cleanup(&path);
        let _ = fs::remove_dir_all(&temporary);
        fs::write(&path, "old data").unwrap();
        // A directory at the temporary path makes the write fail before replacement.
        fs::create_dir(&temporary).unwrap();

        assert!(write_store_file(&path, "new data").is_err());
        assert_eq!(read_store_file(&path).unwrap(), "old data");

        fs::remove_dir(&temporary).unwrap();
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
