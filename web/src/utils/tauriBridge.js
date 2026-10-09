// Tauri v2 调用桥接
// 不引入 @tauri-apps/api（其现代语法 webpack4 无法编译），直接使用注入的内部接口

export const isTauri = !!(
  typeof window !== 'undefined' && window.__TAURI_INTERNALS__
)

export function invoke(cmd, args = {}) {
  if (!isTauri) {
    return Promise.reject(new Error('not running in tauri'))
  }
  return window.__TAURI_INTERNALS__.invoke(cmd, args)
}

// 手写一个与 @tauri-apps/api Channel 序列化格式一致的通道对象
export function makeChannel(onMessage) {
  const transformCallback = window.__TAURI_INTERNALS__.transformCallback
  const id = transformCallback(event => onMessage(event))
  return {
    __TAURI_CHANNEL_MARKER__: true,
    id: id,
    getId: () => `__CHANNEL__:${id}`,
    toJSON() {
      return `__CHANNEL__:${id}`
    }
  }
}
