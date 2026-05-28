use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

static FOCUS_PID: Lazy<Mutex<Option<i32>>> = Lazy::new(|| Mutex::new(None));

pub fn capture_focus_target() {
    #[cfg(target_os = "macos")]
    {
        if let Some(pid) = macos_frontmost_pid() {
            let my = std::process::id() as i32;
            if pid != my {
                *FOCUS_PID.lock() = Some(pid);
            }
        }
        return;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = ();
    }
}

pub fn activate_focus_target() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let pid = *FOCUS_PID.lock();
        if let Some(pid) = pid {
            return macos_activate_pid(pid);
        }
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    Ok(())
}

pub fn restore_focus_and_paste(plain: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos_post_paste(plain);
    }

    #[cfg(target_os = "windows")]
    {
        std::thread::sleep(Duration::from_millis(120));
        return crate::clipboard::watcher::simulate_paste_enigo(plain);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = plain;
        Err("unsupported platform".into())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityInfo {
    pub granted: bool,
    pub executable_path: String,
    pub bundle_id: String,
    pub signing_id: String,
    pub signing_stable: bool,
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
    fn CGPreflightPostEventAccess() -> bool;
    fn CGRequestPostEventAccess() -> bool;
}

#[cfg(target_os = "macos")]
pub fn accessibility_effective() -> bool {
    unsafe {
        if AXIsProcessTrustedWithOptions(std::ptr::null()) {
            return true;
        }
        CGPreflightPostEventAccess()
    }
}

#[cfg(not(target_os = "macos"))]
pub fn accessibility_effective() -> bool {
    true
}

#[cfg(target_os = "macos")]
pub fn request_accessibility_prompt() -> bool {
    use core_foundation::base::TCFType;
    use core_foundation::boolean::CFBoolean;
    use core_foundation::dictionary::CFDictionary;
    use core_foundation::string::CFString;
    use std::ffi::c_void;

    unsafe {
        if AXIsProcessTrustedWithOptions(std::ptr::null()) {
            return true;
        }

        let key = CFString::new("AXTrustedCheckOptionPrompt");
        let value = CFBoolean::true_value();
        let options = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);
        if AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef() as *const c_void) {
            return true;
        }

        CGRequestPostEventAccess();
        AXIsProcessTrustedWithOptions(std::ptr::null()) || CGPreflightPostEventAccess()
    }
}

#[cfg(not(target_os = "macos"))]
pub fn request_accessibility_prompt() -> bool {
    true
}

#[cfg(target_os = "macos")]
fn codesign_details(path: &Path) -> (String, Option<String>) {
    let output = Command::new("codesign")
        .arg("-dv")
        .arg(path)
        .output()
        .ok();
    let Some(output) = output else {
        return ("unknown".into(), None);
    };
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let mut identifier = "unknown".to_string();
    let mut team = None;
    for line in text.lines() {
        if let Some(v) = line.strip_prefix("Identifier=") {
            identifier = v.trim().to_string();
        }
        if let Some(v) = line.strip_prefix("TeamIdentifier=") {
            let t = v.trim();
            if !t.is_empty() && t != "not set" {
                team = Some(t.to_string());
            }
        }
    }
    (identifier, team)
}

#[cfg(not(target_os = "macos"))]
fn codesign_details(_path: &Path) -> (String, Option<String>) {
    ("unknown".into(), None)
}

#[cfg(target_os = "macos")]
fn macos_frontmost_pid() -> Option<i32> {
    let out = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to return unix id of first application process whose frontmost is true")
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    String::from_utf8_lossy(&out.stdout).trim().parse().ok()
}

#[cfg(target_os = "macos")]
fn macos_activate_pid(pid: i32) -> Result<(), String> {
    let script = format!(
        "tell application \"System Events\" to set frontmost of first application process whose unix id is {pid} to true"
    );
    let out = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[cfg(target_os = "macos")]
fn macos_post_paste(plain: bool) -> Result<(), String> {
    if let Err(e) = macos_post_cmd_v(plain) {
        eprintln!("[paste] CGEvent 注入失败: {e}，回退 enigo");
        return crate::clipboard::watcher::simulate_paste_enigo(plain);
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn macos_post_cmd_v(plain: bool) -> Result<(), String> {
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    const KEY_V: CGKeyCode = 9;

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "create event source failed".to_string())?;

    let mut flags = CGEventFlags::CGEventFlagCommand;
    if plain {
        flags |= CGEventFlags::CGEventFlagShift;
    }

    let key_down = CGEvent::new_keyboard_event(source.clone(), KEY_V, true)
        .map_err(|_| "create keydown failed".to_string())?;
    key_down.set_flags(flags);
    key_down.post(CGEventTapLocation::HID);

    std::thread::sleep(Duration::from_millis(20));

    let key_up = CGEvent::new_keyboard_event(source, KEY_V, false)
        .map_err(|_| "create keyup failed".to_string())?;
    key_up.set_flags(flags);
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}

#[tauri::command]
pub fn is_accessibility_granted() -> bool {
    accessibility_effective()
}

#[tauri::command]
pub fn request_accessibility() -> bool {
    request_accessibility_prompt()
}

#[tauri::command]
pub fn get_accessibility_info(app: tauri::AppHandle) -> AccessibilityInfo {
    let bundle_id = app.config().identifier.clone();
    let executable_path = std::env::current_exe()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| "unknown".into());
    let (signing_id, team_id) = std::env::current_exe()
        .ok()
        .map(|p| codesign_details(&p))
        .unwrap_or_else(|| ("unknown".into(), None));
    let signing_stable = team_id.is_some() || signing_id == bundle_id;

    AccessibilityInfo {
        granted: accessibility_effective(),
        executable_path,
        bundle_id,
        signing_id,
        signing_stable,
    }
}

#[tauri::command]
pub fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        request_accessibility_prompt();
        let _ = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}
