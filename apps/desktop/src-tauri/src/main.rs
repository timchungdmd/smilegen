mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::generate_variants])
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
