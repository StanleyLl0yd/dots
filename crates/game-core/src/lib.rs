mod ai;
mod board;
mod capture;
mod types;

#[cfg(feature = "wasm")]
mod wasm;

pub use ai::{choose_ai_move, get_ai_search_profile};
pub use board::{create_game_state, place_stone};
pub use types::{
    AiDifficulty, AiMoveOptions, AiSearchProfile, ApplyMoveResult, Capture, GameState, Player, Point,
    ReplayMovesResult, Score, Stone,
};

fn decode_state(state_json: &str) -> Result<GameState, String> {
    let mut state: GameState = serde_json::from_str(state_json).map_err(|error| error.to_string())?;
    state.rebuild_index();
    Ok(state)
}

pub fn create_state_json() -> String {
    serde_json::to_string(&create_game_state()).expect("game state serialization")
}

pub fn apply_move_json(state_json: &str, x: i64, y: i64) -> Result<String, String> {
    let state = decode_state(state_json)?;
    let next = place_stone(&state, Point { x, y });
    serde_json::to_string(&ApplyMoveResult {
        changed: next != state,
        state: next,
    })
    .map_err(|error| error.to_string())
}

pub fn replay_moves(moves: &[Point]) -> ReplayMovesResult {
    let mut state = create_game_state();
    for point in moves {
        let next = place_stone(&state, *point);
        if next == state {
            return ReplayMovesResult {
                valid: false,
                state: None,
            };
        }
        state = next;
    }
    ReplayMovesResult {
        valid: true,
        state: Some(state),
    }
}

pub fn replay_moves_json(moves_json: &str) -> Result<String, String> {
    let moves: Vec<Point> = serde_json::from_str(moves_json).map_err(|error| error.to_string())?;
    serde_json::to_string(&replay_moves(&moves)).map_err(|error| error.to_string())
}

pub fn choose_ai_move_json(state_json: &str, options_json: &str) -> Result<String, String> {
    let state = decode_state(state_json)?;
    let options: AiMoveOptions = serde_json::from_str(options_json).map_err(|error| error.to_string())?;
    serde_json::to_string(&choose_ai_move(&state, &options)).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod regression_tests;

#[cfg(test)]
mod topology_tests;
