use crate::types::{Capture, GameState, Player, Point, Score, Stone};
use std::collections::{HashMap, HashSet};
use std::f64::consts::PI;

#[derive(Clone)]
struct Face {
    area: f64,
    boundary: Vec<Point>,
    key: String,
}

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

fn point_key(point: Point) -> String {
    format!("{}:{}", point.x, point.y)
}

fn edge_key(a: Point, b: Point) -> String {
    format!("{}>{}", point_key(a), point_key(b))
}

fn math_angle(from: Point, to: Point) -> f64 {
    (-(to.y - from.y) as f64).atan2((to.x - from.x) as f64)
}

fn clockwise_delta(from: f64, to: f64) -> f64 {
    let full = PI * 2.0;
    let delta = (from - to).rem_euclid(full);
    if delta < 1e-9 {
        full
    } else {
        delta
    }
}

fn signed_math_area(polygon: &[Point]) -> f64 {
    let mut doubled = 0.0;
    for index in 0..polygon.len() {
        let current = polygon[index];
        let next = polygon[(index + 1) % polygon.len()];
        doubled += current.x as f64 * -(next.y as f64) - next.x as f64 * -(current.y as f64);
    }
    doubled / 2.0
}

fn cross(a: Point, b: Point, c: Point) -> i128 {
    (b.x - a.x) as i128 * (c.y - a.y) as i128 - (b.y - a.y) as i128 * (c.x - a.x) as i128
}

fn on_segment(a: Point, b: Point, point: Point) -> bool {
    a.x.min(b.x) <= point.x
        && point.x <= a.x.max(b.x)
        && a.y.min(b.y) <= point.y
        && point.y <= a.y.max(b.y)
}

fn point_on_polygon_boundary(point: Point, polygon: &[Point]) -> bool {
    if polygon.is_empty() {
        return false;
    }
    for index in 0..polygon.len() {
        let current = polygon[index];
        let next = polygon[(index + 1) % polygon.len()];
        if cross(current, next, point) == 0 && on_segment(current, next, point) {
            return true;
        }
    }
    false
}

fn segments_intersect(a: Point, b: Point, c: Point, d: Point) -> bool {
    let ab_c = cross(a, b, c);
    let ab_d = cross(a, b, d);
    let cd_a = cross(c, d, a);
    let cd_b = cross(c, d, b);

    if ab_c == 0 && on_segment(a, b, c) {
        return true;
    }
    if ab_d == 0 && on_segment(a, b, d) {
        return true;
    }
    if cd_a == 0 && on_segment(c, d, a) {
        return true;
    }
    if cd_b == 0 && on_segment(c, d, b) {
        return true;
    }

    (ab_c > 0) != (ab_d > 0) && (cd_a > 0) != (cd_b > 0)
}

fn is_simple_polygon(polygon: &[Point]) -> bool {
    let keys: HashSet<Point> = polygon.iter().copied().collect();
    if keys.len() != polygon.len() {
        return false;
    }

    for first in 0..polygon.len() {
        let first_next = (first + 1) % polygon.len();
        for second in first + 1..polygon.len() {
            let second_next = (second + 1) % polygon.len();
            if first == second || first_next == second || second_next == first {
                continue;
            }
            if first == 0 && second_next == 0 {
                continue;
            }
            if segments_intersect(
                polygon[first],
                polygon[first_next],
                polygon[second],
                polygon[second_next],
            ) {
                return false;
            }
        }
    }

    true
}

fn canonical_boundary_key(boundary: &[Point]) -> String {
    fn encode(points: &[Point]) -> String {
        points
            .iter()
            .map(|point| point_key(*point))
            .collect::<Vec<_>>()
            .join("|")
    }

    let mut variants = Vec::with_capacity(boundary.len() * 2);
    for reverse in [false, true] {
        let mut points = boundary.to_vec();
        if reverse {
            points.reverse();
        }
        for offset in 0..points.len() {
            let mut rotated = points[offset..].to_vec();
            rotated.extend_from_slice(&points[..offset]);
            variants.push(encode(&rotated));
        }
    }
    variants.sort();
    variants.into_iter().next().unwrap_or_default()
}

fn captured_keys(captures: &[Capture]) -> HashSet<Point> {
    captures
        .iter()
        .flat_map(|capture| capture.captured.iter().map(|stone| stone.point()))
        .collect()
}

pub fn point_in_polygon(point: Point, polygon: &[Point]) -> bool {
    if polygon.is_empty() || point_on_polygon_boundary(point, polygon) {
        return false;
    }

    let mut inside = false;
    let mut previous = polygon.len() - 1;
    for current in 0..polygon.len() {
        let a = polygon[current];
        let b = polygon[previous];
        let crosses = (a.y > point.y) != (b.y > point.y)
            && point.x as f64
                < (b.x - a.x) as f64 * (point.y - a.y) as f64 / (b.y - a.y) as f64
                    + a.x as f64;
        if crosses {
            inside = !inside;
        }
        previous = current;
    }
    inside
}

fn point_in_or_on_polygon(point: Point, polygon: &[Point]) -> bool {
    point_on_polygon_boundary(point, polygon) || point_in_polygon(point, polygon)
}

pub fn point_inside_capture(point: Point, capture: &Capture) -> bool {
    point_in_polygon(point, &capture.boundary)
}

pub fn point_inside_any_capture(point: Point, captures: &[Capture]) -> bool {
    captures.iter().any(|capture| point_inside_capture(point, capture))
}

fn next_neighbor(previous: Point, current: Point, neighbors: &[Point]) -> Option<Point> {
    let reverse_angle = math_angle(current, previous);
    let mut best = None;
    let mut best_delta = f64::INFINITY;

    for candidate in neighbors {
        let delta = clockwise_delta(reverse_angle, math_angle(current, *candidate));
        if delta < best_delta {
            best = Some(*candidate);
            best_delta = delta;
        }
    }

    best
}

fn extract_faces(state: &GameState, owner: Player, excluded: &HashSet<Point>) -> Vec<Face> {
    let owner_stones: Vec<Stone> = state
        .stones
        .iter()
        .copied()
        .filter(|stone| stone.player == owner && !excluded.contains(&stone.point()))
        .collect();
    let by_point: HashMap<Point, Stone> = owner_stones.iter().copied().map(|stone| (stone.point(), stone)).collect();
    let mut neighbors: HashMap<Point, Vec<Point>> = HashMap::new();

    for stone in &owner_stones {
        let mut adjacent = Vec::new();
        for (dx, dy) in OFFSETS {
            let point = Point {
                x: stone.x + dx,
                y: stone.y + dy,
            };
            if by_point.contains_key(&point) {
                adjacent.push(point);
            }
        }
        neighbors.insert(stone.point(), adjacent);
    }

    let directed_edge_count: usize = neighbors.values().map(Vec::len).sum();
    let mut visited: HashSet<String> = HashSet::new();
    let mut faces: HashMap<String, Face> = HashMap::new();

    for start in &owner_stones {
        let start_point = start.point();
        for first in neighbors.get(&start_point).into_iter().flatten() {
            let start_edge = edge_key(start_point, *first);
            if visited.contains(&start_edge) {
                continue;
            }

            let mut previous = start_point;
            let mut current = *first;
            let mut local_edges = HashSet::new();
            let mut boundary = Vec::new();
            let mut closed = false;

            for _ in 0..=directed_edge_count + 1 {
                let current_edge = edge_key(previous, current);
                if local_edges.contains(&current_edge) {
                    closed = current_edge == start_edge;
                    break;
                }

                local_edges.insert(current_edge.clone());
                visited.insert(current_edge);
                boundary.push(previous);

                let following = neighbors
                    .get(&current)
                    .and_then(|items| next_neighbor(previous, current, items));
                let Some(following) = following else {
                    break;
                };

                previous = current;
                current = following;
                if edge_key(previous, current) == start_edge {
                    closed = true;
                    break;
                }
            }

            if !closed || boundary.len() < 3 || !is_simple_polygon(&boundary) {
                continue;
            }

            let area = signed_math_area(&boundary);
            if area <= 0.0 {
                continue;
            }

            let key = canonical_boundary_key(&boundary);
            faces.insert(
                key.clone(),
                Face {
                    area,
                    boundary,
                    key,
                },
            );
        }
    }

    let mut result: Vec<Face> = faces.into_values().collect();
    result.sort_by(|a, b| {
        a.area
            .partial_cmp(&b.area)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.key.cmp(&b.key))
    });
    result
}

fn capture_for_face(
    face: &Face,
    state: &GameState,
    owner: Player,
    excluded: &HashSet<Point>,
) -> Option<Capture> {
    let captured: Vec<Stone> = state
        .stones
        .iter()
        .copied()
        .filter(|stone| {
            stone.player != owner
                && !excluded.contains(&stone.point())
                && point_in_polygon(stone.point(), &face.boundary)
        })
        .collect();

    (!captured.is_empty()).then(|| Capture {
        owner,
        boundary: face.boundary.clone(),
        captured,
    })
}

pub fn find_new_captures(
    state: &GameState,
    existing_captures: &[Capture],
    owner: Player,
    closing_point: Point,
) -> Vec<Capture> {
    let excluded = captured_keys(existing_captures);
    let faces: Vec<Face> = extract_faces(state, owner, &excluded)
        .into_iter()
        .filter(|face| face.boundary.contains(&closing_point))
        .collect();
    let mut groups: Vec<(String, Capture)> = Vec::new();

    for stone in &state.stones {
        if stone.player == owner || excluded.contains(&stone.point()) {
            continue;
        }
        let Some(face) = faces
            .iter()
            .find(|candidate| point_in_polygon(stone.point(), &candidate.boundary))
        else {
            continue;
        };

        if let Some((_, capture)) = groups.iter_mut().find(|(key, _)| *key == face.key) {
            capture.captured.push(*stone);
        } else {
            groups.push((
                face.key.clone(),
                Capture {
                    owner,
                    boundary: face.boundary.clone(),
                    captured: vec![*stone],
                },
            ));
        }
    }

    groups.into_iter().map(|(_, capture)| capture).collect()
}

pub fn find_house_capture(
    state: &GameState,
    existing_captures: &[Capture],
    owner: Player,
    intruder: Stone,
) -> Option<Capture> {
    if intruder.player == owner {
        return None;
    }

    let excluded = captured_keys(existing_captures);
    if excluded.contains(&intruder.point()) {
        return None;
    }

    extract_faces(state, owner, &excluded)
        .iter()
        .find(|candidate| point_in_polygon(intruder.point(), &candidate.boundary))
        .and_then(|face| capture_for_face(face, state, owner, &excluded))
}

fn capture_contains_capture(outer: &Capture, inner: &Capture) -> bool {
    inner
        .boundary
        .iter()
        .all(|point| point_in_or_on_polygon(*point, &outer.boundary))
}

fn same_capture_boundary(a: &Capture, b: &Capture) -> bool {
    a.owner == b.owner && canonical_boundary_key(&a.boundary) == canonical_boundary_key(&b.boundary)
}

pub fn apply_captures(existing_captures: &[Capture], new_captures: &[Capture]) -> Vec<Capture> {
    let mut active = existing_captures.to_vec();

    for capture in new_captures {
        active.retain(|existing| {
            !same_capture_boundary(existing, capture)
                && (existing.owner == capture.owner || !capture_contains_capture(capture, existing))
        });
        active.push(capture.clone());
    }

    active
}

pub fn resolve_captures_after_move(
    state: &GameState,
    existing_captures: &[Capture],
    player: Player,
    closing_point: Point,
) -> Vec<Capture> {
    let direct = find_new_captures(state, existing_captures, player, closing_point);
    if !direct.is_empty() {
        return apply_captures(existing_captures, &direct);
    }

    let opponent = player.other();
    let Some(intruder) = state.stone_at(closing_point).copied() else {
        return existing_captures.to_vec();
    };

    match find_house_capture(state, existing_captures, opponent, intruder) {
        Some(house) => apply_captures(existing_captures, &[house]),
        None => existing_captures.to_vec(),
    }
}

pub fn score_captures(captures: &[Capture]) -> Score {
    let mut red = HashSet::new();
    let mut blue = HashSet::new();

    for capture in captures {
        let target = if capture.owner == Player::Red {
            &mut red
        } else {
            &mut blue
        };
        for stone in &capture.captured {
            target.insert(stone.point());
        }
    }

    Score {
        red: red.len(),
        blue: blue.len(),
    }
}
