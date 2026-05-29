# Paste

跨平台剪贴板历史工具 · macOS / Windows · 基于 Tauri 2 + React 19 + Rust。

按 `⌘⇧V` 在光标所在屏幕底部唤出横向历史条。纸森小清新外观，数据本地存储，零联网依赖。

---

## 功能概览

### 剪贴板与类型识别

- 自动识别 **文本 / 代码 / Markdown / 图片 / 文件**
- 文件走原生剪贴板，粘贴为真实文件而非路径字符串
- 按类型筛选；列表缩略图按屏幕 DPR 1:1 显示，清晰不拉伸

### 分组（替代原「收藏」）

- 支持分组 **增删改查**（名称必填、描述可选）
- 筛选栏「分组」下拉中管理分组，右键或卡片上快速 **加入 / 修改 / 移出** 分组
- **已分组条目永不自动清理**，未分组仍按设置过期删除
- 每条记录仅属于一个分组；无分组则不显示标签

### 搜索

- Fuse.js 模糊搜索：子串、散列子序列、多 token AND
- SQLite FTS5 与本地 Fuse 配合，中文友好，离线计算

### 图片预览（独立窗口）

- 按 `␣` 或预览按钮打开 **独立预览窗口**（非主面板内嵌）
- 按原图尺寸显示，超出屏幕时等比缩小
- 预览内 `↵` 粘贴、`⇧↵` 纯文本粘贴，并 **置顶到历史首位**
- `esc` 关闭预览

### 多屏与粘贴

- 主面板、设置、预览均在 **当前鼠标所在显示器** 定位
- 主面板宽度 **贴近该屏可用宽度**，高度随内容自适应（不可拖拽缩放）
- 唤起前记录前台应用，粘贴时写剪贴板并尝试 `⌘V` 回到原应用
- 未授予 macOS「辅助功能」时仍可复制到系统剪贴板，但不会自动注入按键

### OCR

- Tesseract + `chi_sim`，完全离线识别图片文字

### UI

- 暖米白纸面、莫兰迪色、薄荷青强调；浅/深色主题
- 横向虚拟滚动，大量历史仍流畅

### 隐私

- 数据仅存本地 SQLite，无遥测、无上传

---

## 快速开始

```bash
npm install
npm run tauri dev          # 开发（热更新）
npm run tauri:build        # 生产打包（macOS：签名 + DMG）
```

仅构建 `.app`、不打 DMG：

```bash
npm run tauri build -- --bundles app
```

### 构建产物

| 平台 | 路径 |
|------|------|
| macOS 应用 | `src-tauri/target/release/bundle/macos/Paste.app` |
| macOS 安装包 | `src-tauri/target/release/bundle/dmg/Paste_0.1.0_aarch64.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/` |

macOS DMG 由 `scripts/bundle-dmg-simple.sh`（`hdiutil`）生成，避免部分系统上 Tauri 自带 `bundle_dmg.sh` 因 Finder 脚本失败。

---

## 快捷键

### 主面板

| 键 | 作用 |
|----|------|
| `⌘⇧V` | 唤出 / 隐藏（可在设置中修改） |
| `←` `→` | 切换条目 |
| `↵` | 粘贴到原应用 |
| `⇧↵` | 纯文本粘贴 |
| `⌘1`–`⌘9` | 快速粘贴第 1–9 条 |
| `␣` | 预览（图片为独立窗口，其他为文本预览） |
| `⌘F` | 聚焦搜索 |
| `esc` | 关闭面板 |

双击条目 = 直接粘贴。

### 图片预览窗口

| 键 | 作用 |
|----|------|
| `↵` | 粘贴 |
| `⇧↵` | 纯文本粘贴 |
| `esc` | 关闭 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Tauri 2 · 多窗口（main / settings / preview） |
| 后端 | Rust · rusqlite (FTS5 + WAL) · arboard · CGEvent |
| 前端 | React 19 · TypeScript · Tailwind v4 · Zustand · Framer Motion |
| 搜索 | Fuse.js |
| OCR | Tesseract + chi_sim |
| 列表 | @tanstack/react-virtual |
| UI | Radix UI · Lucide |

---

## 数据目录

| OS | 路径 |
|----|------|
| macOS | `~/Library/Application Support/com.wangk.clipboard-history/` |
| Windows | `%APPDATA%/com.wangk.clipboard-history/` |

含 SQLite、图片缓存、配置。卸载后可手动删除该目录。

---

## macOS 权限

粘贴到前台应用需 **辅助功能**：

**系统设置 → 隐私与安全性 → 辅助功能 → 勾选 Paste**

修改权限后请完全退出并重新打开应用。未授权时选中条目仍会写入系统剪贴板，需手动 `⌘V`。

---

## License

MIT
