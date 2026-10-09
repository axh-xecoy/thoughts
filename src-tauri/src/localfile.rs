use std::path::PathBuf;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().to_string()
}

// 打开文件对话框，返回所选文件路径
#[tauri::command]
pub async fn pick_open_file(app: AppHandle) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("思绪思维导图", &["smm", "json"])
        .set_title("打开文件")
        .pick_file(move |path| {
            let _ = tx.send(path);
        });
    rx.await
        .ok()
        .flatten()
        .and_then(|p| p.simplified().into_path().ok())
        .map(path_to_string)
}

// 保存文件对话框，返回所选文件路径
#[tauri::command]
pub async fn pick_save_file(app: AppHandle, default_name: Option<String>) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut builder = app
        .dialog()
        .file()
        .add_filter("思绪思维导图", &["smm"])
        .set_title("保存文件");
    if let Some(name) = default_name {
        builder = builder.set_file_name(name);
    }
    builder.save_file(move |path| {
        let _ = tx.send(path);
    });
    rx.await
        .ok()
        .flatten()
        .and_then(|p| p.simplified().into_path().ok())
        .map(path_to_string)
}

// 选择文件夹对话框
#[tauri::command]
pub async fn pick_folder(app: AppHandle) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("选择文件夹")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });
    rx.await
        .ok()
        .flatten()
        .and_then(|p| p.simplified().into_path().ok())
        .map(path_to_string)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut list = Vec::new();
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        list.push(DirEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
        });
    }
    Ok(list)
}
