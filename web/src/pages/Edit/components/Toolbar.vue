<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <div class="toolbar" ref="toolbarRef">
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>
      <!-- 导出 -->
      <div class="toolbarBlock">
        <div class="toolbarBtn" @click="openDirectory" v-if="!isMobile">
          <span class="icon iconfont icondakai"></span>
          <span class="text">{{ $t('toolbar.directory') }}</span>
        </div>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.newFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" @click="createNewLocalFile">
            <span class="icon iconfont iconxinjian"></span>
            <span class="text">{{ $t('toolbar.newFile') }}</span>
          </div>
        </el-tooltip>
        <el-popover
          v-if="!isMobile"
          v-model="openFilePopoverVisible"
          placement="bottom"
          width="240"
          trigger="hover"
          popper-class="recentFilePopover"
        >
          <div class="recentFileBox">
            <div class="recentFileTitle">{{ $t('toolbar.recent') }}</div>
            <div v-if="recentFiles.length === 0" class="recentFileEmpty">
              {{ $t('toolbar.recentEmpty') }}
            </div>
            <div
              v-for="item in recentFiles"
              :key="item.path"
              class="recentFileItem"
              :title="item.path"
              @click="openRecentFile(item)"
            >
              <span class="icon iconfont iconwenjian1"></span>
              <span class="recentFileName">{{ item.name }}</span>
            </div>
            <div
              v-if="recentFiles.length > 0"
              class="recentFileClear"
              @click="clearRecent"
            >
              <span class="el-icon-delete"></span>
              <span>{{ $t('toolbar.clear') }}</span>
            </div>
            <div class="recentFileTip">{{ $t('toolbar.openFileTip') }}</div>
          </div>
          <div slot="reference" class="toolbarBtn" @click="openLocalFile">
            <span class="icon iconfont iconwenjian1"></span>
            <span class="text">{{ $t('toolbar.openFile') }}</span>
          </div>
        </el-popover>
        <div class="toolbarBtn" @click="saveFile" v-if="!isMobile">
          <span class="icon iconfont iconlingcunwei"></span>
          <span class="text">{{ $t('toolbar.save') }}</span>
        </div>
        <div class="toolbarBtn" @click="saveLocalFile" v-if="!isMobile">
          <span class="icon iconfont icondaochu1"></span>
          <span class="text">{{ $t('toolbar.saveAs') }}</span>
        </div>
        <div class="toolbarBtn" @click="$bus.$emit('showImport')">
          <span class="icon iconfont icondaoru"></span>
          <span class="text">{{ $t('toolbar.import') }}</span>
        </div>
        <div
          class="toolbarBtn"
          @click="$bus.$emit('showExport')"
          style="margin-right: 0;"
        >
          <span class="icon iconfont iconexport"></span>
          <span class="text">{{ $t('toolbar.export') }}</span>
        </div>
        <!-- 本地文件树 -->
        <div
          class="fileTreeBox"
          v-if="fileTreeVisible"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? '/' + rootDirName : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              ></div>
              <div
                class="btn el-icon-close"
                @click="fileTreeVisible = false"
              ></div>
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <span class="customTreeNode" slot-scope="{ node, data }">
                <div class="treeNodeInfo">
                  <span
                    class="treeNodeIcon iconfont"
                    :class="[
                      data.type === 'file' ? 'iconwenjian' : 'icondakai'
                    ]"
                  ></span>
                  <span class="treeNodeName">{{ node.label }}</span>
                </div>
                <div class="treeNodeBtnList" v-if="data.type === 'file'">
                  <el-button
                    type="text"
                    size="mini"
                    v-if="data.enableEdit"
                    @click="editLocalFile(data)"
                    >编辑</el-button
                  >
                  <el-button
                    type="text"
                    size="mini"
                    v-else
                    @click="importLocalFile(data)"
                    >导入</el-button
                  >
                </div>
              </span>
            </el-tree>
          </div>
        </div>
      </div>
    </div>
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'
import {
  isTauri,
  pickOpenFile,
  pickSaveFile,
  pickFolder,
  readTextFile,
  writeTextFile,
  listDir,
  baseName,
  openFileInNewWindow
} from '@/utils/localFile'
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles
} from '@/utils/recentFiles'
import { setWindowTitle } from '@/utils/appWindow'

// 工具栏
let fileHandle = null
// Tauri 环境下当前编辑的本地文件路径
let currentFilePath = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'ai'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    return {
      isMobile: isMobile(),
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      recentFiles: [],
      openFilePopoverVisible: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi
    }),

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
    this.$bus.$on('open_local_file', this.handleOpenLocalFile)
  },
  mounted() {
    this.computeToolbarShow()
    this.recentFiles = getRecentFiles()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    this.$bus.$off('open_local_file', this.handleOpenLocalFile)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
  },
  methods: {
    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      const windowWidth = window.innerWidth - 40
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    onWriteLocalFile(content) {
      clearTimeout(this.timer)
      if (fileHandle && this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        if (isTauri) {
          let dirPath
          if (node.level === 0) {
            dirPath = await pickFolder()
            if (!dirPath) {
              this.fileTreeVisible = false
              resolve([])
              return
            }
            this.rootDirName = baseName(dirPath)
          } else {
            dirPath = node.data.path
          }
          const entries = await listDir(dirPath)
          const dirList = []
          const fileList = []
          for (const entry of entries) {
            const isFile = !entry.isDir
            if (isFile && !/\.(smm|xmind|md|json)$/.test(entry.name)) {
              continue
            }
            const enableEdit = isFile && /\.smm$/.test(entry.name)
            const data = {
              id: entry.path,
              name: entry.name,
              type: entry.isDir ? 'directory' : 'file',
              path: entry.path,
              leaf: isFile,
              enableEdit
            }
            if (isFile) {
              fileList.push(data)
            } else {
              dirList.push(data)
            }
          }
          resolve([...dirList, ...fileList])
          return
        }
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        console.log(error)
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (isTauri) {
        currentFilePath = data.path
        this.readFile()
        return
      }
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        if (isTauri) {
          const content = await readTextFile(data.path)
          const file = new File([content], data.name, {
            type: 'application/json'
          })
          this.$refs.ImportRef.onChange({
            raw: file,
            name: data.name
          })
          this.$refs.ImportRef.confirm()
          return
        }
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
        console.log(error)
      }
    },

    // 打开本地文件
    async openLocalFile() {
      this.openFilePopoverVisible = false
      if (isTauri) {
        try {
          const path = await pickOpenFile()
          if (!path) return
          this.askOpenMode(path)
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('toolbar.fileOpenFailed'))
        }
        return
      }
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 询问在当前窗口打开还是新窗口打开
    askOpenMode(path) {
      const name = baseName(path)
      this.$confirm(
        this.$t('toolbar.openFileConfirm', { name }),
        this.$t('toolbar.openFileTitle'),
        {
          confirmButtonText: this.$t('toolbar.openInCurrentWindow'),
          cancelButtonText: this.$t('toolbar.openInNewWindow'),
          distinguishCancelAndClose: true,
          type: 'info'
        }
      )
        .then(() => {
          this.loadLocalFile(path)
        })
        .catch(action => {
          if (action === 'cancel') {
            openFileInNewWindow(path)
          }
        })
    },

    // 在当前窗口加载指定文件
    async loadLocalFile(path) {
      try {
        currentFilePath = path
        await this.readFile()
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
        this.recentFiles = removeRecentFile(path)
      }
    },

    // 打开最近文件
    openRecentFile(item) {
      this.openFilePopoverVisible = false
      if (!item || !item.path) return
      this.askOpenMode(item.path)
    },

    // 处理通过文件关联/新窗口传入的文件
    handleOpenLocalFile(file) {
      if (!file || !file.path) return
      currentFilePath = file.path
      this.$store.commit('setIsHandleLocalFile', true)
      this.setData(file.content)
      setWindowTitle(file.name)
      this.recentFiles = addRecentFile({
        name: file.name,
        path: file.path
      })
    },

    // 清空最近文件
    clearRecent() {
      this.recentFiles = clearRecentFiles()
    },

    // 读取本地文件
    async readFile() {
      let fileName = ''
      let str = ''
      if (isTauri) {
        if (!currentFilePath) return
        fileName = baseName(currentFilePath)
        str = await readTextFile(currentFilePath)
      } else {
        let file = await fileHandle.getFile()
        fileName = file.name
        str = await new Promise((resolve, reject) => {
          let fileReader = new FileReader()
          fileReader.onload = () => resolve(fileReader.result)
          fileReader.onerror = reject
          fileReader.readAsText(file)
        })
      }
      this.$store.commit('setIsHandleLocalFile', true)
      this.setData(str)
      setWindowTitle(fileName)
      if (isTauri && currentFilePath) {
        this.recentFiles = addRecentFile({
          name: fileName,
          path: currentFilePath
        })
      }
      Notification.closeAll()
      Notification({
        title: this.$t('toolbar.tip'),
        message: `${this.$t('toolbar.editingLocalFileTipFront')}${fileName}${this.$t(
          'toolbar.editingLocalFileTipEnd'
        )}`,
        duration: 0,
        showClose: true
      })
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (isTauri) {
        if (!currentFilePath || !this.isHandleLocalFile) {
          this.waitingWriteToLocalFile = false
          return
        }
        try {
          if (!this.isFullDataFile) {
            content = content.root
          }
          await writeTextFile(currentFilePath, JSON.stringify(content))
        } catch (error) {
          console.log(error)
        }
        this.waitingWriteToLocalFile = false
        return
      }
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
    },

    // 创建本地文件
    async createNewLocalFile() {
      await this.createLocalFile(exampleData)
    },

    // 保存：有当前文件时静默写回，否则走另存为
    async saveFile() {
      if (isTauri && currentFilePath && this.isHandleLocalFile) {
        try {
          await this.writeLocalFile(getData())
          this.$message.success(this.$t('toolbar.saveSuccess'))
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('toolbar.fileSaveFailed'))
        }
        return
      }
      await this.saveLocalFile()
    },

    // 另存为
    async saveLocalFile() {
      let data = getData()
      await this.createLocalFile(data)
    },

    // 创建本地文件
    async createLocalFile(content) {
      if (isTauri) {
        try {
          let path = await pickSaveFile(this.$t('toolbar.defaultFileName'))
          if (!path) {
            return
          }
          if (!/\.(smm|json)$/i.test(path)) {
            path += '.smm'
          }
          const loading = this.$loading({
            lock: true,
            text: this.$t('toolbar.creatingTip'),
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)'
          })
          currentFilePath = path
          this.$store.commit('setIsHandleLocalFile', true)
          this.isFullDataFile = true
          await this.writeLocalFile(content)
          await this.readFile()
          loading.close()
        } catch (error) {
          console.log(error)
        }
        return
      }
      try {
        let _fileHandle = await window.showSaveFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          suggestedName: this.$t('toolbar.defaultFileName')
        })
        if (!_fileHandle) {
          return
        }
        const loading = this.$loading({
          lock: true,
          text: this.$t('toolbar.creatingTip'),
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.isFullDataFile = true
        await this.writeLocalFile(content)
        await this.readFile()
        loading.close()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    }
  }
}
</script>

<style lang="less" scoped>
.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }
  }
  .toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      margin-right: 20px;

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;
      }

      .text {
        margin-top: 3px;
      }
    }
  }
}
</style>

<style lang="less">
.recentFilePopover {
  padding: 0 !important;

  .recentFileBox {
    padding: 6px 0;
  }

  .recentFileTitle {
    padding: 4px 12px;
    font-size: 12px;
    color: #909399;
  }

  .recentFileEmpty {
    padding: 6px 12px;
    font-size: 13px;
    color: #c0c4cc;
  }

  .recentFileItem {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    font-size: 13px;
    color: #606266;
    cursor: pointer;

    &:hover {
      background-color: #f5f7fa;
      color: #409eff;
    }

    .icon {
      margin-right: 8px;
    }

    .recentFileName {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .recentFileClear {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    margin-top: 4px;
    font-size: 13px;
    color: #909399;
    border-top: 1px solid #ebeef5;
    cursor: pointer;

    &:hover {
      color: #f56c6c;
    }

    .el-icon-delete {
      margin-right: 8px;
    }
  }

  .recentFileTip {
    padding: 6px 12px 2px;
    margin-top: 4px;
    font-size: 12px;
    color: #c0c4cc;
    border-top: 1px solid #ebeef5;
  }
}

.isDark .recentFilePopover {
  background-color: #36393d;
  border-color: #4c4c4c;

  .recentFileTitle {
    color: #8a8f99;
  }

  .recentFileEmpty,
  .recentFileTip {
    color: #6b6f78;
  }

  .recentFileItem {
    color: #cfd3dc;

    &:hover {
      background-color: #2b2e31;
      color: #409eff;
    }
  }

  .recentFileClear {
    border-top-color: #4c4c4c;
  }
}
</style>
