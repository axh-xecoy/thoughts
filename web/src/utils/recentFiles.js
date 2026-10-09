// 最近打开文件列表（本地存储）
const KEY = 'SIMPLE_MIND_MAP_RECENT_FILES'
const MAX = 15

export function getRecentFiles() {
  try {
    const str = localStorage.getItem(KEY)
    const list = str ? JSON.parse(str) : []
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

export function addRecentFile(file) {
  if (!file || !file.path) {
    return getRecentFiles()
  }
  let list = getRecentFiles().filter(item => item.path !== file.path)
  list.unshift({
    name: file.name || file.path,
    path: file.path,
    time: Date.now()
  })
  if (list.length > MAX) {
    list = list.slice(0, MAX)
  }
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}

export function removeRecentFile(path) {
  const list = getRecentFiles().filter(item => item.path !== path)
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}

export function clearRecentFiles() {
  localStorage.removeItem(KEY)
  return []
}
