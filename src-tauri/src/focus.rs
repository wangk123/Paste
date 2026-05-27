use std::process::Command;
use std::time::Duration;

pub fn capture_focus_target() {}

pub fn restore_focus_and_paste(plain: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos_restore_focus_and_paste(plain);
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
fn macos_restore_focus_and_paste(plain: bool) -> Result<(), String> {
    if !accessibility_trusted() {
        return Err(
            "未获得辅助功能权限。请在 系统设置 → 隐私与安全性 → 辅助功能 中勾选本应用，然后完全退出再重新打开。".into(),
        );
    }

    std::thread::sleep(Duration::from_millis(120));
    if let Err(e) = macos_post_cmd_v(plain) {
        eprintln!("[paste] CGEvent 注入失败: {e}，回退 enigo");
        return crate::clipboard::watcher::simulate_paste_enigo(plain);
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn macos_post_cmd_v(plain: bool) -> Result<(), String> {
    use core_graphics::event::{
        CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode,
    };
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
