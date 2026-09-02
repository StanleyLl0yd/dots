use crate::board::place_stone;
use crate::types::{AiDifficulty, AiMoveOptions, AiSearchProfile, GameState, Player, Point, Stone};
use std::collections::{HashMap, HashSet};

#[derive(Clone)]
struct CandidateSeed {
    point: Point,
    score: f64,
    own_cycle_pairs: usize,
    blocked_cycle_pairs: usize,
}

#[derive(Clone)]
struct RankedMove {
    seed: CandidateSeed,
    state: GameState,
    tactical_score: f64,
}

#[derive(Clone, Default)]
struct CaptureThreat {
    best_gain: i64,
    moves: usize,
    targets: HashSet<Point>,
}

#[derive(Clone)]
struct Components {
    red: HashMap<Point, usize>,
    blue: HashMap<Point, usize>,
}

struct SearchContext {
    difficulty: AiDifficulty,
    evaluation_cache: HashMap<String, f64>,
    search_cache: HashMap<String, f64>,
    inactive_cache: HashMap<String, HashSet<Point>>,
    component_cache: HashMap<String, Components>,
    closure_cache: HashMap<String, f64>,
    threat_cache: HashMap<String, CaptureThreat>,
    setup_cache: HashMap<String, f64>,
}

impl SearchContext {
    fn new(difficulty: AiDifficulty) -> Self {
        Self {
            difficulty,
            evaluation_cache: HashMap::new(),
            search_cache: HashMap::new(),
            inactive_cache: HashMap::new(),
            component_cache: HashMap::new(),
            closure_cache: HashMap::new(),
            threat_cache: HashMap::new(),
            setup_cache: HashMap::new(),
        }
    }
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

const LINK_OFFSETS: [(i64, i64); 4] = [(1, 0), (0, 1), (1, 1), (-1, 1)];

fn player_code(player: Player) -> &'static str {
    match player {
        Player::Red => "red",
        Player::Blue => "blue",
    }
}

fn difficulty_code(difficulty: AiDifficulty) -> &'static str {
    match difficulty {
        AiDifficulty::Easy => "easy",
        AiDifficulty::Normal => "normal",
        AiDifficulty::Hard => "hard",
        AiDifficulty::Expert => "expert",
    }
}

fn point_key(point: Point) -> String {
    format!("{}:{}", point.x, point.y)
}

fn state_signature(state: &GameState) -> String {
    let mut stones: Vec<String> = state
        .stones
        .iter()
        .map(|stone| {
            format!(
                "{},{},{}",
                stone.x,
                stone.y,
                if stone.player == Player::Red { "r" } else { "b" }
            )
        })
        .collect();
    stones.sort();

    let mut captures: Vec<String> = state
        .captures
        .iter()
        .map(|capture| {
            let boundary = capture
                .boundary
                .iter()
                .map(|point| format!("{},{}", point.x, point.y))
                .collect::<Vec<_>>()
                .join(";");
            let mut captured = capture
                .captured
                .iter()
                .map(|stone| point_key(stone.point()))
                .collect::<Vec<_>>();
            captured.sort();
            format!(
                "{}|{}|{}",
                player_code(capture.owner),
                boundary,
                captured.join(";")
            )
        })
        .collect();
    captures.sort();

    format!(
        "{}|{},{}|{}|{}",
        player_code(state.current_player),
        state.score.red,
        state.score.blue,
        stones.join(";"),
        captures.join("/")
    )
}

fn inactive_stone_keys(state: &GameState, context: &mut SearchContext) -> HashSet<Point> {
    let signature = state_signature(state);
    if let Some(cached) = context.inactive_cache.get(&signature) {
        return cached.clone();
    }
    let inactive = state
        .captures
        .iter()
        .flat_map(|capture| capture.captured.iter().map(|stone| stone.point()))
        .collect::<HashSet<_>>();
    context.inactive_cache.insert(signature, inactive.clone());
    inactive
}

fn active_stone_at<'a>(state: &'a GameState, inactive: &HashSet<Point>, point: Point) -> Option<&'a Stone> {
    state
        .stone_at(point)
        .filter(|stone| !inactive.contains(&stone.point()))
}

fn build_components(
    state: &GameState,
    player: Player,
    inactive: &HashSet<Point>,
) -> HashMap<Point, usize> {
    let active: HashMap<Point, Stone> = state
        .stones
        .iter()
        .copied()
        .filter(|stone| stone.player == player && !inactive.contains(&stone.point()))
        .map(|stone| (stone.point(), stone))
        .collect();
    let mut components = HashMap::new();
    let mut next_component = 0usize;

    for stone in active.values() {
        let start = stone.point();
        if components.contains_key(&start) {
            continue;
        }
        let component = next_component;
        next_component += 1;
        let mut queue = vec![*stone];
        components.insert(start, component);

        while let Some(current) = queue.pop() {
            for (dx, dy) in OFFSETS {
                let point = Point {
                    x: current.x + dx,
                    y: current.y + dy,
                };
                let Some(neighbor) = active.get(&point) else {
                    continue;
                };
                if components.contains_key(&point) {
                    continue;
                }
                components.insert(point, component);
                queue.push(*neighbor);
            }
        }
    }

    components
}

fn components_for(
    state: &GameState,
    player: Player,
    context: &mut SearchContext,
) -> HashMap<Point, usize> {
    let signature = state_signature(state);
    if !context.component_cache.contains_key(&signature) {
        let inactive = inactive_stone_keys(state, context);
        context.component_cache.insert(
            signature.clone(),
            Components {
                red: build_components(state, Player::Red, &inactive),
                blue: build_components(state, Player::Blue, &inactive),
            },
        );
    }
    let cached = context.component_cache.get(&signature).expect("component cache");
    match player {
        Player::Red => cached.red.clone(),
        Player::Blue => cached.blue.clone(),
    }
}

fn neighbor_counts(
    state: &GameState,
    inactive: &HashSet<Point>,
    point: Point,
    player: Player,
) -> (usize, usize, usize) {
    let mut own = 0;
    let mut opponent = 0;
    let mut empty = 0;

    for (dx, dy) in OFFSETS {
        let target = Point {
            x: point.x + dx,
            y: point.y + dy,
        };
        match active_stone_at(state, inactive, target) {
            Some(stone) if stone.player == player => own += 1,
            Some(_) => opponent += 1,
            None if !state.has_stone(target) => empty += 1,
            None => {}
        }
    }

    (own, opponent, empty)
}

fn cycle_pair_count(
    state: &GameState,
    point: Point,
    player: Player,
    context: &mut SearchContext,
) -> usize {
    if state.has_stone(point) {
        return 0;
    }
    let inactive = inactive_stone_keys(state, context);
    let components = components_for(state, player, context);
    let mut adjacent_components = Vec::new();

    for (dx, dy) in OFFSETS {
        let target = Point {
            x: point.x + dx,
            y: point.y + dy,
        };
        let Some(neighbor) = active_stone_at(state, &inactive, target) else {
            continue;
        };
        if neighbor.player != player {
            continue;
        }
        if let Some(component) = components.get(&target) {
            adjacent_components.push(*component);
        }
    }

    let mut pairs = 0;
    for first in 0..adjacent_components.len() {
        for second in first + 1..adjacent_components.len() {
            if adjacent_components[first] == adjacent_components[second] {
                pairs += 1;
            }
        }
    }
    pairs
}

fn focus_distance(point: Point, focus: Option<Point>) -> i64 {
    focus
        .map(|focus| (point.x - focus.x).abs().max((point.y - focus.y).abs()))
        .unwrap_or(0)
}

fn seed_score(
    state: &GameState,
    inactive: &HashSet<Point>,
    point: Point,
    player: Player,
    focus: Option<Point>,
    context: &mut SearchContext,
) -> CandidateSeed {
    let (own, opponent, _) = neighbor_counts(state, inactive, point, player);
    let own_cycle_pairs = cycle_pair_count(state, point, player, context);
    let blocked_cycle_pairs = cycle_pair_count(state, point, player.other(), context);
    let distance_penalty = focus_distance(point, focus).min(16) as f64 * 0.55;
    let score = own as f64 * 18.0
        + opponent as f64 * 13.0
        + if own >= 2 { 44.0 } else { 0.0 }
        + if opponent >= 2 { 38.0 } else { 0.0 }
        + if own >= 3 { 18.0 } else { 0.0 }
        + if opponent >= 3 { 18.0 } else { 0.0 }
        + own_cycle_pairs.min(3) as f64 * 52.0
        + blocked_cycle_pairs.min(3) as f64 * 46.0
        - distance_penalty;
    CandidateSeed {
        point,
        score,
        own_cycle_pairs,
        blocked_cycle_pairs,
    }
}

fn generate_seeds(
    state: &GameState,
    player: Player,
    focus: Option<Point>,
    context: &mut SearchContext,
) -> Vec<CandidateSeed> {
    let inactive = inactive_stone_keys(state, context);
    let mut points = HashSet::new();

    for stone in &state.stones {
        if inactive.contains(&stone.point()) {
            continue;
        }
        for (dx, dy) in OFFSETS {
            let point = Point {
                x: stone.x + dx,
                y: stone.y + dy,
            };
            if point.is_safe() && !state.has_stone(point) {
                points.insert(point);
            }
        }
    }

    if points.is_empty() {
        points.insert(Point { x: 0, y: 0 });
    }

    let mut seeds = points
        .into_iter()
        .map(|point| seed_score(state, &inactive, point, player, focus, context))
        .collect::<Vec<_>>();
    seeds.sort_by(|a, b| {
        b.score
            .total_cmp(&a.score)
            .then_with(|| focus_distance(a.point, focus).cmp(&focus_distance(b.point, focus)))
            .then_with(|| a.point.y.cmp(&b.point.y))
            .then_with(|| a.point.x.cmp(&b.point.x))
    });
    seeds
}

fn structure_score(state: &GameState, player: Player, context: &mut SearchContext) -> f64 {
    let inactive = inactive_stone_keys(state, context);
    let opponent = player.other();
    let mut own_links = 0usize;
    let mut opponent_links = 0usize;
    let mut own_active = 0usize;
    let mut opponent_active = 0usize;

    for stone in &state.stones {
        if inactive.contains(&stone.point()) {
            continue;
        }
        if stone.player == player {
            own_active += 1;
        } else {
            opponent_active += 1;
        }

        for (dx, dy) in LINK_OFFSETS {
            let target = Point {
                x: stone.x + dx,
                y: stone.y + dy,
            };
            let Some(neighbor) = active_stone_at(state, &inactive, target) else {
                continue;
            };
            if neighbor.player != stone.player {
                continue;
            }
            if stone.player == player {
                own_links += 1;
            } else if stone.player == opponent {
                opponent_links += 1;
            }
        }
    }

    (own_links as f64 - opponent_links as f64) * 3.0
        + (own_active as f64 - opponent_active as f64) * 0.2
}

fn danger_for(state: &GameState, player: Player, context: &mut SearchContext) -> f64 {
    let inactive = inactive_stone_keys(state, context);
    let mut total = 0.0;

    for stone in &state.stones {
        if stone.player != player || inactive.contains(&stone.point()) {
            continue;
        }
        let (own, opponent, empty) = neighbor_counts(state, &inactive, stone.point(), player);
        total += opponent as f64 * 7.0
            + (4usize.saturating_sub(empty)) as f64 * 2.5
            + if opponent >= 2 { 13.0 } else { 0.0 }
            + if opponent >= 3 { 18.0 } else { 0.0 }
            - own as f64 * 1.5;
    }

    total
}

fn closure_pressure(state: &GameState, player: Player, context: &mut SearchContext) -> f64 {
    let key = format!("{}|{}", player_code(player), state_signature(state));
    if let Some(cached) = context.closure_cache.get(&key) {
        return *cached;
    }

    let mut pressure = 0.0;
    for seed in generate_seeds(state, player, None, context).into_iter().take(24) {
        if seed.own_cycle_pairs > 0 {
            pressure += seed.own_cycle_pairs.min(3) as f64 * 2.0 + 1.0;
        }
    }
    let value = pressure.min(30.0);
    context.closure_cache.insert(key, value);
    value
}

fn evaluate_state(state: &GameState, player: Player, context: &mut SearchContext) -> f64 {
    let key = format!(
        "{}|{}|{}",
        difficulty_code(context.difficulty),
        player_code(player),
        state_signature(state)
    );
    if let Some(cached) = context.evaluation_cache.get(&key) {
        return *cached;
    }

    let opponent = player.other();
    let score_difference = state.score.get(player) as f64 - state.score.get(opponent) as f64;
    let mut value = score_difference * 100_000.0 + structure_score(state, player, context);
    let danger_difference = if context.difficulty == AiDifficulty::Easy {
        0.0
    } else {
        danger_for(state, opponent, context) - danger_for(state, player, context)
    };

    if context.difficulty != AiDifficulty::Easy {
        value += danger_difference * 1.4;
    }
    if matches!(context.difficulty, AiDifficulty::Hard | AiDifficulty::Expert) {
        value += (closure_pressure(state, player, context)
            - closure_pressure(state, opponent, context))
            * 10.0;
    }
    if context.difficulty == AiDifficulty::Expert {
        value += danger_difference * 0.9;
    }

    context.evaluation_cache.insert(key, value);
    value
}

fn force_turn(state: &GameState, player: Player) -> GameState {
    if state.current_player == player {
        state.clone()
    } else {
        let mut forced = state.clone();
        forced.current_player = player;
        forced
    }
}

fn captured_by(state: &GameState, owner: Player) -> HashSet<Point> {
    state
        .captures
        .iter()
        .filter(|capture| capture.owner == owner)
        .flat_map(|capture| capture.captured.iter().map(|stone| stone.point()))
        .collect()
}

fn immediate_capture_threat(
    state: &GameState,
    attacker: Player,
    limit: usize,
    context: &mut SearchContext,
) -> CaptureThreat {
    if limit == 0 {
        return CaptureThreat::default();
    }
    let key = format!(
        "{}|{}|{}",
        player_code(attacker),
        limit,
        state_signature(state)
    );
    if let Some(cached) = context.threat_cache.get(&key) {
        return cached.clone();
    }

    let forced = force_turn(state, attacker);
    let before_captured = captured_by(state, attacker);
    let mut threat = CaptureThreat::default();
    let mut considered = 0usize;

    for seed in generate_seeds(&forced, attacker, None, context) {
        let next = place_stone(&forced, seed.point);
        if next == forced {
            continue;
        }
        considered += 1;
        let opponent = attacker.other();
        let gain = next.score.get(attacker) as i64 - state.score.get(attacker) as i64
            + state.score.get(opponent) as i64
            - next.score.get(opponent) as i64;
        if gain > 0 {
            threat.moves += 1;
            threat.best_gain = threat.best_gain.max(gain);
            for captured in captured_by(&next, attacker) {
                if !before_captured.contains(&captured) {
                    threat.targets.insert(captured);
                }
            }
        }
        if considered >= limit {
            break;
        }
    }

    context.threat_cache.insert(key, threat.clone());
    threat
}

fn setup_potential(
    state: &GameState,
    attacker: Player,
    setup_limit: usize,
    closure_limit: usize,
    context: &mut SearchContext,
) -> f64 {
    if setup_limit == 0 || closure_limit == 0 {
        return 0.0;
    }
    let key = format!(
        "{}|{},{}|{}",
        player_code(attacker),
        setup_limit,
        closure_limit,
        state_signature(state)
    );
    if let Some(cached) = context.setup_cache.get(&key) {
        return *cached;
    }

    let forced = force_turn(state, attacker);
    let before_pressure = closure_pressure(state, attacker, context);
    let mut best: f64 = 0.0;
    let mut considered = 0usize;

    for seed in generate_seeds(&forced, attacker, None, context) {
        let next = place_stone(&forced, seed.point);
        if next == forced {
            continue;
        }
        considered += 1;
        let immediate_gain = next.score.get(attacker) as i64 - state.score.get(attacker) as i64;
        if immediate_gain <= 0 {
            let follow_up = immediate_capture_threat(&next, attacker, closure_limit, context);
            let pressure_gain = (closure_pressure(&next, attacker, context) - before_pressure).max(0.0);
            best = best.max(
                follow_up.best_gain as f64 * 700.0
                    + follow_up.moves as f64 * 55.0
                    + pressure_gain * 16.0
                    + seed.own_cycle_pairs as f64 * 12.0,
            );
        }
        if considered >= setup_limit {
            break;
        }
    }

    context.setup_cache.insert(key, best);
    best
}

fn forecast_bonus(state: &GameState, player: Player, context: &mut SearchContext) -> f64 {
    if matches!(context.difficulty, AiDifficulty::Easy | AiDifficulty::Normal) {
        return 0.0;
    }
    let opponent = player.other();
    let large = state.stones.len() >= 250;
    let threat_limit = if context.difficulty == AiDifficulty::Expert {
        if large { 2 } else { 5 }
    } else if large {
        2
    } else {
        4
    };
    let own_threat = immediate_capture_threat(state, player, threat_limit, context);
    let opponent_threat = immediate_capture_threat(state, opponent, threat_limit, context);
    let mut value = own_threat.best_gain as f64 * 2_200.0
        + own_threat.moves as f64 * 90.0
        - opponent_threat.best_gain as f64 * 2_700.0
        - opponent_threat.moves as f64 * 110.0
        - opponent_threat.targets.len() as f64 * 45.0;

    let setup_limit = if large {
        0
    } else if context.difficulty == AiDifficulty::Expert {
        3
    } else {
        2
    };
    let closure_limit = if large {
        0
    } else if context.difficulty == AiDifficulty::Expert {
        4
    } else {
        2
    };
    value += setup_potential(state, player, setup_limit, closure_limit, context) * 0.65;
    value -= setup_potential(state, opponent, setup_limit, closure_limit, context) * 0.72;
    value
}

fn ranked_moves(
    state: &GameState,
    player: Player,
    focus: Option<Point>,
    limit: usize,
    context: &mut SearchContext,
    forecast: bool,
) -> Vec<RankedMove> {
    if state.current_player != player || limit == 0 {
        return Vec::new();
    }
    let before = evaluate_state(state, player, context);
    let mut pool: Vec<(CandidateSeed, GameState)> = Vec::new();
    let scan_limit = if forecast && state.stones.len() < 80 {
        limit.max(32)
    } else if forecast && state.stones.len() < 250 {
        limit.max(16)
    } else {
        limit
    };
    let opponent = player.other();
    let mut considered = 0usize;

    for seed in generate_seeds(state, player, focus, context) {
        let next = place_stone(state, seed.point);
        if next == *state {
            continue;
        }
        considered += 1;
        let immediate_swing = next.score.get(player) as i64 - state.score.get(player) as i64
            + state.score.get(opponent) as i64
            - next.score.get(opponent) as i64;
        if pool.len() < limit || immediate_swing > 0 {
            pool.push((seed, next));
        }
        if considered >= scan_limit {
            break;
        }
    }

    let mut ranked = Vec::with_capacity(pool.len());
    for (seed, next) in pool {
        let strategic = if forecast {
            forecast_bonus(&next, player, context)
        } else {
            0.0
        };
        let tactical_score = evaluate_state(&next, player, context) - before
            + seed.score * 4.0
            + strategic
            + seed.own_cycle_pairs as f64 * 30.0
            + seed.blocked_cycle_pairs as f64 * 34.0;
        ranked.push(RankedMove {
            seed,
            state: next,
            tactical_score,
        });
    }

    ranked.sort_by(|a, b| {
        b.tactical_score
            .total_cmp(&a.tactical_score)
            .then_with(|| b.seed.score.total_cmp(&a.seed.score))
            .then_with(|| a.seed.point.y.cmp(&b.seed.point.y))
            .then_with(|| a.seed.point.x.cmp(&b.seed.point.x))
    });
    ranked.truncate(limit);
    ranked
}

fn tier(stone_count: usize) -> usize {
    if stone_count < 80 {
        0
    } else if stone_count < 250 {
        1
    } else {
        2
    }
}

pub fn get_ai_search_profile(difficulty: AiDifficulty, stone_count: usize) -> AiSearchProfile {
    let index = tier(stone_count);
    let profile: [[usize; 3]; 4] = match difficulty {
        AiDifficulty::Easy => [[4, 4, 3], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
        AiDifficulty::Normal => [[7, 6, 5], [3, 3, 2], [0, 0, 0], [0, 0, 0]],
        AiDifficulty::Hard => [[9, 8, 5], [4, 3, 2], [2, 2, 1], [0, 0, 0]],
        AiDifficulty::Expert => [[10, 9, 5], [5, 4, 2], [3, 2, 1], [2, 1, 1]],
    };
    AiSearchProfile {
        primary_limit: profile[0][index],
        reply_limit: profile[1][index],
        continuation_limit: profile[2][index],
        final_reply_limit: profile[3][index],
    }
}

fn forcing_moves(
    state: &GameState,
    focus: Option<Point>,
    limit: usize,
    context: &mut SearchContext,
) -> Vec<RankedMove> {
    let player = state.current_player;
    let opponent = player.other();
    let before_swing = state.score.get(player) as i64 - state.score.get(opponent) as i64;
    ranked_moves(state, player, focus, limit * 2, context, false)
        .into_iter()
        .filter(|candidate| {
            candidate.state.score.get(player) as i64 - candidate.state.score.get(opponent) as i64
                != before_swing
        })
        .take(limit)
        .collect()
}

fn quiescence_value(
    state: &GameState,
    perspective: Player,
    focus: Option<Point>,
    remaining: usize,
    context: &mut SearchContext,
    mut alpha: f64,
    mut beta: f64,
) -> f64 {
    if remaining == 0 {
        return evaluate_state(state, perspective, context);
    }
    let limit = if context.difficulty == AiDifficulty::Expert { 3 } else { 2 };
    let moves = forcing_moves(state, focus, limit, context);
    if moves.is_empty() {
        return evaluate_state(state, perspective, context);
    }

    let maximizing = state.current_player == perspective;
    let mut value = if maximizing { f64::NEG_INFINITY } else { f64::INFINITY };
    for candidate in moves {
        let child = quiescence_value(
            &candidate.state,
            perspective,
            Some(candidate.seed.point),
            remaining - 1,
            context,
            alpha,
            beta,
        );
        if maximizing {
            value = value.max(child);
            alpha = alpha.max(value);
        } else {
            value = value.min(child);
            beta = beta.min(value);
        }
        if beta <= alpha {
            break;
        }
    }
    value
}

#[allow(clippy::too_many_arguments)]
fn minimax_value(
    state: &GameState,
    perspective: Player,
    focus: Option<Point>,
    limits: &[usize],
    ply: usize,
    extensions: usize,
    context: &mut SearchContext,
    mut alpha: f64,
    mut beta: f64,
) -> f64 {
    if ply >= limits.len() || limits[ply] == 0 {
        return quiescence_value(state, perspective, focus, extensions, context, alpha, beta);
    }

    let remaining_limits = limits[ply..]
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",");
    let cache_key = format!(
        "{}|{}|{}|{}|{}",
        difficulty_code(context.difficulty),
        player_code(perspective),
        ply,
        remaining_limits,
        state_signature(state)
    );
    if let Some(cached) = context.search_cache.get(&cache_key) {
        return *cached;
    }

    let player = state.current_player;
    let forecast = context.difficulty == AiDifficulty::Expert && ply <= 1;
    let moves = ranked_moves(state, player, focus, limits[ply], context, forecast);
    if moves.is_empty() {
        return evaluate_state(state, perspective, context);
    }

    let maximizing = player == perspective;
    let mut value = if maximizing { f64::NEG_INFINITY } else { f64::INFINITY };
    let mut cutoff = false;
    for candidate in moves {
        let child = minimax_value(
            &candidate.state,
            perspective,
            Some(candidate.seed.point),
            limits,
            ply + 1,
            extensions,
            context,
            alpha,
            beta,
        );
        if maximizing {
            value = value.max(child);
            alpha = alpha.max(value);
        } else {
            value = value.min(child);
            beta = beta.min(value);
        }
        if beta <= alpha {
            cutoff = true;
            break;
        }
    }

    if !cutoff {
        context.search_cache.insert(cache_key, value);
    }
    value
}

pub fn choose_ai_move(state: &GameState, options: &AiMoveOptions) -> Option<Point> {
    let player = options.player.unwrap_or(state.current_player);
    if state.current_player != player {
        return None;
    }

    let difficulty = options.difficulty.unwrap_or_default();
    let profile = get_ai_search_profile(difficulty, state.stones.len());
    let limits = [
        options.primary_limit.unwrap_or(profile.primary_limit),
        options.reply_limit.unwrap_or(profile.reply_limit),
        options
            .continuation_limit
            .unwrap_or(profile.continuation_limit),
        options.final_reply_limit.unwrap_or(profile.final_reply_limit),
    ];
    let mut context = SearchContext::new(difficulty);
    let candidates = ranked_moves(
        state,
        player,
        options.focus,
        limits[0],
        &mut context,
        matches!(difficulty, AiDifficulty::Hard | AiDifficulty::Expert),
    );
    if candidates.is_empty() {
        return None;
    }

    let opponent = player.other();
    if difficulty == AiDifficulty::Expert {
        let mut immediate = candidates
            .iter()
            .filter_map(|candidate| {
                let gain = candidate.state.score.get(player) as i64 - state.score.get(player) as i64
                    + state.score.get(opponent) as i64
                    - candidate.state.score.get(opponent) as i64;
                (gain > 0 && candidate.state.score.get(opponent) <= state.score.get(opponent))
                    .then_some((candidate, gain))
            })
            .collect::<Vec<_>>();
        immediate.sort_by(|(a, gain_a), (b, gain_b)| {
            gain_b
                .cmp(gain_a)
                .then_with(|| b.tactical_score.total_cmp(&a.tactical_score))
                .then_with(|| b.seed.score.total_cmp(&a.seed.score))
                .then_with(|| a.seed.point.y.cmp(&b.seed.point.y))
                .then_with(|| a.seed.point.x.cmp(&b.seed.point.x))
        });
        if let Some((candidate, _)) = immediate.first() {
            return Some(candidate.seed.point);
        }
    }

    let extensions = if state.stones.len() >= 250 {
        if difficulty == AiDifficulty::Expert { 1 } else { 0 }
    } else if difficulty == AiDifficulty::Expert {
        2
    } else if difficulty == AiDifficulty::Hard {
        1
    } else {
        0
    };
    let safe_candidates = candidates
        .iter()
        .filter(|candidate| candidate.state.score.get(opponent) <= state.score.get(opponent))
        .cloned()
        .collect::<Vec<_>>();
    let search_candidates = if safe_candidates.is_empty() {
        candidates
    } else {
        safe_candidates
    };

    let mut best: Option<(Point, f64, f64)> = None;
    for candidate in search_candidates {
        let searched_value = minimax_value(
            &candidate.state,
            player,
            Some(candidate.seed.point),
            &limits,
            1,
            extensions,
            &mut context,
            f64::NEG_INFINITY,
            f64::INFINITY,
        );
        let value = searched_value + candidate.tactical_score * 0.04 + candidate.seed.score * 0.1;
        let replace = match best {
            None => true,
            Some((point, best_value, best_tactical)) => {
                value > best_value
                    || (value == best_value && candidate.tactical_score > best_tactical)
                    || (value == best_value
                        && candidate.tactical_score == best_tactical
                        && (candidate.seed.point.y < point.y
                            || (candidate.seed.point.y == point.y && candidate.seed.point.x < point.x)))
            }
        };
        if replace {
            best = Some((candidate.seed.point, value, candidate.tactical_score));
        }
    }

    best.map(|(point, _, _)| point)
}
