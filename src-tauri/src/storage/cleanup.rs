use crate::config::{load_config, AppConfig};
use crate::storage::db::Db;
use std::sync::Arc;
use std::time::Duration;

pub fn start_cleanup_task(db: Arc<Db>) {
    std::thread::spawn(move || {
        loop {
            let config = load_config();
            let _ = db.cleanup(&config);
            std::thread::sleep(Duration::from_secs(3600));
        }
    });
}

pub fn run_cleanup_now(db: &Db, config: &AppConfig) -> Result<u32, String> {
    db.cleanup(config)
}
