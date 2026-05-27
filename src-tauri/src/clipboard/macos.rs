use std::path::{Path, PathBuf};
use std::process::Command;

pub fn read_file_paths() -> Vec<String> {
    read_file_paths_native()
}

pub fn write_file_paths(paths: &[String]) -> Result<(), String> {
    if paths.is_empty() {
        return Err("没有可粘贴的文件".into());
    }
    write_file_paths_native(paths)
}

/// 中文 OCR 使用 Tesseract + chi_sim（Vision .fast 不支持中文，.accurate 需联网下载模型）
pub fn run_ocr(image_path: &str, resource_dir: Option<&Path>) -> Result<String, String> {
    run_tesseract_ocr(image_path, resource_dir)
}

fn run_tesseract_ocr(image_path: &str, resource_dir: Option<&Path>) -> Result<String, String> {
    let tessdata = resolve_tessdata_dir(resource_dir);
    let chi = tessdata.join("chi_sim.traineddata");
    if !chi.exists() {
        return Err("缺少中文 OCR 语言包，请重新编译应用".into());
    }

    let tesseract = resolve_tesseract_bin(resource_dir);
    let output = Command::new(&tesseract)
        .env("TESSDATA_PREFIX", &tessdata)
        .arg(image_path)
        .arg("stdout")
        .arg("-l")
        .arg("chi_sim")
        .output()
        .map_err(|e| {
            if tesseract.as_os_str() == "tesseract" {
                format!("未找到 tesseract，请执行: brew install tesseract ({e})")
            } else {
                format!("无法启动 OCR: {e}")
            }
        })?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() {
            return Ok("未识别到文字".into());
        }
        return Ok(text);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(if stderr.is_empty() {
        "OCR 识别失败".into()
    } else {
        stderr
    })
}

fn resolve_tessdata_dir(resource_dir: Option<&Path>) -> PathBuf {
    if let Some(r) = resource_dir {
        let d = r.join("tessdata");
        if d.join("chi_sim.traineddata").exists() {
            return d;
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/tessdata")
}

fn resolve_tesseract_bin(resource_dir: Option<&Path>) -> PathBuf {
    if let Some(r) = resource_dir {
        let bundled = r.join("bin/tesseract");
        if bundled.exists() {
            return bundled;
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/bin/tesseract");
    if dev.exists() {
        return dev;
    }
    for p in ["/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"] {
        let path = PathBuf::from(p);
        if path.exists() {
            return path;
        }
    }
    PathBuf::from("tesseract")
}

#[cfg(target_os = "macos")]
fn read_file_paths_native() -> Vec<String> {
    use objc2::ClassType;
    use objc2_app_kit::NSPasteboard;
    use objc2_foundation::{NSArray, NSURL};

    let pb = NSPasteboard::generalPasteboard();
    let classes = NSArray::from_slice(&[NSURL::class()]);

    if !unsafe { pb.canReadObjectForClasses_options(&classes, None) } {
        return vec![];
    }

    let objects = unsafe { pb.readObjectsForClasses_options(&classes, None) };
    let Some(objects) = objects else {
        return vec![];
    };

    let mut out = Vec::new();
    let count = objects.count();
    for i in 0..count {
        let obj = objects.objectAtIndex(i);
        if let Ok(url) = obj.downcast::<NSURL>() {
            if !url.isFileURL() {
                continue;
            }
            if let Some(path) = url.path() {
                let s = path.to_string();
                if !s.is_empty() && std::path::Path::new(&s).exists() {
                    out.push(s);
                }
            }
        }
    }
    out
}

#[cfg(target_os = "macos")]
fn write_file_paths_native(paths: &[String]) -> Result<(), String> {
    use objc2::rc::Retained;
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::{NSPasteboard, NSPasteboardWriting};
    use objc2_foundation::{NSArray, NSString, NSURL};

    let pb = NSPasteboard::generalPasteboard();
    pb.clearContents();

    let mut items: Vec<Retained<ProtocolObject<dyn NSPasteboardWriting>>> = Vec::new();
    for p in paths {
        let ns_path = NSString::from_str(p);
        let url = NSURL::fileURLWithPath(&ns_path);
        items.push(ProtocolObject::from_retained(url));
    }

    let array = NSArray::from_retained_slice(&items);
    if pb.writeObjects(&array) {
        Ok(())
    } else {
        Err("写入文件到剪贴板失败".into())
    }
}

#[cfg(not(target_os = "macos"))]
fn read_file_paths_native() -> Vec<String> {
    vec![]
}

#[cfg(not(target_os = "macos"))]
fn write_file_paths_native(_paths: &[String]) -> Result<(), String> {
    Err("当前系统不支持文件剪贴板".into())
}
