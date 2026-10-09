// 本地文件操作桥接：Tauri 环境使用系统原生对话框 + Rust 读写
import { isTauri, invoke } from './tauriBridge'

export { isTauri }

// 原生打开文件对话框，返回所选路径（取消返回 null）
export function pickOpenFile() {
  return invoke('pick_open_file')
}

// 原生保存文件对话框，返回所选路径（取消返回 null）
export function pickSaveFile(defaultName) {
  return invoke('pick_save_file', { defaultName })
}

// 原生选择文件夹对话框，返回所选路径（取消返回 null）
export function pickFolder() {
  return invoke('pick_folder')
}

export function readTextFile(path) {
  return invoke('read_text_file', { path })
}

export function writeTextFile(path, content) {
  return invoke('write_text_file', { path, content })
}

export function listDir(path) {
  return invoke('list_dir', { path })
}

// 在新窗口中打开指定文件
export function openFileInNewWindow(path) {
  return invoke('open_file_in_new_window', { path })
}

// 取路径中的文件名
export function baseName(path) {
  if (!path) return ''
  return String(path).split(/[\\/]/).pop()
}
