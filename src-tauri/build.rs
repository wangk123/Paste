use std::path::Path;
use std::process::Command;

fn main() {
    #[cfg(target_os = "macos")]
    prepare_ocr_resources();
    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn prepare_ocr_resources() {
    let tessdata = Path::new("resources/tessdata");
    std::fs::create_dir_all(tessdata).ok();

    let chi = tessdata.join("chi_sim.traineddata");
    if !chi.exists() {
        let _ = Command::new("curl")
            .args([
                "-fsSL",
                "-o",
                chi.to_str().unwrap(),
                "https://github.com/tesseract-ocr/tessdata_fast/raw/main/chi_sim.traineddata",
            ])
            .status();
    }

    let bin_dir = Path::new("resources/bin");
    std::fs::create_dir_all(bin_dir).ok();
    let dest = bin_dir.join("tesseract");
    if !dest.exists() {
        for src in ["/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"] {
            if Path::new(src).exists() {
                let _ = std::fs::copy(src, &dest);
                break;
            }
        }
    }

    println!("cargo:rerun-if-changed=resources/tessdata");
    println!("cargo:rerun-if-changed=resources/bin");
}
