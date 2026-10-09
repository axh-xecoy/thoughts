# 思绪思维导图 · Tauri 桌面版

> ⚠️ 本项目**不是官方项目**，而是基于开源项目 **[simple-mind-map / mind-map](https://github.com/wanglin2/mind-map)** 中 **Web 版**（Vue2 + ElementUI）二次封装的 Windows 桌面客户端。
>
> 「思绪思维导图」产品名、图标及原始代码版权归原作者所有，详见 [LICENSE](./LICENSE)。

## 关于源项目

- 仓库：[wanglin2/mind-map](https://github.com/wanglin2/mind-map)
- 官网：[https://sxmind.cn/](https://sxmind.cn/)，网页版：[https://web.sxmind.cn/](https://web.sxmind.cn/)
- 源项目包含两部分：开源的 JavaScript 思维导图库 `simple-mind-map`，以及基于该库的 Web 思维导图；此外还有闭源的官方客户端与插件。
- 本仓库仅取其中 **Web 版** 的代码（`web/` 目录），用 [Tauri 2](https://tauri.app/) 封装为原生桌面应用，目标是获得比浏览器更原生的桌面体验。

## 本项目相对源项目 Web 版做了哪些改动

- **桌面化**：使用 Tauri 2（Rust + WebView2）打包为 Windows 桌面程序，替代浏览器运行。
- **单实例 + 多窗口**：重复启动时不再报错，而是由已运行进程**打开新窗口**。
- **`.smm` 文件关联**：安装后双击 `.smm` 可直接用本程序打开；通过文件关联/命令行传入的文件在冷启动时自动加载。
- **原生本地文件操作**：本地文件的打开 / 新建 / 另存为 / 选择文件夹改为**系统原生对话框 + Rust 读写**，去掉了浏览器 File System Access API 的 `tauri.localhost` 权限弹窗；新增独立的**「保存」按钮**，在编辑本地文件时点击即**静默写回原文件**（无需对话框、无需授权），未打开文件时等同于「另存为」。
- **标题栏显示文件名**：打开/新建文件后，窗口标题显示为「文件名 - 思绪思维导图」。
- **最近文件**：工具栏新增「最近」入口，记录并快速重开最近编辑过的文件。
- **打开方式选择**：点击「打开」选择文件后，弹窗询问「在此窗口打开 / 在新窗口打开」（沿用项目已有的 ElementUI 弹窗风格）。
- **拖拽导入默认开启**：直接拖拽 `.smm` 等文件到窗口即可导入。
- **内置 AI**：源 Web 版依赖本地 Node 代理（`localhost:3456`），本项目改为由 Rust 直接发起流式请求，支持流式中止，无需额外进程。
- **外部链接**：帮助文档、GitHub、官方网站等链接统一由**系统默认浏览器**打开。
- **去统计**：移除了 Web 版中的 51.la 等第三方统计脚本。
- **图标**：使用官方站点图标重新生成全套应用图标。

## 技术栈

- 前端：Vue 2 + ElementUI + simple-mind-map（沿用源项目）
- 外壳：Tauri 2 + Rust
- 关键插件：`tauri-plugin-single-instance`、`tauri-plugin-opener`、`tauri-plugin-dialog`

## 开发与构建

环境要求：

- Node.js（建议 18+，本项目在 Node 24 下构建通过）
- Rust 工具链（stable）
- Windows 10/11（自带 WebView2 Runtime）

命令（在项目根目录执行）：

```bash
npm install          # 安装 Tauri CLI
npm run dev          # 开发模式（自动启动前端 dev server + Tauri 窗口）
npm run build        # 构建发布版并打包安装程序
```

前端构建在 `web/` 子目录中完成，脚本内部通过 `cross-env` 设置 `NODE_OPTIONS=--openssl-legacy-provider` 以兼容新版 Node。

构建产物：

- 可执行文件：`src-tauri/target/release/thoughts.exe`
- 安装程序（NSIS）：`src-tauri/target/release/bundle/nsis/thoughts_0.13.1_x64-setup.exe`

> 说明：仅提供 NSIS 安装包。MSI 因中文文件关联描述超出 WiX 的 1252 代码页而移除。

## 许可

本项目遵循源项目的 [MIT License](./LICENSE)，版权归原作者 The MindMap Team 所有。
