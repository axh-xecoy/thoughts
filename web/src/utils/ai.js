import { isTauri, invoke, makeChannel } from './tauriBridge'

class Ai {
  constructor(options = {}) {
    this.options = options

    this.baseData = {}
    this.controller = null
    this.currentChunk = ''
    this.content = ''
    this.tauriReqId = null
    this.stopped = false
  }

  init(type = 'huoshan', options = {}) {
    // 火山引擎接口
    if (type === 'huoshan') {
      this.baseData = {
        api: options.api,
        method: options.method,
        headers: {
          Authorization: 'Bearer ' + options.key
        },
        data: {
          model: options.model,
          stream: true
        }
      }
    }
  }

  async request(data, progress = () => {}, end = () => {}, err = () => {}) {
    try {
      const res = await this.postMsg(data)
      const decoder = new TextDecoder()
      while (1) {
        const { done, value } = await res.read()
        if (done) {
          return
        }
        // 拿到当前切片的数据
        const text = decoder.decode(value)
        // 处理切片数据
        let chunk = this.handleChunkData(text)
        // 判断是否有不完整切片，如果有，合并下一次处理，没有则获取数据
        if (this.currentChunk) continue
        let isEnd = false
        const list = chunk
          .split('\n')
          .filter(item => {
            isEnd = item.includes('[DONE]')
            return !!item && !isEnd
          })
          .map(item => {
            return JSON.parse(item.replace(/^data:/, ''))
          })
        list.forEach(item => {
          this.content += item.choices
            .map(item2 => {
              return item2.delta.content
            })
            .join('')
        })
        progress(this.content)
        if (isEnd) {
          end(this.content)
        }
      }
    } catch (error) {
      console.log(error)
      // 手动停止请求不需要触发错误回调
      if (!(error && error.name === 'AbortError')) {
        err(error)
      }
    }
  }

  async postMsg(data) {
    if (isTauri) {
      return this.postTauriMsg(data)
    }
    this.controller = new AbortController()
    const res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
      signal: this.controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...this.baseData,
        data: {
          ...this.baseData.data,
          ...data
        }
      })
    })
    if (res.status && res.status !== 200) {
      throw new Error('请求失败')
    }
    return res.body.getReader()
  }

  // 通过 Tauri 命令发起流式请求，返回与 fetch reader 兼容的读取器
  async postTauriMsg(data) {
    const reqId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.tauriReqId = reqId
    this.stopped = false
    const queue = []
    let notify = null
    let ended = false
    let error = null
    const wake = () => {
      if (notify) {
        const resolve = notify
        notify = null
        resolve()
      }
    }
    const channel = makeChannel(chunk => {
      queue.push(chunk)
      wake()
    })
    const body = {
      ...this.baseData,
      data: {
        ...this.baseData.data,
        ...data
      }
    }
    invoke('ai_chat', {
      id: reqId,
      api: body.api,
      method: body.method,
      headers: body.headers || {},
      data: body.data || {},
      onChunk: channel
    })
      .then(() => {
        ended = true
        wake()
      })
      .catch(err => {
        error = err
        ended = true
        wake()
      })
    return {
      read: async () => {
        while (!queue.length && !ended) {
          await new Promise(resolve => {
            notify = resolve
          })
        }
        if (queue.length) {
          return {
            done: false,
            value: new TextEncoder().encode(queue.shift())
          }
        }
        if (error) {
          const e =
            typeof error === 'string' ? new Error(error) : new Error(String(error))
          // 手动停止时按 AbortError 处理，不触发错误回调
          if (this.stopped) {
            e.name = 'AbortError'
          }
          throw e
        }
        return { done: true }
      }
    }
  }

  handleChunkData(chunk) {
    chunk = chunk.trim()
    // 如果存在上一个切片
    if (this.currentChunk) {
      chunk = this.currentChunk + chunk
      this.currentChunk = ''
    }
    // 如果存在done,认为是完整切片且是最后一个切片
    if (chunk.includes('[DONE]')) {
      return chunk
    }
    // 最后一个字符串不为}，则默认切片不完整，保存与下次拼接使用（这种方法不严谨，但已经能解决大部分场景的问题）
    if (chunk[chunk.length - 1] !== '}') {
      this.currentChunk = chunk
    }
    return chunk
  }

  stop() {
    this.stopped = true
    if (isTauri) {
      if (this.tauriReqId) {
        invoke('ai_abort', { id: this.tauriReqId })
        this.tauriReqId = null
      }
      return
    }
    if (this.controller) {
      this.controller.abort()
    }
    this.controller = new AbortController()
  }
}

export default Ai
