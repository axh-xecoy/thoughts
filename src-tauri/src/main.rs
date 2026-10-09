#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod localfile;

use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{LazyLock, Mutex};

use serde::Serialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

static WINDOW_COUNTER: AtomicUsize = AtomicUsize::new(0);

// 通过文件关联/命令行待打开的文件路径队列
static PENDING_OPEN_FILES: LazyLock<Mutex<Vec<String>>> = LazyLock::new(|| Mutex::new(Vec::new()));

const SUPPORTED_EXTS: [&str; 4] = ["smm", "json", "xmind", "md"];

fn main() {
    tauri::Builder::default()
        // 单实例：重复启动时在已运行的进程中打开新窗口
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            push_open_files(&args);
            open_new_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            let args: Vec<String> = std::env::args().collect();
            push_open_files(&args);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai::ai_test,
            ai::ai_chat,
            ai::ai_abort,
            open_external_url,
            take_open_file,
            set_window_title,
            open_file_in_new_window,
            localfile::pick_open_file,
            localfile::pick_save_file,
            localfile::pick_folder,
            localfile::read_text_file,
            localfile::write_text_file,
            localfile::list_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 收集命令行中以支持的扩展名结尾且存在的文件
fn push_open_files(args: &[String]) {
    for arg in args.iter().skip(1) {
        let path = Path::new(arg);
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase());
        if let Some(ext) = ext {
            if SUPPORTED_EXTS.contains(&ext.as_str()) && path.is_file() {
                PENDING_OPEN_FILES.lock().unwrap().push(arg.clone());
            }
        }
    }
}

fn open_new_window(app: &tauri::AppHandle) {
    let count = WINDOW_COUNTER.fetch_add(1, Ordering::SeqCst);
    let label = format!("win-{}", count);
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("思绪思维导图")
        .inner_size(1250.0, 800.0)
        .min_inner_size(900.0, 600.0)
        .center()
        // 关闭 Tauri 自带的拖拽处理，改用网页原生拖拽事件
        .disable_drag_drop_handler()
        .build();
}

// 使用系统默认浏览器打开外部链接
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    tauri_plugin_opener::open_url(&url, None::<&str>).map_err(|e| e.to_string())
}

// 设置当前窗口标题
#[tauri::command]
fn set_window_title(window: tauri::WebviewWindow, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}

// 在新窗口中打开指定文件
#[tauri::command]
async fn open_file_in_new_window(app: tauri::AppHandle, path: String) -> Result<(), String> {
    PENDING_OPEN_FILES.lock().unwrap().push(path);
    open_new_window(&app);
    Ok(())
}

#[derive(Serialize)]
struct OpenFile {
    name: String,
    path: String,
    content: String,
}

// 取出一个待打开的文件并返回其内容
#[tauri::command]
fn take_open_file() -> Result<Option<OpenFile>, String> {
    let path = {
        let mut files = PENDING_OPEN_FILES.lock().unwrap();
        if files.is_empty() {
            return Ok(None);
        }
        files.remove(0)
    };
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();
    Ok(Some(OpenFile {
        name,
        path,
        content,
    }))
}
