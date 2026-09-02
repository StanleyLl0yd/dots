#[tauri::command]
fn game_create_state() -> String {
    game_core::create_state_json()
}

#[tauri::command]
fn game_apply_move(state_json: String, x: i64, y: i64) -> Result<String, String> {
    game_core::apply_move_json(&state_json, x, y)
}

#[tauri::command]
fn game_replay_moves(moves_json: String) -> Result<String, String> {
    game_core::replay_moves_json(&moves_json)
}

#[tauri::command]
fn game_choose_ai_move(state_json: String, options_json: String) -> Result<String, String> {
    game_core::choose_ai_move_json(&state_json, &options_json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            game_create_state,
            game_apply_move,
            game_replay_moves,
            game_choose_ai_move
        ])
        .run(tauri::generate_context!())
        .expect("error while running Dots");
}
