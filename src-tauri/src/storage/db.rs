use crate::config::{db_path, ensure_dirs, images_dir, AppConfig};
use crate::storage::models::{Category, Clip, Group, ListClipsParams, SearchClipsParams};
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::sync::Mutex;

const CLIP_SELECT: &str = "SELECT c.id, c.type, c.content, c.preview, c.hash, c.size, c.category_id, c.language, c.source_app, c.created_at, c.expires_at, c.thumbnail_path, c.group_id, g.name FROM clips c LEFT JOIN groups g ON c.group_id = g.id";

const MIGRATED_PINNED_GROUP_ID: &str = "migrated-pinned";

pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn new() -> Result<Self, String> {
        ensure_dirs().map_err(|e| e.to_string())?;
        let conn = Connection::open(db_path()).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA foreign_keys=ON;

            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#6366f1',
                icon TEXT NOT NULL DEFAULT 'folder',
                sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS clips (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                preview TEXT NOT NULL DEFAULT '',
                hash TEXT NOT NULL,
                size INTEGER NOT NULL DEFAULT 0,
                category_id TEXT,
                group_id TEXT,
                language TEXT,
                source_app TEXT,
                created_at INTEGER NOT NULL,
                expires_at INTEGER,
                thumbnail_path TEXT,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_clips_category ON clips(category_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_clips_expires ON clips(expires_at);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_clips_hash ON clips(hash);

            CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(
                content,
                preview,
                content='clips',
                content_rowid='rowid',
                tokenize='unicode61'
            );

            CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN
                INSERT INTO clips_fts(rowid, content, preview) VALUES (new.rowid, new.content, new.preview);
            END;

            CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN
                INSERT INTO clips_fts(clips_fts, rowid, content, preview) VALUES('delete', old.rowid, old.content, old.preview);
            END;

            CREATE TRIGGER IF NOT EXISTS clips_au AFTER UPDATE ON clips BEGIN
                INSERT INTO clips_fts(clips_fts, rowid, content, preview) VALUES('delete', old.rowid, old.content, old.preview);
                INSERT INTO clips_fts(rowid, content, preview) VALUES (new.rowid, new.content, new.preview);
            END;
            ",
        )
        .map_err(|e| e.to_string())?;

        Self::migrate_schema(&conn)?;
        Self::seed_categories(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn migrate_schema(conn: &Connection) -> Result<(), String> {
        if !column_exists(conn, "clips", "group_id")? {
            conn.execute(
                "ALTER TABLE clips ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE SET NULL",
                [],
            )
            .map_err(|e| e.to_string())?;
        }

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_clips_group ON clips(group_id, created_at DESC)",
            [],
        )
        .map_err(|e| e.to_string())?;

        if column_exists(conn, "clips", "pinned")? {
            let now = chrono::Utc::now().timestamp();
            conn.execute(
                "INSERT OR IGNORE INTO groups (id, name, label, description, sort_order, created_at) VALUES (?1, '收藏', '', '', 0, ?2)",
                params![MIGRATED_PINNED_GROUP_ID, now],
            )
            .map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE clips SET group_id = ?1, expires_at = NULL WHERE pinned = 1",
                params![MIGRATED_PINNED_GROUP_ID],
            )
            .map_err(|e| e.to_string())?;

            conn.execute("DROP INDEX IF EXISTS idx_clips_pinned_created", [])
                .map_err(|e| e.to_string())?;

            conn.execute("ALTER TABLE clips DROP COLUMN pinned", [])
                .map_err(|e| e.to_string())?;
        }

        conn.execute("DELETE FROM categories WHERE id = 'pinned'", [])
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn seed_categories(conn: &Connection) -> Result<(), String> {
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if count > 0 {
            return Ok(());
        }
        let defaults = [
            ("all", "全部", "#6366f1", "layout-grid", 0),
            ("text", "文本", "#22c55e", "type", 1),
            ("image", "图片", "#f59e0b", "image", 2),
            ("code", "代码", "#8b5cf6", "code", 3),
            ("markdown", "Markdown", "#06b6d4", "file-text", 4),
            ("file", "文件", "#ef4444", "file", 5),
        ];
        for (id, name, color, icon, order) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, name, color, icon, order],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn insert_clip(&self, clip: &Clip) -> Result<Clip, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM clips WHERE hash = ?1",
                params![clip.hash],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        if let Some(id) = existing {
            conn.execute(
                "UPDATE clips SET created_at = ?1, expires_at = CASE WHEN group_id IS NOT NULL THEN NULL ELSE ?2 END, preview = ?3 WHERE id = ?4",
                params![clip.created_at, clip.expires_at, clip.preview, id],
            )
            .map_err(|e| e.to_string())?;
            drop(conn);
            return self.get_clip(&id);
        }

        conn.execute(
            "INSERT INTO clips (id, type, content, preview, hash, size, category_id, group_id, language, source_app, created_at, expires_at, thumbnail_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                clip.id,
                clip.clip_type,
                clip.content,
                clip.preview,
                clip.hash,
                clip.size,
                clip.category_id,
                clip.group_id,
                clip.language,
                clip.source_app,
                clip.created_at,
                clip.expires_at,
                clip.thumbnail_path,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(clip.clone())
    }

    pub fn list_clips(&self, params: &ListClipsParams) -> Result<Vec<Clip>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut sql = format!("{CLIP_SELECT} WHERE 1=1");
        let mut bind: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

        if let Some(cat) = &params.category_id {
            if let Some(gid) = cat.strip_prefix("group:") {
                if is_safe_id(gid) {
                    sql.push_str(" AND c.group_id = ?");
                    bind.push(Box::new(gid.to_string()));
                }
            } else {
                match cat.as_str() {
                    "all" => {}
                    "text" | "image" | "code" | "markdown" | "file" => {
                        if is_safe_id(cat) {
                            sql.push_str(&format!(" AND c.type = '{cat}'"));
                        }
                    }
                    _ => {
                        if is_safe_id(cat) {
                            sql.push_str(&format!(" AND c.category_id = '{cat}'"));
                        }
                    }
                }
            }
        }

        if let Some(t) = &params.clip_type {
            let safe: String = t.chars().filter(|c| c.is_alphanumeric()).collect();
            if !safe.is_empty() {
                sql.push_str(&format!(" AND c.type = '{safe}'"));
            }
        }

        sql.push_str(" ORDER BY c.created_at DESC LIMIT ? OFFSET ?");
        bind.push(Box::new(params.limit));
        bind.push(Box::new(params.offset));

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            bind.iter().map(|b| b.as_ref()).collect();
        let rows = stmt
            .query_map(params_ref.as_slice(), row_to_clip)
            .map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn search_clips(&self, params: &SearchClipsParams) -> Result<Vec<Clip>, String> {
        let query = params.query.trim();
        if query.is_empty() {
            return self.list_clips(&ListClipsParams {
                offset: params.offset,
                limit: params.limit,
                category_id: Some("all".into()),
                clip_type: None,
            });
        }

        if let Some(filtered) = parse_filter_query(query) {
            return self.list_clips(&ListClipsParams {
                offset: params.offset,
                limit: params.limit,
                category_id: filtered.category_id,
                clip_type: filtered.clip_type,
            });
        }

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let fts_query = query
            .split_whitespace()
            .map(|w| format!("\"{}\"", w.replace('"', "")))
            .collect::<Vec<_>>()
            .join(" ");

        let sql = format!(
            "{CLIP_SELECT}
            INNER JOIN clips_fts fts ON c.rowid = fts.rowid
            WHERE clips_fts MATCH ?1
            ORDER BY c.created_at DESC
            LIMIT ?2 OFFSET ?3"
        );

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![fts_query, params.limit, params.offset], row_to_clip)
            .map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_clip(&self, id: &str) -> Result<Clip, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let sql = format!("{CLIP_SELECT} WHERE c.id = ?1");
        conn.query_row(&sql, params![id], row_to_clip)
            .map_err(|e| e.to_string())
    }

    pub fn delete_clip(&self, id: &str) -> Result<(), String> {
        if let Ok(clip) = self.get_clip(id) {
            if let Some(path) = clip.thumbnail_path {
                let _ = fs::remove_file(path);
            }
            if clip.clip_type == "image" {
                let _ = fs::remove_file(&clip.content);
            }
        }
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM clips WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn set_clip_group(
        &self,
        id: &str,
        group_id: Option<String>,
        config: &AppConfig,
    ) -> Result<Clip, String> {
        let expires_at = if group_id.is_some() {
            None
        } else {
            config.expiry_timestamp()
        };
        {
            let conn = self.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE clips SET group_id = ?1, expires_at = ?2 WHERE id = ?3",
                params![group_id, expires_at, id],
            )
            .map_err(|e| e.to_string())?;
        }
        self.get_clip(id)
    }

    pub fn bump_clip_to_front(&self, id: &str, config: &AppConfig) -> Result<Clip, String> {
        let clip = self.get_clip(id)?;
        let now = chrono::Utc::now().timestamp();
        let expires_at = if clip.group_id.is_some() {
            None
        } else {
            config.expiry_timestamp()
        };
        {
            let conn = self.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE clips SET created_at = ?1, expires_at = ?2 WHERE id = ?3",
                params![now, expires_at, id],
            )
            .map_err(|e| e.to_string())?;
        }
        self.get_clip(id)
    }

    pub fn set_category(&self, id: &str, category_id: Option<String>) -> Result<Clip, String> {
        {
            let conn = self.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE clips SET category_id = ?1 WHERE id = ?2",
                params![category_id, id],
            )
            .map_err(|e| e.to_string())?;
        }
        self.get_clip(id)
    }

    pub fn list_groups(&self) -> Result<Vec<Group>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, label, description, sort_order, created_at FROM groups ORDER BY sort_order, created_at",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], row_to_group)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn upsert_group(&self, group: &Group) -> Result<Group, String> {
        let name = group.name.trim();
        if name.is_empty() {
            return Err("分组名称不能为空".into());
        }
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO groups (id, name, label, description, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, label=excluded.label, description=excluded.description, sort_order=excluded.sort_order",
            params![
                group.id,
                name,
                "",
                group.description.trim(),
                group.sort_order,
                group.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(group.clone())
    }

    pub fn delete_group(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM groups WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn count_clips_in_group(&self, group_id: &str) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT COUNT(*) FROM clips WHERE group_id = ?1",
            params![group_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())
    }

    pub fn list_categories(&self) -> Result<Vec<Category>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, color, icon, sort_order FROM categories ORDER BY sort_order")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Category {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    icon: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn upsert_category(&self, category: &Category) -> Result<Category, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color, icon=excluded.icon, sort_order=excluded.sort_order",
            params![category.id, category.name, category.color, category.icon, category.sort_order],
        )
        .map_err(|e| e.to_string())?;
        Ok(category.clone())
    }

    pub fn delete_category(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE clips SET category_id = NULL WHERE category_id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn cleanup(&self, config: &AppConfig) -> Result<u32, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();

        let expired: Vec<(String, Option<String>, String)> = conn
            .prepare(
                "SELECT id, thumbnail_path, type FROM clips WHERE group_id IS NULL AND expires_at IS NOT NULL AND expires_at < ?1",
            )
            .map_err(|e| e.to_string())?
            .query_map(params![now], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (_id, thumb, clip_type) in &expired {
            if let Some(p) = thumb {
                let _ = fs::remove_file(p);
            }
            if clip_type == "image" {
                // content path is fetched below
            }
        }

        let expired_image_paths: Vec<String> = conn
            .prepare(
                "SELECT content FROM clips WHERE group_id IS NULL AND expires_at IS NOT NULL AND expires_at < ?1 AND type = 'image'",
            )
            .map_err(|e| e.to_string())?
            .query_map(params![now], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        for p in expired_image_paths {
            let _ = fs::remove_file(p);
        }

        let deleted_expired = conn
            .execute(
                "DELETE FROM clips WHERE group_id IS NULL AND expires_at IS NOT NULL AND expires_at < ?1",
                params![now],
            )
            .map_err(|e| e.to_string())? as u32;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clips", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;

        let mut deleted_overflow = 0u32;
        if count > config.max_items as i64 {
            let excess = count - config.max_items as i64;
            let overflow_rows: Vec<(String, Option<String>, String, String)> = conn
                .prepare(
                    "SELECT id, thumbnail_path, type, content FROM clips WHERE group_id IS NULL ORDER BY created_at ASC LIMIT ?1",
                )
                .map_err(|e| e.to_string())?
                .query_map(params![excess], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            for (_id, thumb, clip_type, content) in &overflow_rows {
                if let Some(p) = thumb {
                    let _ = fs::remove_file(p);
                }
                if clip_type == "image" {
                    let _ = fs::remove_file(content);
                }
            }

            let ids: Vec<String> = overflow_rows.into_iter().map(|(id, _, _, _)| id).collect();
            for id in ids {
                let affected = conn
                    .execute("DELETE FROM clips WHERE id = ?1", params![id])
                    .map_err(|e| e.to_string())?;
                deleted_overflow += affected as u32;
            }
        }

        Ok(deleted_expired + deleted_overflow)
    }

    pub fn stats(&self) -> Result<(i64, i64), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clips", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let size: i64 = conn
            .query_row("SELECT COALESCE(SUM(size), 0) FROM clips", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        Ok((count, size))
    }
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?;
    for name in rows.flatten() {
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ':')
}

fn row_to_clip(row: &rusqlite::Row<'_>) -> rusqlite::Result<Clip> {
    Ok(Clip {
        id: row.get(0)?,
        clip_type: row.get(1)?,
        content: row.get(2)?,
        preview: row.get(3)?,
        hash: row.get(4)?,
        size: row.get(5)?,
        category_id: row.get(6)?,
        language: row.get(7)?,
        source_app: row.get(8)?,
        created_at: row.get(9)?,
        expires_at: row.get(10)?,
        thumbnail_path: row.get(11)?,
        group_id: row.get(12)?,
        group_label: row.get(13)?,
    })
}

fn row_to_group(row: &rusqlite::Row<'_>) -> rusqlite::Result<Group> {
    Ok(Group {
        id: row.get(0)?,
        name: row.get(1)?,
        label: row.get(2)?,
        description: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
    })
}

struct FilterQuery {
    category_id: Option<String>,
    clip_type: Option<String>,
}

fn parse_filter_query(query: &str) -> Option<FilterQuery> {
    let lower = query.to_lowercase();
    if lower.starts_with("type:") {
        let t = lower.trim_start_matches("type:").trim();
        return Some(FilterQuery {
            category_id: Some("all".into()),
            clip_type: Some(t.to_string()),
        });
    }
    if lower.starts_with("lang:") {
        return None;
    }
    None
}

fn resize_image_max_edge(img: &image::DynamicImage, max_edge: u32) -> image::DynamicImage {
    let (w, h) = (img.width(), img.height());
    let longest = w.max(h);
    if longest <= max_edge {
        return img.clone();
    }
    let (nw, nh) = if w >= h {
        (
            max_edge,
            ((h as u64 * max_edge as u64) / w as u64).max(1) as u32,
        )
    } else {
        (
            ((w as u64 * max_edge as u64) / h as u64).max(1) as u32,
            max_edge,
        )
    };
    img.resize(nw, nh, image::imageops::FilterType::Lanczos3)
}

pub fn save_image_with_thumbnail(data: &[u8]) -> Result<(String, String), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let img_dir = images_dir();
    let original_path = img_dir.join(format!("{id}.png"));
    let thumb_path = img_dir.join(format!("{id}_thumb.png"));

    let img = image::load_from_memory(data).map_err(|e| e.to_string())?;
    img.save(&original_path).map_err(|e| e.to_string())?;

    const THUMB_MAX_EDGE: u32 = 480;
    let thumb = resize_image_max_edge(&img, THUMB_MAX_EDGE);
    thumb.save(&thumb_path).map_err(|e| e.to_string())?;

    Ok((
        original_path.to_string_lossy().into_owned(),
        thumb_path.to_string_lossy().into_owned(),
    ))
}

pub fn preview_text(text: &str, max_len: usize) -> String {
    let trimmed: String = text.chars().take(max_len).collect();
    if text.chars().count() > max_len {
        format!("{trimmed}…")
    } else {
        trimmed
    }
}

pub fn detect_clip_type(text: &str) -> (String, Option<String>) {
    let trimmed = text.trim();
    if trimmed.starts_with("```") || looks_like_code(trimmed) {
        let lang = detect_language(trimmed);
        return ("code".into(), lang);
    }
    if looks_like_markdown(trimmed) {
        return ("markdown".into(), None);
    }
    ("text".into(), None)
}

fn looks_like_code(s: &str) -> bool {
    let strong_indicators = [
        "fn ", "function ", "const ", "let ", "var ", "class ", "import ", "export ",
        "public ", "private ", "def ", "package ", "#include", "using namespace",
        "interface ", "impl ", "async ", "await ",
    ];
    let count = strong_indicators.iter().filter(|i| s.contains(**i)).count();
    let has_symbols = s.contains('{')
        || s.contains('}')
        || s.contains("=>")
        || s.contains("::")
        || s.contains("();")
        || s.contains("==");
    let has_line_break = s.contains('\n');
    count >= 2 || (count >= 1 && has_symbols && has_line_break)
}

fn looks_like_markdown(s: &str) -> bool {
    s.starts_with('#')
        || s.contains("\n# ")
        || s.contains("](http")
        || s.contains("```")
        || (s.contains("- [") && s.contains("]"))
}

fn detect_language(s: &str) -> Option<String> {
    if let Some(rest) = s.strip_prefix("```") {
        let lang = rest.lines().next()?.trim();
        if !lang.is_empty() && lang.len() < 20 {
            return Some(lang.to_string());
        }
    }
    if s.contains("fn main()") || s.contains("impl ") {
        return Some("rust".into());
    }
    if s.contains("function ") || s.contains("const ") {
        return Some("javascript".into());
    }
    if s.contains("def ") {
        return Some("python".into());
    }
    None
}
