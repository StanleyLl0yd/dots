#[tauri::command]
fn core_create() -> String {
    game_core::create_state_json()
}

#[tauri::command]
fn core_move(state_json: String, x: i64, y: i64) -> Result<String, String> {
    game_core::apply_move_json(&state_json, x, y)
}

#[tauri::command]
fn core_replay(moves_json: String) -> Result<String, String> {
    game_core::replay_moves_json(&moves_json)
}

#[tauri::command]
fn core_ai(state_json: String, options_json: String) -> Result<String, String> {
    game_core::choose_ai_move_json(&state_json, &options_json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().build())
        .invoke_handler(tauri::generate_handler![core_create, core_move, core_replay, core_ai])
        .run(tauri::generate_context!())
        .expect("error while running Dots");
}
