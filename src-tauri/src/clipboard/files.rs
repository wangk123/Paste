use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileClipPayload {
    pub paths: Vec<String>,
}

pub fn encode_file_paths(paths: &[String]) -> String {
    serde_json::to_string(&FileClipPayload {
        paths: paths.to_vec(),
    })
    .unwrap_or_default()
}

pub fn decode_file_paths(content: &str) -> Vec<String> {
    if let Ok(payload) = serde_json::from_str::<FileClipPayload>(content) {
        if !payload.paths.is_empty() {
            return payload.paths;
        }
    }

    content
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(String::from)
        .collect()
}

pub fn file_preview(paths: &[String]) -> String {
    if paths.is_empty() {
        return "[文件]".into();
    }
    if paths.len() == 1 {
        return std::path::Path::new(&paths[0])
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| paths[0].clone());
    }
    let name = std::path::Path::new(&paths[0])
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| paths[0].clone());
    format!("{name} 等 {} 个文件", paths.len())
}
