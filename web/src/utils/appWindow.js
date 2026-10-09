import { isTauri, invoke } from './tauriBridge'

const BASE_TITLE = '思绪思维导图'

// 设置窗口标题，传入文件名则显示为「文件名 - 思绪思维导图」
export function setWindowTitle(name) {
  const title = name ? `${name} - ${BASE_TITLE}` : BASE_TITLE
  if (isTauri) {
    invoke('set_window_title', { title })
  } else {
    document.title = title
  }
}
