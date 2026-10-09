use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use futures_util::future::{abortable, AbortHandle};
use futures_util::StreamExt;
use serde_json::Value;
use tauri::ipc::Channel;

static ABORT_HANDLES: LazyLock<Mutex<HashMap<String, AbortHandle>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// 检测客户端是否可用，对应原本地客户端的 GET /ai/test
#[tauri::command]
pub fn ai_test() -> Result<Value, String> {
    Ok(serde_json::json!({ "ok": true }))
}

/// 发起 AI 流式请求，SSE 数据通过 Channel 逐块推送给前端
#[tauri::command]
pub async fn ai_chat(
    id: String,
    api: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    data: Option<Value>,
    on_chunk: Channel<String>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let method = method.unwrap_or_else(|| "POST".to_string());
    let mut req = match method.to_uppercase().as_str() {
        "GET" => client.get(&api),
        _ => client.post(&api),
    };
    if let Some(headers) = headers {
        for (key, value) in headers {
            req = req.header(key, value);
        }
    }
    if let Some(data) = data {
        req = req.json(&data);
    }

    let fut = async move {
        let resp = req.send().await.map_err(|e| format!("请求发送失败：{}", e))?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("请求失败：{} {}", status, body));
        }
        let mut stream = resp.bytes_stream();
        while let Some(item) = stream.next().await {
            let bytes = item.map_err(|e| format!("读取响应流失败：{}", e))?;
            if on_chunk
                .send(String::from_utf8_lossy(&bytes).to_string())
                .is_err()
            {
                // 前端已不再接收，结束请求
                return Ok(());
            }
        }
        Ok(())
    };

    let (abortable_fut, handle) = abortable(fut);
    ABORT_HANDLES.lock().unwrap().insert(id.clone(), handle);
    let result = abortable_fut.await;
    ABORT_HANDLES.lock().unwrap().remove(&id);
    match result {
        Ok(inner) => inner,
        Err(_) => Err("abort".to_string()),
    }
}

/// 中止指定的流式请求
#[tauri::command]
pub fn ai_abort(id: String) {
    if let Some(handle) = ABORT_HANDLES.lock().unwrap().remove(&id) {
        handle.abort();
    }
}
