use crate::config::AppConfig;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub fn register_toggle_shortcut(app: &AppHandle, shortcut_str: &str) -> Result<(), String> {
    let shortcut: Shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|e| format!("{e:?}"))?;

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let h = app_handle.clone();
                let _ = app_handle.run_on_main_thread(move || toggle_main_window(&h));
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn unregister_all(app: &AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())
}

pub fn update_toggle_shortcut(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    unregister_all(app)?;
    register_toggle_shortcut(app, &config.shortcut_toggle)
}

pub fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_paste_strip(app, &window);
        }
    }
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        show_paste_strip(app, &window);
    }
}

/// 与官方 Paste 一致：在鼠标所在显示器底部显示横条，并记录呼出前的前台应用
fn show_paste_strip(app: &AppHandle, window: &WebviewWindow) {
    position_bottom_center(app, window);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("panel-shown", ());
}

/// 在含菜单栏的主屏底部居中。坐标全部用 logical 像素，
/// 避免 macOS 上物理/逻辑像素换算混乱。
fn position_bottom_center(app: &AppHandle, window: &WebviewWindow) {
    use tauri::{LogicalPosition, Position};

    let monitor = window
        .available_monitors()
        .ok()
        .and_then(|list| {
            list.into_iter()
                .find(|m| m.position().x == 0 && m.position().y == 0)
        })
        .or_else(|| window.primary_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());

    let Some(monitor) = monitor else {
        let _ = window.center();
        return;
    };

    let scale = monitor.scale_factor();
    // monitor.size() / position() 是物理像素，转 logical
    let screen_w_log = monitor.size().width as f64 / scale;
    let screen_h_log = monitor.size().height as f64 / scale;
    let origin_x_log = monitor.position().x as f64 / scale;
    let origin_y_log = monitor.position().y as f64 / scale;

    // conf.json 中尺寸 = 900x420 (logical)
    let win_w = 900.0;
    let win_h = 420.0;
    let margin = 48.0;

    let x = origin_x_log + (screen_w_log - win_w) / 2.0;
    let y = origin_y_log + screen_h_log - win_h - margin;

    let _ = window.set_position(Position::Logical(LogicalPosition::new(x, y)));
}

