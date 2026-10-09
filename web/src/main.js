import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import '@/assets/icon-font/iconfont.css'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'
import i18n from './i18n'
import { getLang } from '@/api'
import { isTauri, invoke } from '@/utils/tauriBridge'
import { openExternalUrl } from '@/utils/openExternal'
// import VConsole from 'vconsole'
// const vConsole = new VConsole()

Vue.config.productionTip = false
const bus = new Vue()
Vue.prototype.$bus = bus
Vue.use(ElementUI)
Vue.use(VueViewer)

// 打开通过文件关联或命令行传入的文件
const openPendingFile = async () => {
  if (!isTauri) return
  try {
    const file = await invoke('take_open_file')
    if (!file) return
    bus.$emit('open_local_file', file)
  } catch (error) {
    console.log(error)
  }
}
bus.$on('app_inited', openPendingFile)

// 外部链接统一交给系统默认浏览器打开
if (isTauri) {
  document.addEventListener(
    'click',
    e => {
      const el = e.target
      const a = el && el.closest ? el.closest('a[href]') : null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (/^https?:\/\//i.test(href)) {
        e.preventDefault()
        openExternalUrl(href)
      }
    },
    true
  )
  const originalOpen = window.open
  window.open = function(url, ...rest) {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      openExternalUrl(url)
      return null
    }
    return originalOpen.call(window, url, ...rest)
  }
}

const initApp = () => {
  i18n.locale = getLang()
  new Vue({
    render: h => h(App),
    router,
    store,
    i18n
  }).$mount('#app')
}

// 是否处于接管应用模式
if (window.takeOverApp) {
  window.initApp = initApp
  window.$bus = bus
} else {
  initApp()
}
