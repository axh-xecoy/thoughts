import { isTauri, invoke } from './tauriBridge'

// 打开外部链接：Tauri 环境交给系统默认浏览器，网页环境使用新标签页
export function openExternalUrl(url) {
  if (!url) return
  if (isTauri) {
    invoke('open_external_url', { url })
  } else {
    window.open(url, '_blank')
  }
}
