use crate::clipboard::hash::{hash_bytes, hash_text};
use crate::config::{load_config, AppConfig};
use crate::storage::db::{detect_clip_type, preview_text, save_image_with_thumbnail, Db};
use crate::storage::models::Clip;
use arboard::{Clipboard, ImageData};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use uuid::Uuid;

static WATCHING: AtomicBool = AtomicBool::new(false);
static IGNORE_NEXT: AtomicBool = AtomicBool::new(false);

pub fn set_ignore_next(value: bool) {
    IGNORE_NEXT.store(value, Ordering::SeqCst);
}

pub fn start_watcher(_app: AppHandle, db: Arc<Db>) {
    if WATCHING.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(3));

        let Ok(mut clipboard) = Clipboard::new() else {
            return;
        };

        let config = load_config();
        let mut last_hash = String::new();
        let mut tick: u32 = 0;

        loop {
            tick = tick.wrapping_add(1);

            if IGNORE_NEXT.swap(false, Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(400));
                continue;
            }

            let try_image = tick % 12 == 0;

            if let Ok(Some(clip)) = read_clipboard(&mut clipboard, &config, try_image) {
                if clip.hash != last_hash {
                    last_hash = clip.hash.clone();
                    let _ = db.insert_clip(&clip);
                }
            }

            std::thread::sleep(Duration::from_millis(1000));
        }
    });
}

fn read_clipboard(
    clipboard: &mut Clipboard,
    config: &AppConfig,
    try_image: bool,
) -> Result<Option<Clip>, String> {
    if let Ok(text) = clipboard.get_text() {
        if !text.trim().is_empty() {
            return process_text(&text, config);
        }
    }

    if try_image {
        if let Ok(img) = clipboard.get_image() {
            return process_image(&img, config);
        }
    }

    Ok(None)
}

fn process_image(img: &ImageData, config: &AppConfig) -> Result<Option<Clip>, String> {
    let w = img.width as u32;
    let h = img.height as u32;
    let rgba = img.bytes.to_vec();
    let hash = hash_bytes(&rgba);

    let rgba_img =
        image::RgbaImage::from_raw(w, h, rgba.clone()).ok_or("invalid image data".to_string())?;
    let dynamic = image::DynamicImage::ImageRgba8(rgba_img);
    let mut png_bytes = Vec::new();
    dynamic
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| e.to_string())?;

    let (original_path, thumb_path) = save_image_with_thumbnail(&png_bytes)?;

    let now = chrono::Utc::now().timestamp();
    Ok(Some(Clip {
        id: Uuid::new_v4().to_string(),
        clip_type: "image".into(),
        content: original_path,
        preview: "[图片]".into(),
        hash,
        size: rgba.len() as i64,
        category_id: None,
        pinned: false,
        language: None,
        source_app: None,
        created_at: now,
        expires_at: config.expiry_timestamp(),
        thumbnail_path: Some(thumb_path),
    }))
}

fn process_text(text: &str, config: &AppConfig) -> Result<Option<Clip>, String> {
    let bytes = text.as_bytes();
    if bytes.len() as u64 > config.max_text_bytes {
        return Ok(None);
    }

    let hash = hash_text(text);
    let (clip_type, language) = detect_clip_type(text);
    let preview = preview_text(text, 200);
    let now = chrono::Utc::now().timestamp();

    Ok(Some(Clip {
        id: Uuid::new_v4().to_string(),
        clip_type,
        content: text.to_string(),
        preview,
        hash,
        size: bytes.len() as i64,
        category_id: None,
        pinned: false,
        language,
        source_app: None,
        created_at: now,
        expires_at: config.expiry_timestamp(),
        thumbnail_path: None,
    }))
}

pub fn write_clipboard(clip: &Clip) -> Result<(), String> {
    set_ignore_next(true);
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

    match clip.clip_type.as_str() {
        "image" => {
            let data = std::fs::read(&clip.content).map_err(|e| e.to_string())?;
            let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
            let rgba = img.to_rgba8();
            let (w, h) = rgba.dimensions();
            let image_data = ImageData {
                width: w as usize,
                height: h as usize,
                bytes: rgba.into_raw().into(),
            };
            clipboard
                .set_image(image_data)
                .map_err(|e| e.to_string())?;
        }
        _ => {
            clipboard
                .set_text(clip.content.clone())
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn simulate_paste_enigo(plain: bool) -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};
    let settings = Settings {
        open_prompt_to_get_permissions: false,
        ..Settings::default()
    };
    let mut enigo = Enigo::new(&settings).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        if plain {
            enigo
                .key(Key::Meta, Direction::Press)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Shift, Direction::Press)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Unicode('v'), Direction::Click)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Shift, Direction::Release)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Meta, Direction::Release)
                .map_err(|e| e.to_string())?;
        } else {
            enigo
                .key(Key::Meta, Direction::Press)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Unicode('v'), Direction::Click)
                .map_err(|e| e.to_string())?;
            enigo
                .key(Key::Meta, Direction::Release)
                .map_err(|e| e.to_string())?;
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = plain;
        enigo
            .key(Key::Control, Direction::Press)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
