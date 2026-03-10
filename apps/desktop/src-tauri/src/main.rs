mod commands;

use commands::ManagedAppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ManagedAppState(Mutex::new(commands::AppState {
            vision_spawned: false,
            mesh_spawned: false,
        })))
        .setup(|app| {
            commands::start_sidecars(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::generate_variants])
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
