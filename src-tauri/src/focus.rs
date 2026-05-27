use once_cell::sync::Lazy;
use parking_lot::Mutex;
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

#[cfg(target_os = "macos")]
pub fn accessibility_trusted() -> bool {
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe { AXIsProcessTrusted() }
}

#[cfg(not(target_os = "macos"))]
pub fn accessibility_trusted() -> bool {
    true
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
    if !accessibility_trusted() {
        return Err(
            "未获得辅助功能权限。请在 系统设置 → 隐私与安全性 → 辅助功能 中勾选本应用，然后完全退出再重新打开。".into(),
        );
    }

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
    accessibility_trusted()
}

#[tauri::command]
pub fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
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
