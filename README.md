# Paste

跨平台剪贴板历史工具（macOS / Windows），基于 Tauri 2 + React。

## 功能

- 剪贴板历史：文本、图片、代码、Markdown、文件路径
- 分类筛选与全文搜索
- 置顶收藏
- 全局快捷键呼出（默认 ⌘/Ctrl+Shift+V）
- 可配置历史有效期与自动清理
- 毛玻璃 UI、横向胶片流布局

## 开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```

- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/`

## 数据目录

- macOS: `~/Library/Application Support/com.paste.app/`
- Windows: `%APPDATA%/com.paste.app/`

## 权限说明

- **macOS**：首次使用粘贴到前台应用需授予「辅助功能」权限（系统设置 → 隐私与安全性 → 辅助功能）
- **剪贴板**：应用仅在本地存储历史，不上传云端
