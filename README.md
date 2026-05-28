# Paste

跨平台剪贴板历史工具 · macOS / Windows · 基于 Tauri 2 + React 19 + Rust。

一个安静地呆在背后、按 `⌘⇧V` 就出现的剪贴板。纸森小清新外观，零联网依赖，本地优先。

---

## ✨ 项目优点

### 1. 真正不卡死的稳定性
- **Rust 后端**：内存安全，无 GC 停顿
- **修复了 `std::sync::Mutex` 重入死锁**：数据库锁严格作用域化，永不阻塞 UI
- **所有阻塞操作（OCR / 系统注入 / 子进程）走 `spawn_blocking`**，主线程永远响应
- **零 Electron**：Tauri 用系统 WebView，安装包 < 10 MB，内存占用 < 80 MB

### 2. 类型语义化的剪贴板
- 5 种内容类型自动识别：**文本 / 代码 / Markdown / 图片 / 文件**
- 文件走原生 `NSPasteboard` 文件 URL，**粘贴出来是真文件，不是路径文本**
- 每种类型有专属色板与图标（米黄 / 薄荷 / 淡蓝 / 樱花 / 砂米）
- 代码自动检测语言，Markdown 单独分类

### 3. 模糊搜索（Fuse.js）
- **任意子字符匹配**：`ru` 能搜到 `npm run tauri build`
- **散字符子序列**：`nrt` 也能匹配
- **多 token AND**：`npm tau` 同时命中
- 按匹配度自动排序
- 中文友好，离线本地计算 < 5 ms

### 4. 本地 OCR（中文支持）
- 集成 **Tesseract + `chi_sim`** 语言包
- 完全离线，不上传图片
- 一键识别图片文字
- 构建脚本自动准备依赖，开箱即用

### 5. 多屏 / 焦点智能恢复
- 面板**在光标所在的显示器**弹出，不再固定主屏
- 唤起前记录前台应用，选择后**自动切回原应用再粘贴**
- 鼠标移出 / 失焦自动关闭，无需手动 ESC
- 双击条目直接粘贴

### 6. 纸森 · 小清新 UI
- 暖米白纸面 + 莫兰迪低饱和色板 + 薄荷青强调
- 衬线斜体 + 系统圆体字体，零外部字体依赖
- SVG 噪点纸纹、水彩晕染、心形爆裂动效
- 卡片错位入场、弹簧选中上浮
- 浅色 / 深色双主题

### 7. 性能与体积
- 横向虚拟滚动（`@tanstack/react-virtual`），上万条记录仍流畅
- SQLite + FTS5 后端 + WAL 模式
- 启动 < 500 ms，呼出 < 50 ms

### 8. 隐私优先
- **所有数据仅存本地 SQLite**，永不上云
- 无遥测、无埋点、无网络请求
- 开源 MIT 协议

---

## 🚀 快速开始

```bash
npm install
npm run tauri dev      # 开发模式（热更新）
npm run tauri build    # 生产打包
```

构建产物：
- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/`

---

## ⌨️ 快捷键

| 键 | 作用 |
|---|---|
| `⌘⇧V` | 唤出 / 隐藏面板（可自定义） |
| `← →` | 切换条目 |
| `↵` | 粘贴到原应用 |
| `1–9` | 速贴对应位置 |
| `␣` | 预览 |
| `⌘F` | 聚焦搜索框 |
| `esc` | 关闭面板 |

双击条目 = 直接粘贴。

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Tauri 2 · macOSPrivateApi · 透明窗口 |
| 后端 | Rust · rusqlite (FTS5 + WAL) · objc2 · CGEvent |
| 前端 | React 19 · TypeScript · Tailwind v4 · Zustand · Framer Motion |
| 搜索 | Fuse.js（多 token + 子序列 fuzzy） |
| OCR | Tesseract + chi_sim |
| 虚拟化 | @tanstack/react-virtual |
| UI 原语 | Radix UI · Lucide Icons |

---

## 📁 数据目录

| OS | 路径 |
|---|---|
| macOS | `~/Library/Application Support/com.wangk.clipboard-history/` |
| Windows | `%APPDATA%/com.wangk.clipboard-history/` |

包含 SQLite 数据库、图片缓存、配置文件。卸载后可手动清理。

---

## 🔐 权限说明（macOS）

首次粘贴到前台应用需授予「辅助功能」权限：

```
系统设置 → 隐私与安全性 → 辅助功能 → 勾选 Paste
```

授权后请彻底退出并重新打开。未授权时仍可使用，但选中条目仅写入剪贴板，不会自动粘贴。

---

## 📝 License

MIT
