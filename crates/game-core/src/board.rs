use crate::capture::{point_inside_any_capture, resolve_captures_after_move, score_captures};
use crate::types::{GameState, Point, Stone};

pub fn create_game_state() -> GameState {
    GameState::new()
}

pub fn place_stone(state: &GameState, point: Point) -> GameState {
    if !point.is_safe() || state.has_stone(point) || point_inside_any_capture(point, &state.captures) {
        return state.clone();
    }

    let player = state.current_player;
    let mut next = state.clone();
    next.push_stone(Stone {
        x: point.x,
        y: point.y,
        player,
    });
    next.captures = resolve_captures_after_move(&next, &state.captures, player, point);
    next.score = score_captures(&next.captures);
    next.current_player = player.other();
    next
}
