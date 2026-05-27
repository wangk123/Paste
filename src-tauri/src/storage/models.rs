use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: String,
    #[serde(rename = "type")]
    pub clip_type: String,
    pub content: String,
    pub preview: String,
    pub hash: String,
    pub size: i64,
    pub category_id: Option<String>,
    pub pinned: bool,
    pub language: Option<String>,
    pub source_app: Option<String>,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListClipsParams {
    pub offset: u32,
    pub limit: u32,
    pub category_id: Option<String>,
    pub clip_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchClipsParams {
    pub query: String,
    pub offset: u32,
    pub limit: u32,
}
