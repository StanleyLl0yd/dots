use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = createState)]
pub fn create_state() -> String {
    crate::create_state_json()
}

#[wasm_bindgen(js_name = applyMove)]
pub fn apply_move(state_json: &str, x: i64, y: i64) -> Result<String, JsValue> {
    crate::apply_move_json(state_json, x, y).map_err(|error| JsValue::from_str(&error))
}

#[wasm_bindgen(js_name = replayMoves)]
pub fn replay_moves(moves_json: &str) -> Result<String, JsValue> {
    crate::replay_moves_json(moves_json).map_err(|error| JsValue::from_str(&error))
}

#[wasm_bindgen(js_name = chooseAiMove)]
pub fn choose_ai_move(state_json: &str, options_json: &str) -> Result<String, JsValue> {
    crate::choose_ai_move_json(state_json, options_json).map_err(|error| JsValue::from_str(&error))
}
