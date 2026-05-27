mod clipboard;
mod commands;
mod config;
mod focus;
mod shortcuts;
mod storage;

use config::{ensure_dirs, load_config, AppConfig};
use parking_lot::Mutex;
use shortcuts::manager::{register_toggle_shortcut, toggle_main_window};
use std::sync::Arc;
use storage::cleanup::start_cleanup_task;
use storage::db::Db;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter,
};

pub struct AppState {
    pub db: Arc<Db>,
    pub config: Mutex<AppConfig>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = ensure_dirs();
    let config = load_config();
    let db = Arc::new(Db::new().expect("failed to init database"));
    let config_clone = config.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .manage(AppState {
            db: db.clone(),
            config: Mutex::new(config),
        })
        .setup(move |app| {
            let handle = app.handle().clone();

            let shortcut_handle = handle.clone();
            let shortcut_cfg = config_clone.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Err(err) =
                    register_toggle_shortcut(&shortcut_handle, &shortcut_cfg.shortcut_toggle)
                {
                    eprintln!("shortcut register failed: {err}");
                }
            });

            let show_i = MenuItem::with_id(app, "show", "显示剪贴板", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &settings_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => shortcuts::manager::show_main_window(app),
                    "settings" => {
                        shortcuts::manager::show_main_window(app);
                        let _ = app.emit("open-settings", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            let db_cleanup = db.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(10));
                start_cleanup_task(db_cleanup);
            });
            clipboard::watcher::start_watcher(handle.clone(), db.clone());

            // 仅供故障排查：PASTE_AUTO_SHOW=1 时启动 3 秒后自动呼出面板
            if std::env::var("PASTE_AUTO_SHOW").ok().as_deref() == Some("1") {
                let h = handle.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let h2 = h.clone();
                    let _ = h.run_on_main_thread(move || {
                        shortcuts::manager::show_main_window(&h2);
                    });
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_clips,
            commands::search_clips,
            commands::get_clip,
            commands::delete_clip,
            commands::pin_clip,
            commands::set_clip_category,
            commands::list_categories,
            commands::upsert_category,
            commands::delete_category,
            commands::get_settings,
            commands::update_settings,
            commands::update_shortcut,
            commands::paste_clip,
            commands::paste_clip_plain,
            commands::copy_clip,
            commands::hide_window,
            commands::show_window,
            commands::run_cleanup,
            commands::get_stats,
            commands::read_image_base64,
            focus::open_accessibility_settings,
            focus::is_accessibility_granted,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
