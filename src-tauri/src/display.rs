use once_cell::sync::Lazy;
use parking_lot::Mutex;
use tauri::{AppHandle, Monitor, Position, WebviewWindow};

static POINTER_PHYSICAL: Lazy<Mutex<Option<(f64, f64)>>> = Lazy::new(|| Mutex::new(None));

/// 在唤起面板前记录指针位置（隐藏窗口下 `cursor_position` 不可靠）。
pub fn capture_pointer_location() {
    *POINTER_PHYSICAL.lock() = global_pointer_physical();
}

pub fn monitor_at_pointer(app: &AppHandle) -> Option<Monitor> {
    let pos = POINTER_PHYSICAL
        .lock()
        .clone()
        .or_else(global_pointer_physical)?;
    monitor_containing_point(app, pos.0, pos.1)
}

pub fn position_on_monitor(
    window: &WebviewWindow,
    monitor: &Monitor,
    win_w: f64,
    win_h: f64,
    bottom_strip: bool,
    bottom_margin: f64,
) {
    use tauri::LogicalPosition;

    let scale = monitor.scale_factor();
    let screen_w = monitor.size().width as f64 / scale;
    let screen_h = monitor.size().height as f64 / scale;
    let origin_x = monitor.position().x as f64 / scale;
    let origin_y = monitor.position().y as f64 / scale;

    let x = origin_x + (screen_w - win_w) / 2.0;
    let y = if bottom_strip {
        origin_y + screen_h - win_h - bottom_margin
    } else {
        origin_y + (screen_h - win_h) / 2.0
    };

    let _ = window.set_position(Position::Logical(LogicalPosition::new(x, y)));
}

fn monitor_containing_point(app: &AppHandle, x: f64, y: f64) -> Option<Monitor> {
    app.available_monitors()
        .ok()?
        .into_iter()
        .find(|m| point_in_monitor(m, x, y))
}

fn point_in_monitor(monitor: &Monitor, x: f64, y: f64) -> bool {
    let pos = monitor.position();
    let size = monitor.size();
    let left = pos.x as f64;
    let top = pos.y as f64;
    let right = left + size.width as f64;
    let bottom = top + size.height as f64;
    x >= left && y >= top && x < right && y < bottom
}

fn global_pointer_physical() -> Option<(f64, f64)> {
    #[cfg(target_os = "macos")]
    {
        return macos_pointer_physical();
    }
    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

#[cfg(target_os = "macos")]
fn macos_pointer_physical() -> Option<(f64, f64)> {
    use core_graphics::event::CGEvent;
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok()?;
    let event = CGEvent::new(source).ok()?;
    let loc = event.location();
    Some((loc.x, loc.y))
}

pub fn logical_screen_size(monitor: &Monitor) -> (f64, f64) {
    let scale = monitor.scale_factor();
    (
        monitor.size().width as f64 / scale,
        monitor.size().height as f64 / scale,
    )
}
