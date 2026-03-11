mod commands;

use commands::ManagedAppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ManagedAppState(Mutex::new(commands::AppState {
            vision_child: None,
            mesh_child: None,
        })))
        .setup(|app| {
            commands::start_sidecars(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::generate_variants])
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
