use crate::config::AppConfig;
use crate::display::{capture_pointer_location, monitor_at_pointer, position_on_monitor};
use crate::focus::capture_focus_target;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Size, WebviewWindow};

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

static FOCUS_WATCH_ACTIVE: AtomicBool = AtomicBool::new(false);

const STRIP_SIDE_MARGIN: f64 = 20.0;
const STRIP_BOTTOM_MARGIN: f64 = 20.0;
const STRIP_MIN_WIDTH: f64 = 640.0;
/// 卡片 320 + 列表上下留白
const STRIP_LIST_AREA_H: f64 = 348.0;
/// 拖拽条 + 顶栏 + 筛选 + 底栏
const STRIP_CHROME_H: f64 = 152.0;

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
    if settings_is_visible(app) {
        hide_settings_window(app);
    }
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
    if settings_is_visible(app) {
        hide_settings_window(app);
    }
    if let Some(window) = app.get_webview_window("main") {
        show_paste_strip(app, &window);
    }
}

fn settings_is_visible(app: &AppHandle) -> bool {
    app.get_webview_window("settings")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

pub fn show_settings_window(app: &AppHandle) {
    hide_main_window(app);

    let Some(window) = app.get_webview_window("settings") else {
        return;
    };

    let _ = window.hide();

    #[cfg(target_os = "macos")]
    macos_activate_app();

    capture_pointer_location();
    let monitor = monitor_at_pointer(app);
    if let Some(ref m) = monitor {
        position_on_monitor(&window, m, 480.0, 560.0, false, 0.0);
    } else {
        let _ = window.center();
    }
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();

    let window_retry = window.clone();
    let app_retry = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(80));
        let _ = app_retry.run_on_main_thread(move || {
            let _ = window_retry.show();
            let _ = window_retry.set_focus();
        });
    });

    let _ = app.emit("settings-shown", ());
}

#[cfg(target_os = "macos")]
fn macos_activate_app() {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSApplication;

    if let Some(mtm) = MainThreadMarker::new() {
        NSApplication::sharedApplication(mtm).activate();
    }
}

pub fn hide_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.hide();
    }
}

fn show_paste_strip(app: &AppHandle, window: &WebviewWindow) {
    capture_pointer_location();
    capture_focus_target();
    let monitor = monitor_at_pointer(app);
    let (win_w, win_h) = paste_strip_logical_size(monitor.as_ref());
    let size = Size::Logical(LogicalSize::new(win_w, win_h));
    let _ = window.set_resizable(false);
    let _ = window.set_min_size(Some(size));
    let _ = window.set_max_size(Some(size));
    let _ = window.set_size(size);
    if let Some(ref m) = monitor {
        position_on_monitor(window, m, win_w, win_h, true, STRIP_BOTTOM_MARGIN);
    } else {
        let _ = window.center();
    }
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("panel-shown", ());
    start_focus_watch(app.clone(), window.clone());
}

fn paste_strip_logical_size(monitor: Option<&tauri::Monitor>) -> (f64, f64) {
    let ideal_h = STRIP_LIST_AREA_H + STRIP_CHROME_H;

    let Some(monitor) = monitor else {
        return (1200.0, ideal_h);
    };

    let (screen_w, screen_h) = crate::display::logical_screen_size(monitor);

    let win_w = (screen_w - STRIP_SIDE_MARGIN * 2.0).max(STRIP_MIN_WIDTH);
    let max_h = (screen_h - STRIP_BOTTOM_MARGIN - 24.0).max(400.0);
    let win_h = ideal_h.min(max_h);

    (win_w, win_h)
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
                if crate::preview_window::preview_is_visible(&app) {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    continue;
                }
                let h = app.clone();
                let _ = app.run_on_main_thread(move || hide_main_window(&h));
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}

pub fn setup_main_window_events(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(false) = event {
            if settings_is_visible(&app_handle) {
                return;
            }
            if crate::preview_window::preview_is_visible(&app_handle) {
                return;
            }
            hide_main_window(&app_handle);
        }
    });
}

pub fn setup_settings_window_events(app: &AppHandle) {
    let Some(window) = app.get_webview_window("settings") else {
        return;
    };
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            hide_settings_window(&app_handle);
        }
    });
}
