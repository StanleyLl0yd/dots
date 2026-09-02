use crate::{
    capture::{find_new_captures, point_in_polygon, score_captures},
    choose_ai_move, get_ai_search_profile, place_stone, AiDifficulty, AiMoveOptions, Capture,
    GameState, Player, Point, Score, Stone,
};
use std::collections::{HashMap, HashSet};

const OFFSETS: [(i64, i64); 8] = [
    (-1, -1),
    (0, -1),
    (1, -1),
    (-1, 0),
    (1, 0),
    (-1, 1),
    (0, 1),
    (1, 1),
];

fn stone(x: i64, y: i64, player: Player) -> Stone {
    Stone { x, y, player }
}

fn state_with(stones: Vec<Stone>, current_player: Player, captures: Vec<Capture>) -> GameState {
    let mut state = GameState {
        current_player,
        stones,
        captures,
        score: Score::default(),
        ..GameState::new()
    };
    state.rebuild_index();
    state.score = score_captures(&state.captures);
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

fn expert_move(state: &GameState, focus: Option<Point>) -> Point {
    choose_ai_move(
        state,
        &AiMoveOptions {
            player: Some(state.current_player),
            difficulty: Some(AiDifficulty::Expert),
            focus,
            ..AiMoveOptions::default()
        },
    )
    .expect("expert move")
}

fn max_immediate_gain(state: &GameState, player: Player) -> i64 {
    if state.current_player != player {
        return 0;
    }
    let mut candidates = HashSet::new();
    for item in &state.stones {
        for (dx, dy) in OFFSETS {
            let point = Point {
                x: item.x + dx,
                y: item.y + dy,
            };
            if !state.has_stone(point) {
                candidates.insert(point);
            }
        }
    }

    let opponent = player.other();
    candidates
        .into_iter()
        .filter_map(|point| {
            let next = place_stone(state, point);
            (next != *state).then(|| {
                next.score.get(player) as i64 - state.score.get(player) as i64
                    + state.score.get(opponent) as i64
                    - next.score.get(opponent) as i64
            })
        })
        .max()
        .unwrap_or(0)
}

#[test]
fn polygon_boundary_is_not_interior() {
    let polygon = [
        Point { x: 0, y: -1 },
        Point { x: 1, y: 0 },
        Point { x: 0, y: 1 },
        Point { x: -1, y: 0 },
    ];
    assert!(point_in_polygon(Point { x: 0, y: 0 }, &polygon));
    assert!(!point_in_polygon(Point { x: 1, y: 0 }, &polygon));
    assert!(!point_in_polygon(Point { x: 2, y: 0 }, &polygon));
}

#[test]
fn minimum_valid_face_is_selected() {
    let mut stones = vec![
        stone(1, 1, Player::Red),
        stone(0, 2, Player::Red),
        stone(-1, 1, Player::Red),
        stone(2, 2, Player::Red),
        stone(1, 3, Player::Red),
        stone(0, 4, Player::Red),
        stone(-1, 3, Player::Red),
        stone(-2, 2, Player::Red),
        stone(0, 0, Player::Red),
    ];
    stones.push(stone(0, 1, Player::Blue));
    let state = state_with(stones, Player::Red, vec![]);
    let captures = find_new_captures(&state, &[], Player::Red, Point { x: 0, y: 0 });
    assert_eq!(captures.len(), 1);
    assert_eq!(captures[0].boundary.len(), 4);
    assert_eq!(captures[0].captured, vec![stone(0, 1, Player::Blue)]);
}

#[test]
fn captured_dot_is_counted_once_in_score() {
    let blue = stone(0, 0, Player::Blue);
    let captures = vec![
        Capture {
            owner: Player::Red,
            boundary: diamond(0, 0, 1, Player::Red)
                .into_iter()
                .map(Stone::point)
                .collect(),
            captured: vec![blue],
        },
        Capture {
            owner: Player::Red,
            boundary: diamond(0, 0, 2, Player::Red)
                .into_iter()
                .map(Stone::point)
                .collect(),
            captured: vec![blue],
        },
    ];
    assert_eq!(score_captures(&captures), Score { red: 1, blue: 0 });
}

#[test]
fn empty_closed_house_does_not_score() {
    let initial = state_with(
        vec![
            stone(0, -1, Player::Red),
            stone(1, 0, Player::Red),
            stone(-1, 0, Player::Red),
        ],
        Player::Red,
        vec![],
    );
    let result = place_stone(&initial, Point { x: 0, y: 1 });
    assert!(result.captures.is_empty());
    assert_eq!(result.score.red, 0);
}

#[test]
fn one_move_can_complete_two_independent_captures() {
    let initial = state_with(
        vec![
            stone(-1, -1, Player::Red),
            stone(-2, 0, Player::Red),
            stone(-1, 1, Player::Red),
            stone(1, -1, Player::Red),
            stone(2, 0, Player::Red),
            stone(1, 1, Player::Red),
            stone(-1, 0, Player::Blue),
            stone(1, 0, Player::Blue),
        ],
        Player::Red,
        vec![],
    );
    let result = place_stone(&initial, Point { x: 0, y: 0 });
    assert_eq!(result.captures.len(), 2);
    assert_eq!(result.score.red, 2);
}

#[test]
fn outer_capture_removes_multiple_nested_opponent_captures() {
    let first_boundary = diamond(-2, 0, 1, Player::Blue);
    let second_boundary = diamond(2, 0, 1, Player::Blue);
    let first_red = stone(-2, 0, Player::Red);
    let second_red = stone(2, 0, Player::Red);
    let captures = vec![
        Capture {
            owner: Player::Blue,
            boundary: first_boundary.iter().copied().map(Stone::point).collect(),
            captured: vec![first_red],
        },
        Capture {
            owner: Player::Blue,
            boundary: second_boundary.iter().copied().map(Stone::point).collect(),
            captured: vec![second_red],
        },
    ];
    let outer = diamond(0, 0, 5, Player::Red);
    let closing = outer.last().expect("closing").point();
    let mut stones = first_boundary;
    stones.extend(second_boundary);
    stones.push(first_red);
    stones.push(second_red);
    stones.extend_from_slice(&outer[..outer.len() - 1]);
    let result = place_stone(&state_with(stones, Player::Red, captures), closing);
    assert_eq!(result.captures.len(), 1);
    assert_eq!(result.captures[0].owner, Player::Red);
    assert_eq!(result.score, Score { red: 8, blue: 0 });
}

#[test]
fn moves_inside_active_capture_are_blocked() {
    let boundary = diamond(0, 0, 2, Player::Red);
    let closing = boundary.last().expect("closing").point();
    let mut stones = boundary[..boundary.len() - 1].to_vec();
    stones.push(stone(0, 0, Player::Blue));
    let captured = place_stone(&state_with(stones, Player::Red, vec![]), closing);
    assert_eq!(place_stone(&captured, Point { x: 0, y: 1 }), captured);
}

#[test]
fn expensive_ai_profiles_shrink_on_large_positions() {
    for difficulty in [AiDifficulty::Normal, AiDifficulty::Hard, AiDifficulty::Expert] {
        let small = get_ai_search_profile(difficulty, 20);
        let large = get_ai_search_profile(difficulty, 300);
        assert!(large.primary_limit <= small.primary_limit);
        assert!(large.reply_limit <= small.reply_limit);
        assert!(large.continuation_limit <= small.continuation_limit);
        assert!(large.final_reply_limit <= small.final_reply_limit);
    }
}

#[test]
fn ai_blocks_immediate_closing_point_from_normal_upward() {
    let state = state_with(
        vec![
            stone(0, -1, Player::Red),
            stone(1, 0, Player::Red),
            stone(0, 1, Player::Red),
            stone(0, 0, Player::Blue),
        ],
        Player::Blue,
        vec![],
    );
    for difficulty in [AiDifficulty::Normal, AiDifficulty::Hard, AiDifficulty::Expert] {
        let move_point = choose_ai_move(
            &state,
            &AiMoveOptions {
                player: Some(Player::Blue),
                focus: Some(Point { x: 0, y: 1 }),
                difficulty: Some(difficulty),
                ..AiMoveOptions::default()
            },
        );
        assert_eq!(move_point, Some(Point { x: -1, y: 0 }));
    }
}

#[test]
fn expert_search_is_bounded_on_large_sparse_position() {
    let stones: Vec<Stone> = (0..300)
        .map(|index| {
            stone(
                index * 3,
                (index % 7) * 3,
                if index % 2 == 0 { Player::Red } else { Player::Blue },
            )
        })
        .collect();
    let focus = stones.last().expect("focus").point();
    let state = state_with(stones, Player::Blue, vec![]);
    let move_point = choose_ai_move(
        &state,
        &AiMoveOptions {
            player: Some(Player::Blue),
            focus: Some(focus),
            difficulty: Some(AiDifficulty::Expert),
            ..AiMoveOptions::default()
        },
    )
    .expect("AI move");
    assert_ne!(place_stone(&state, move_point), state);
}

#[test]
fn tactical_tb01_converts_two_target_capture() {
    let state = state_with(
        vec![
            stone(-1, -1, Player::Blue),
            stone(-2, 0, Player::Blue),
            stone(-1, 1, Player::Blue),
            stone(1, -1, Player::Blue),
            stone(2, 0, Player::Blue),
            stone(1, 1, Player::Blue),
            stone(-1, 0, Player::Red),
            stone(1, 0, Player::Red),
        ],
        Player::Blue,
        vec![],
    );
    let result = place_stone(&state, expert_move(&state, Some(Point { x: 1, y: 0 })));
    assert_eq!(result.score, Score { red: 0, blue: 2 });
}

#[test]
fn tactical_tb02_blocks_only_immediate_opponent_close() {
    let state = state_with(
        vec![
            stone(0, -1, Player::Red),
            stone(1, 0, Player::Red),
            stone(0, 1, Player::Red),
            stone(0, 0, Player::Blue),
        ],
        Player::Blue,
        vec![],
    );
    let move_point = expert_move(&state, Some(Point { x: 0, y: 1 }));
    assert_eq!(move_point, Point { x: -1, y: 0 });
    assert_eq!(max_immediate_gain(&place_stone(&state, move_point), Player::Red), 0);
}

#[test]
fn tactical_tb03_ignores_empty_false_closure() {
    let state = state_with(
        vec![
            stone(0, -1, Player::Red),
            stone(1, 0, Player::Red),
            stone(0, 1, Player::Red),
            stone(0, 0, Player::Blue),
            stone(10, -1, Player::Blue),
            stone(11, 0, Player::Blue),
            stone(10, 1, Player::Blue),
        ],
        Player::Blue,
        vec![],
    );
    let move_point = expert_move(&state, Some(Point { x: 10, y: 1 }));
    let result = place_stone(&state, move_point);
    assert_eq!(move_point, Point { x: -1, y: 0 });
    assert_eq!(result.score, Score { red: 0, blue: 0 });
    assert_eq!(max_immediate_gain(&result, Player::Red), 0);
}

#[test]
fn tactical_tb04_avoids_hostile_empty_house() {
    let mut stones = diamond(0, 0, 2, Player::Red);
    stones.push(stone(5, 0, Player::Blue));
    let state = state_with(stones, Player::Blue, vec![]);
    let move_point = expert_move(&state, Some(Point { x: 0, y: 0 }));
    let result = place_stone(&state, move_point);
    assert_ne!(move_point, Point { x: 0, y: 0 });
    assert_eq!(result.score.red, 0);
}

#[test]
fn tactical_tb05_counter_captures_when_two_threats_cannot_both_be_blocked() {
    let state = state_with(
        vec![
            stone(0, -1, Player::Blue),
            stone(1, 0, Player::Blue),
            stone(0, 1, Player::Blue),
            stone(0, 0, Player::Red),
            stone(-10, -1, Player::Red),
            stone(-9, 0, Player::Red),
            stone(-10, 1, Player::Red),
            stone(-10, 0, Player::Blue),
            stone(10, -1, Player::Red),
            stone(11, 0, Player::Red),
            stone(10, 1, Player::Red),
            stone(10, 0, Player::Blue),
        ],
        Player::Blue,
        vec![],
    );
    let move_point = expert_move(&state, Some(Point { x: 10, y: 1 }));
    let result = place_stone(&state, move_point);
    assert_eq!(move_point, Point { x: -1, y: 0 });
    assert_eq!(result.score.blue, 1);
    assert!(max_immediate_gain(&result, Player::Red) > 0);
}

#[test]
fn tactical_tb06_releases_held_stone_with_outer_capture() {
    let blue_boundary = diamond(0, 0, 1, Player::Blue);
    let red_center = stone(0, 0, Player::Red);
    let blue_capture = Capture {
        owner: Player::Blue,
        boundary: blue_boundary.iter().copied().map(Stone::point).collect(),
        captured: vec![red_center],
    };
    let red_outer = diamond(0, 0, 2, Player::Red);
    let closing = red_outer.last().expect("closing").point();
    let mut stones = blue_boundary;
    stones.push(red_center);
    stones.extend_from_slice(&red_outer[..red_outer.len() - 1]);
    let state = state_with(stones, Player::Red, vec![blue_capture]);
    let move_point = expert_move(&state, Some(closing));
    let result = place_stone(&state, move_point);
    assert_eq!(move_point, closing);
    assert_eq!(result.score, Score { red: 4, blue: 0 });
    assert_eq!(result.captures.len(), 1);
    assert_eq!(result.captures[0].owner, Player::Red);
}

fn run_ai_match(red: AiDifficulty, blue: AiDifficulty, max_moves: usize) -> (GameState, Vec<Point>) {
    let mut state = GameState::new();
    let mut moves = Vec::new();
    let mut focus = None;
    while moves.len() < max_moves {
        let difficulty = if state.current_player == Player::Red { red } else { blue };
        let point = choose_ai_move(
            &state,
            &AiMoveOptions {
                player: Some(state.current_player),
                focus,
                difficulty: Some(difficulty),
                ..AiMoveOptions::default()
            },
        )
        .expect("AI move");
        let next = place_stone(&state, point);
        assert_ne!(next, state);
        state = next;
        focus = Some(point);
        moves.push(point);
    }
    (state, moves)
}

fn paired_match_margin(stronger: AiDifficulty, weaker: AiDifficulty, max_moves: usize) -> i64 {
    let (as_red, _) = run_ai_match(stronger, weaker, max_moves);
    let (as_blue, _) = run_ai_match(weaker, stronger, max_moves);
    as_red.score.red as i64 - as_red.score.blue as i64
        + as_blue.score.blue as i64
        - as_blue.score.red as i64
}

#[test]
fn ai_match_is_deterministic_and_legal() {
    let (first_state, first_moves) = run_ai_match(AiDifficulty::Expert, AiDifficulty::Hard, 6);
    let (second_state, second_moves) = run_ai_match(AiDifficulty::Expert, AiDifficulty::Hard, 6);
    assert_eq!(first_moves, second_moves);
    assert_eq!(first_state.score, second_state.score);
    assert_eq!(first_state.stones.len(), 6);
}

#[test]
fn expert_keeps_positive_aggregate_paired_margin() {
    let vs_normal = paired_match_margin(AiDifficulty::Expert, AiDifficulty::Normal, 8);
    let vs_hard = paired_match_margin(AiDifficulty::Expert, AiDifficulty::Hard, 8);
    assert!(vs_normal >= 0);
    assert!(vs_hard >= 0);
    assert!(vs_normal + vs_hard > 0);
}

#[test]
fn state_index_rebuild_is_consistent() {
    let stones = vec![stone(1, 2, Player::Red), stone(3, 4, Player::Blue)];
    let state = state_with(stones.clone(), Player::Red, vec![]);
    let indexed: HashMap<Point, Player> = stones
        .into_iter()
        .map(|item| (item.point(), item.player))
        .collect();
    for (point, player) in indexed {
        assert_eq!(state.stone_at(point).map(|item| item.player), Some(player));
    }
}
