use crate::display::{capture_pointer_location, monitor_at_pointer, position_on_monitor};
use image::GenericImageView;
use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Size};

const PREVIEW_LABEL: &str = "preview";
const SCREEN_MARGIN: f64 = 40.0;
const TITLE_BAR_ESTIMATE: f64 = 28.0;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewShowPayload {
    pub clip_id: String,
    pub image_path: String,
    pub display_width: u32,
    pub display_height: u32,
    pub intrinsic_width: u32,
    pub intrinsic_height: u32,
}

pub fn preview_is_visible(app: &AppHandle) -> bool {
    app.get_webview_window(PREVIEW_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

pub fn open_image_preview(app: &AppHandle, clip_id: &str, image_path: &str) -> Result<(), String> {
    capture_pointer_location();
    let monitor = monitor_at_pointer(app);

    let (img_w, img_h) = image_dimensions(image_path)?;
    let window = app
        .get_webview_window(PREVIEW_LABEL)
        .ok_or_else(|| "preview window not found".to_string())?;

    let (inner_w, inner_h, display_w, display_h) =
        fit_preview_inner_size(monitor.as_ref(), img_w, img_h)?;

    let payload = PreviewShowPayload {
        clip_id: clip_id.to_string(),
        image_path: image_path.to_string(),
        display_width: display_w,
        display_height: display_h,
        intrinsic_width: img_w,
        intrinsic_height: img_h,
    };

    if let Some(ref m) = monitor {
        position_on_monitor(&window, m, inner_w, inner_h + TITLE_BAR_ESTIMATE, false, 0.0);
    } else {
        let _ = window.center();
    }
    window
        .set_size(Size::Logical(LogicalSize::new(inner_w, inner_h)))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    window
        .emit("preview-show", payload)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn close_image_preview(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PREVIEW_LABEL) {
        let _ = window.hide();
    }
    let _ = app.emit_to("main", "preview-closed", ());
    Ok(())
}

pub fn setup_preview_window_events(app: &AppHandle) {
    let Some(window) = app.get_webview_window(PREVIEW_LABEL) else {
        return;
    };
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = close_image_preview(&app_handle);
        }
    });
}

fn image_dimensions(path: &str) -> Result<(u32, u32), String> {
    let img = image::open(path).map_err(|e| e.to_string())?;
    Ok(img.dimensions())
}

fn fit_preview_inner_size(
    monitor: Option<&tauri::Monitor>,
    img_w: u32,
    img_h: u32,
) -> Result<(f64, f64, u32, u32), String> {
    let (max_w, max_h) = max_content_size(monitor)?;

    let mut cw = img_w as f64;
    let mut ch = img_h as f64;

    if cw > max_w || ch > max_h {
        let scale = (max_w / cw).min(max_h / ch);
        cw *= scale;
        ch *= scale;
    }

    let inner_w = cw.max(120.0);
    let inner_h = ch.max(80.0);

    Ok((
        inner_w,
        inner_h,
        inner_w.round() as u32,
        inner_h.round() as u32,
    ))
}

fn max_content_size(monitor: Option<&tauri::Monitor>) -> Result<(f64, f64), String> {
    let monitor = monitor.ok_or_else(|| "no monitor".to_string())?;
    let (screen_w, screen_h) = crate::display::logical_screen_size(monitor);
    Ok((
        screen_w - SCREEN_MARGIN,
        screen_h - SCREEN_MARGIN - TITLE_BAR_ESTIMATE,
    ))
}
