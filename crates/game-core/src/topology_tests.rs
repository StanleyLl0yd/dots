use crate::{
    capture::{apply_captures, find_house_capture, score_captures},
    place_stone, Capture, GameState, Player, Point, Score, Stone,
};

fn stone(x: i64, y: i64, player: Player) -> Stone {
    Stone { x, y, player }
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

#[test]
fn direct_mover_capture_has_priority_over_opponent_house() {
    let red_house = diamond(0, 0, 3, Player::Red);
    let mut stones = red_house;
    stones.extend([
        stone(0, -1, Player::Blue),
        stone(1, 0, Player::Blue),
        stone(-1, 0, Player::Blue),
        stone(0, 0, Player::Red),
    ]);
    let result = place_stone(
        &state_with(stones, Player::Blue, vec![]),
        Point { x: 0, y: 1 },
    );

    assert_eq!(result.captures.len(), 1);
    assert_eq!(result.captures[0].owner, Player::Blue);
    assert_eq!(result.captures[0].captured, vec![stone(0, 0, Player::Red)]);
}

#[test]
fn smallest_containing_house_activates_when_houses_are_nested() {
    let mut stones = diamond(0, 0, 2, Player::Red);
    stones.extend(diamond(0, 0, 4, Player::Red));
    let intruder = stone(0, 0, Player::Blue);
    stones.push(intruder);
    let state = state_with(stones, Player::Blue, vec![]);

    let capture = find_house_capture(&state, &[], Player::Red, intruder).expect("house capture");

    assert_eq!(capture.boundary.len(), 8);
    assert_eq!(capture.captured, vec![intruder]);
}

#[test]
fn partial_overlap_does_not_deactivate_opponent_capture() {
    let existing = Capture {
        owner: Player::Blue,
        boundary: vec![
            Point { x: 1, y: -1 },
            Point { x: 2, y: 0 },
            Point { x: 1, y: 1 },
            Point { x: 0, y: 0 },
        ],
        captured: vec![stone(1, 0, Player::Red)],
    };
    let outer = Capture {
        owner: Player::Red,
        boundary: vec![
            Point { x: 0, y: -1 },
            Point { x: 1, y: 0 },
            Point { x: 0, y: 1 },
            Point { x: -1, y: 0 },
        ],
        captured: vec![stone(0, 0, Player::Blue)],
    };

    let active = apply_captures(&[existing], &[outer]);
    assert_eq!(active.len(), 2);
    assert!(active.iter().any(|capture| capture.owner == Player::Blue));
    assert!(active.iter().any(|capture| capture.owner == Player::Red));
}

#[test]
fn dense_diagonal_ring_keeps_minimum_capture_face() {
    let mut stones = vec![
        stone(-1, -1, Player::Red),
        stone(0, -1, Player::Red),
        stone(1, -1, Player::Red),
        stone(-1, 0, Player::Red),
        stone(1, 0, Player::Red),
        stone(-1, 1, Player::Red),
        stone(1, 1, Player::Red),
    ];
    stones.push(stone(0, 0, Player::Blue));

    let result = place_stone(
        &state_with(stones, Player::Red, vec![]),
        Point { x: 0, y: 1 },
    );

    assert_eq!(result.score.red, 1);
    assert_eq!(result.captures.len(), 1);
    assert_eq!(result.captures[0].boundary.len(), 4);
}
