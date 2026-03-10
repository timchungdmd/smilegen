use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// Holds spawned-sidecar tracking info.
/// Stored in AppState so it can be accessed for cleanup.
pub struct AppState {
    pub vision_spawned: bool,
    pub mesh_spawned: bool,
}

/// Tauri-managed wrapper — must implement Send + Sync via Mutex.
pub struct ManagedAppState(pub Mutex<AppState>);

/// Spawns both Python sidecars and starts a background health-check loop.
/// Emits "sidecars-ready" when both services answer /health,
/// or "sidecars-unavailable" after 10 × 500 ms attempts.
pub fn start_sidecars(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let shell = app.shell();

    // spawn() returns (Receiver<CommandEvent>, CommandChild).
    // We discard both — the processes continue running independently.
    // The OS will clean them up when the parent process exits.
    let (_rx, _child) = shell.sidecar("vision-server")?.spawn()?;
    let (_rx2, _child2) = shell.sidecar("mesh-server")?.spawn()?;

    // Mark as spawned in AppState
    let state = app.state::<ManagedAppState>();
    let mut guard = state.0.lock().unwrap();
    guard.vision_spawned = true;
    guard.mesh_spawned = true;
    drop(guard);

    // Start health-check loop in background
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        poll_until_healthy(app_handle).await;
    });

    Ok(())
}

/// Polls /health on both services up to 10 times with 500 ms intervals.
/// Emits "sidecars-ready" on success, "sidecars-unavailable" on timeout.
async fn poll_until_healthy(app: AppHandle) {
    let client = reqwest::Client::new();
    for _ in 0..10 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        let vision_ok = client
            .get("http://localhost:8003/health")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);
        let mesh_ok = client
            .get("http://localhost:8002/health")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);
        if vision_ok && mesh_ok {
            let _ = app.emit("sidecars-ready", ());
            return;
        }
    }
    let _ = app.emit("sidecars-unavailable", ());
}

#[tauri::command]
pub fn generate_variants() -> &'static str {
    "stubbed"
}
