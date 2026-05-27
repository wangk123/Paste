use crate::clipboard::watcher::write_clipboard;
use crate::focus::restore_focus_and_paste;
use crate::config::{save_config, AppConfig};
use crate::shortcuts::manager::{hide_main_window, show_main_window, update_toggle_shortcut};
use crate::storage::cleanup::run_cleanup_now;
use crate::storage::models::{Category, Clip, ListClipsParams, SearchClipsParams};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_clips(state: State<AppState>, params: ListClipsParams) -> Result<Vec<Clip>, String> {
    state.db.list_clips(&params)
}

#[tauri::command]
pub fn search_clips(state: State<AppState>, params: SearchClipsParams) -> Result<Vec<Clip>, String> {
    state.db.search_clips(&params)
}

#[tauri::command]
pub fn get_clip(state: State<AppState>, id: String) -> Result<Clip, String> {
    state.db.get_clip(&id)
}

#[tauri::command]
pub fn delete_clip(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_clip(&id)
}

#[tauri::command]
pub fn pin_clip(state: State<AppState>, id: String, pinned: bool) -> Result<Clip, String> {
    state.db.pin_clip(&id, pinned)
}

#[tauri::command]
pub fn set_clip_category(
    state: State<AppState>,
    id: String,
    category_id: Option<String>,
) -> Result<Clip, String> {
    state.db.set_category(&id, category_id)
}

#[tauri::command]
pub fn list_categories(state: State<AppState>) -> Result<Vec<Category>, String> {
    state.db.list_categories()
}

#[tauri::command]
pub fn upsert_category(state: State<AppState>, category: Category) -> Result<Category, String> {
    state.db.upsert_category(&category)
}

#[tauri::command]
pub fn delete_category(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_category(&id)
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppConfig, String> {
    Ok(state.config.lock().clone())
}

#[tauri::command]
pub fn update_settings(
    app: tauri::AppHandle,
    state: State<AppState>,
    config: AppConfig,
) -> Result<AppConfig, String> {
    save_config(&config)?;
    {
        *state.config.lock() = config.clone();
    }
    update_toggle_shortcut(&app, &config)?;

    if config.launch_at_login {
        use tauri_plugin_autostart::ManagerExt;
        let _ = app.autolaunch().enable();
    } else {
        use tauri_plugin_autostart::ManagerExt;
        let _ = app.autolaunch().disable();
    }

    Ok(config)
}

#[tauri::command]
pub fn update_shortcut(
    app: tauri::AppHandle,
    state: State<AppState>,
    shortcut: String,
) -> Result<AppConfig, String> {
    let mut config = state.config.lock().clone();
    config.shortcut_toggle = shortcut;
    save_config(&config)?;
    {
        *state.config.lock() = config.clone();
    }
    update_toggle_shortcut(&app, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn paste_clip(
    app: tauri::AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    paste_clip_inner(&app, &state, id, false)
}

#[tauri::command]
pub fn paste_clip_plain(
    app: tauri::AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    paste_clip_inner(&app, &state, id, true)
}

/// 同步 IPC。流程：取剪贴板内容 → 写系统剪贴板 → 隐藏面板 →
/// 立即返回前端；延时 300ms 后在独立线程发 ⌘V，避免任何 main 线程阻塞。
fn paste_clip_inner(
    app: &tauri::AppHandle,
    state: &State<AppState>,
    id: String,
    plain: bool,
) -> Result<(), String> {
    let clip = state.db.get_clip(&id)?;
    write_clipboard(&clip)?;
    hide_main_window(app);

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(300));
        if let Err(e) = restore_focus_and_paste(plain) {
            eprintln!("[paste] CGEvent 注入失败: {e}");
        }
    });

    Ok(())
}

#[tauri::command]
pub fn copy_clip(state: State<AppState>, id: String) -> Result<(), String> {
    let clip = state.db.get_clip(&id)?;
    write_clipboard(&clip)
}

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    hide_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn run_cleanup(state: State<AppState>) -> Result<u32, String> {
    let config = state.config.lock().clone();
    run_cleanup_now(&state.db, &config)
}

#[tauri::command]
pub fn get_stats(state: State<AppState>) -> Result<(i64, i64), String> {
    state.db.stats()
}

#[tauri::command]
pub fn read_image_base64(path: String) -> Result<String, String> {
    let data = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &data,
    ))
}
