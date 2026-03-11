use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const VISION_HEALTH_URL: &str = "http://localhost:8003/health";
const MESH_HEALTH_URL: &str = "http://localhost:8002/health";

/// Holds spawned sidecar child process handles.
/// Both fields are `None` until `start_sidecars` succeeds.
/// Keeping the handles alive prevents `CommandChild::drop` from killing the processes.
pub struct AppState {
    pub vision_child: Option<CommandChild>,
    pub mesh_child: Option<CommandChild>,
}

/// Tauri-managed wrapper — must implement Send + Sync via Mutex.
pub struct ManagedAppState(pub Mutex<AppState>);

/// Spawns both Python sidecars and starts a background health-check loop.
/// Emits "sidecars-ready" when both services answer /health,
/// or "sidecars-unavailable" after 10 × 500 ms attempts.
/// If spawning fails, emits "sidecars-unavailable" immediately so the
/// frontend can degrade gracefully rather than crashing the app.
pub fn start_sidecars(app: &AppHandle) {
    let shell = app.shell();

    let spawn_result = (|| -> Result<(), Box<dyn std::error::Error>> {
        let (_vision_rx, vision_child) = shell.sidecar("vision-server")?.spawn()?;
        let (_mesh_rx, mesh_child) = shell.sidecar("mesh-server")?.spawn()?;

        let state = app.state::<ManagedAppState>();
        let mut guard = state.0.lock().unwrap_or_else(|p| p.into_inner());
        guard.vision_child = Some(vision_child);
        guard.mesh_child = Some(mesh_child);

        Ok(())
    })();

    if spawn_result.is_err() {
        let _ = app.emit("sidecars-unavailable", ());
        return;
    }

    // Start health-check loop in background
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        poll_until_healthy(app_handle).await;
    });
}

/// Polls /health on both services concurrently up to 10 times with 500 ms intervals.
/// Emits "sidecars-ready" on success, "sidecars-unavailable" on timeout.
async fn poll_until_healthy(app: AppHandle) {
    let client = reqwest::Client::new();
    for _ in 0..10 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let vision_fut = async {
            client
                .get(VISION_HEALTH_URL)
                .timeout(std::time::Duration::from_millis(400))
                .send()
                .await
                .map(|r| r.status().is_success())
                .unwrap_or(false)
        };

        let mesh_fut = async {
            client
                .get(MESH_HEALTH_URL)
                .timeout(std::time::Duration::from_millis(400))
                .send()
                .await
                .map(|r| r.status().is_success())
                .unwrap_or(false)
        };

        let (vision_ok, mesh_ok) = tokio::join!(vision_fut, mesh_fut);
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
