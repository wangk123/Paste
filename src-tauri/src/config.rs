use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub history_days: u32,
    pub max_items: u32,
    pub max_text_bytes: u64,
    pub launch_at_login: bool,
    pub shortcut_toggle: String,
    pub theme: String,
    pub accent_color: String,
    pub window_position: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            history_days: 30,
            max_items: 5000,
            max_text_bytes: 10 * 1024 * 1024,
            launch_at_login: false,
            shortcut_toggle: default_toggle_shortcut(),
            theme: "system".into(),
            accent_color: "#6366f1".into(),
            window_position: "bottom".into(),
        }
    }
}

fn default_toggle_shortcut() -> String {
    #[cfg(target_os = "macos")]
    {
        "Shift+Command+V".into()
    }
    #[cfg(not(target_os = "macos"))]
    {
        "Control+Shift+V".into()
    }
}

pub fn app_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.paste.app")
}

pub fn config_path() -> PathBuf {
    app_data_dir().join("config.json")
}

pub fn db_path() -> PathBuf {
    app_data_dir().join("clipboard.db")
}

pub fn images_dir() -> PathBuf {
    app_data_dir().join("images")
}

pub fn ensure_dirs() -> std::io::Result<()> {
    fs::create_dir_all(app_data_dir())?;
    fs::create_dir_all(images_dir())?;
    Ok(())
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(mut cfg) = serde_json::from_str::<AppConfig>(&data) {
                #[cfg(target_os = "macos")]
                if cfg.shortcut_toggle.contains("CommandOrControl") {
                    cfg.shortcut_toggle = cfg.shortcut_toggle.replace("CommandOrControl", "Command");
                }
                return cfg;
            }
        }
    }
    AppConfig::default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    ensure_dirs().map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(config_path(), data).map_err(|e| e.to_string())
}

impl AppConfig {
    pub fn expiry_timestamp(&self) -> Option<i64> {
        if self.history_days == 0 {
            return None;
        }
        let now = chrono::Utc::now().timestamp();
        Some(now + (self.history_days as i64) * 86400)
    }
}
