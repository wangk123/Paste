use crate::config::AppConfig;
use crate::focus::capture_focus_target;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

static FOCUS_WATCH_ACTIVE: AtomicBool = AtomicBool::new(false);

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
            hide_main_window(app);
        } else {
            show_paste_strip(app, &window);
        }
    }
}

pub fn hide_main_window(app: &AppHandle) {
    FOCUS_WATCH_ACTIVE.store(false, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        show_paste_strip(app, &window);
    }
}

pub fn show_settings_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("settings") else {
        return;
    };
    position_window_on_cursor_monitor(&window, 480.0, 560.0, true);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn hide_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.hide();
    }
}

fn show_paste_strip(app: &AppHandle, window: &WebviewWindow) {
    capture_focus_target();
    position_window_on_cursor_monitor(window, 900.0, 420.0, false);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("panel-shown", ());
    start_focus_watch(app.clone(), window.clone());
}

fn start_focus_watch(app: AppHandle, window: WebviewWindow) {
    FOCUS_WATCH_ACTIVE.store(true, Ordering::SeqCst);
    std::thread::spawn(move || {
        while FOCUS_WATCH_ACTIVE.load(Ordering::SeqCst) {
            if !window.is_visible().unwrap_or(false) {
                FOCUS_WATCH_ACTIVE.store(false, Ordering::SeqCst);
                break;
            }
            if !window.is_focused().unwrap_or(true) {
                let h = app.clone();
                let _ = app.run_on_main_thread(move || hide_main_window(&h));
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}

fn monitor_at_cursor(window: &WebviewWindow) -> Option<tauri::Monitor> {
    let cursor = window.cursor_position().ok()?;
    window
        .available_monitors()
        .ok()?
        .into_iter()
        .find(|m| {
            let pos = m.position();
            let size = m.size();
            let x = cursor.x;
            let y = cursor.y;
            x >= pos.x as f64
                && y >= pos.y as f64
                && x < (pos.x + size.width as i32) as f64
                && y < (pos.y + size.height as i32) as f64
        })
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten())
}

fn position_window_on_cursor_monitor(
    window: &WebviewWindow,
    win_w: f64,
    win_h: f64,
    center: bool,
) {
    use tauri::{LogicalPosition, Position};

    let monitor = monitor_at_cursor(window);

    let Some(monitor) = monitor else {
        let _ = window.center();
        return;
    };

    let scale = monitor.scale_factor();
    let screen_w_log = monitor.size().width as f64 / scale;
    let screen_h_log = monitor.size().height as f64 / scale;
    let origin_x_log = monitor.position().x as f64 / scale;
    let origin_y_log = monitor.position().y as f64 / scale;

    let (x, y) = if center {
        (
            origin_x_log + (screen_w_log - win_w) / 2.0,
            origin_y_log + (screen_h_log - win_h) / 2.0,
        )
    } else {
        let margin = 48.0;
        (
            origin_x_log + (screen_w_log - win_w) / 2.0,
            origin_y_log + screen_h_log - win_h - margin,
        )
    };

    let _ = window.set_position(Position::Logical(LogicalPosition::new(x, y)));
}

pub fn setup_main_window_events(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(false) = event {
            hide_main_window(&app_handle);
        }
    });
}
