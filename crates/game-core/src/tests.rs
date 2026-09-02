use crate::{
    choose_ai_move, create_game_state, get_ai_search_profile, place_stone, AiDifficulty, AiMoveOptions,
    Capture, GameState, Player, Point, Score, Stone,
};

fn stone(x: i64, y: i64, player: Player) -> Stone {
    Stone { x, y, player }
}

fn state_with(stones: Vec<Stone>, current_player: Player, captures: Vec<Capture>) -> GameState {
    let mut state = GameState::new();
    state.current_player = current_player;
    state.stones = stones;
    state.captures = captures;
    state.rebuild_index();
    state.score = crate::capture::score_captures(&state.captures);
    state
}

fn diamond(center_x: i64, center_y: i64, radius: i64, player: Player) -> Vec<Stone> {
    let mut points = Vec::new();
    for offset in 0..radius {
        points.push(stone(center_x + offset, center_y - radius + offset, player));
    }
    for offset in 0..radius {
        points.push(stone(center_x + radius - offset, center_y + offset, player));
    }
    for offset in 0..radius {
        points.push(stone(center_x - offset, center_y + radius - offset, player));
    }
    for offset in 0..radius {
        points.push(stone(center_x - radius + offset, center_y - offset, player));
    }
    points
}

#[test]
fn places_one_stone_and_alternates_player() {
    let next = place_stone(&create_game_state(), Point { x: 2, y: 3 });
    assert_eq!(next.stone_at(Point { x: 2, y: 3 }).unwrap().player, Player::Red);
    assert_eq!(next.current_player, Player::Blue);
}

#[test]
fn rejects_occupied_and_unsafe_coordinates() {
    let initial = create_game_state();
    let once = place_stone(&initial, Point { x: 0, y: 0 });
    assert_eq!(place_stone(&once, Point { x: 0, y: 0 }), once);
    assert_eq!(
        place_stone(&initial, Point { x: crate::types::MAX_SAFE_INTEGER + 1, y: 0 }),
        initial
    );
}

#[test]
fn captures_only_after_neighbor_boundary_closes() {
    let initial = state_with(
        vec![
            stone(0, -1, Player::Red),
            stone(1, 0, Player::Red),
            stone(-1, 0, Player::Red),
            stone(0, 0, Player::Blue),
        ],
        Player::Red,
        vec![],
    );
    let captured = place_stone(&initial, Point { x: 0, y: 1 });
    assert_eq!(captured.captures.len(), 1);
    assert_eq!(captured.captures[0].boundary.len(), 4);
    assert_eq!(captured.captures[0].captured[0].point(), Point { x: 0, y: 0 });
    assert_eq!(captured.score.red, 1);
}

#[test]
fn does_not_connect_across_two_step_gap() {
    let initial = state_with(
        vec![
            stone(0, -2, Player::Red),
            stone(2, 0, Player::Red),
            stone(0, 2, Player::Red),
            stone(0, 0, Player::Blue),
        ],
        Player::Red,
        vec![],
    );
    let result = place_stone(&initial, Point { x: -2, y: 0 });
    assert!(result.captures.is_empty());
    assert_eq!(result.score.red, 0);
}

#[test]
fn activates_empty_house_when_opponent_enters() {
    let initial = state_with(diamond(0, 0, 2, Player::Red), Player::Blue, vec![]);
    let captured = place_stone(&initial, Point { x: 0, y: 0 });
    assert_eq!(captured.captures.len(), 1);
    assert_eq!(captured.captures[0].owner, Player::Red);
    assert_eq!(captured.score, Score { red: 1, blue: 0 });
    assert_eq!(place_stone(&captured, Point { x: 0, y: 1 }), captured);
}

#[test]
fn surrounds_capture_and_releases_previously_captured_stone() {
    let blue_boundary = diamond(0, 0, 1, Player::Blue);
    let red_center = stone(0, 0, Player::Red);
    let blue_capture = Capture {
        owner: Player::Blue,
        boundary: blue_boundary.iter().map(|stone| stone.point()).collect(),
        captured: vec![red_center],
    };
    let red_outer = diamond(0, 0, 2, Player::Red);
    let closing = red_outer.last().unwrap().point();
    let mut stones = blue_boundary;
    stones.push(red_center);
    stones.extend_from_slice(&red_outer[..red_outer.len() - 1]);
    let initial = state_with(stones, Player::Red, vec![blue_capture]);

    let result = place_stone(&initial, closing);
    assert_eq!(result.captures.len(), 1);
    assert_eq!(result.captures[0].owner, Player::Red);
    assert_eq!(result.score, Score { red: 4, blue: 0 });
}

#[test]
fn capture_logic_is_stable_at_large_coordinates() {
    let origin = 100_000;
    let initial = state_with(
        vec![
            stone(origin, origin - 1, Player::Red),
            stone(origin + 1, origin, Player::Red),
            stone(origin - 1, origin, Player::Red),
            stone(origin, origin, Player::Blue),
        ],
        Player::Red,
        vec![],
    );
    let captured = place_stone(&initial, Point { x: origin, y: origin + 1 });
    assert_eq!(captured.score.red, 1);
}

#[test]
fn ai_profiles_preserve_difficulty_depth_contracts() {
    let easy = get_ai_search_profile(AiDifficulty::Easy, 20);
    let normal = get_ai_search_profile(AiDifficulty::Normal, 20);
    let hard = get_ai_search_profile(AiDifficulty::Hard, 20);
    let expert = get_ai_search_profile(AiDifficulty::Expert, 20);
    assert_eq!((easy.primary_limit, easy.reply_limit, easy.continuation_limit, easy.final_reply_limit), (4, 0, 0, 0));
    assert!(normal.reply_limit > 0);
    assert!(hard.continuation_limit > 0);
    assert!(expert.final_reply_limit > 0);
    assert!(expert.primary_limit > easy.primary_limit);
}

#[test]
fn ai_is_deterministic_and_legal_at_every_difficulty() {
    let state = state_with(
        vec![
            stone(0, 0, Player::Red),
            stone(4, 4, Player::Blue),
            stone(1, 0, Player::Red),
        ],
        Player::Blue,
        vec![],
    );
    for difficulty in [
        AiDifficulty::Easy,
        AiDifficulty::Normal,
        AiDifficulty::Hard,
        AiDifficulty::Expert,
    ] {
        let options = AiMoveOptions {
            player: Some(Player::Blue),
            focus: Some(Point { x: 1, y: 0 }),
            difficulty: Some(difficulty),
            ..AiMoveOptions::default()
        };
        let first = choose_ai_move(&state, &options);
        let second = choose_ai_move(&state, &options);
        assert_eq!(first, second);
        let point = first.expect("AI move");
        assert_ne!(place_stone(&state, point), state);
    }
    assert_eq!(state.stones.len(), 3);
}

#[test]
fn ai_takes_immediate_capture_at_every_difficulty() {
    let state = state_with(
        vec![
            stone(0, -1, Player::Blue),
            stone(1, 0, Player::Blue),
            stone(0, 1, Player::Blue),
            stone(0, 0, Player::Red),
        ],
        Player::Blue,
        vec![],
    );
    for difficulty in [
        AiDifficulty::Easy,
        AiDifficulty::Normal,
        AiDifficulty::Hard,
        AiDifficulty::Expert,
    ] {
        let options = AiMoveOptions {
            player: Some(Player::Blue),
            focus: Some(Point { x: 0, y: 0 }),
            difficulty: Some(difficulty),
            ..AiMoveOptions::default()
        };
        let point = choose_ai_move(&state, &options).expect("AI move");
        assert_eq!(point, Point { x: -1, y: 0 });
        assert_eq!(place_stone(&state, point).score, Score { red: 0, blue: 1 });
    }
}

#[test]
fn ai_rejects_wrong_player_turn() {
    let state = state_with(vec![stone(0, 0, Player::Red)], Player::Red, vec![]);
    let options = AiMoveOptions {
        player: Some(Player::Blue),
        difficulty: Some(AiDifficulty::Expert),
        ..AiMoveOptions::default()
    };
    assert_eq!(choose_ai_move(&state, &options), None);
}
