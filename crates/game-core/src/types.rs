use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const MAX_SAFE_INTEGER: i64 = 9_007_199_254_740_991;

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Player {
    Red,
    Blue,
}

impl Player {
    pub const fn other(self) -> Self {
        match self {
            Self::Red => Self::Blue,
            Self::Blue => Self::Red,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub struct Point {
    pub x: i64,
    pub y: i64,
}

impl Point {
    pub const fn is_safe(self) -> bool {
        self.x >= -MAX_SAFE_INTEGER
            && self.x <= MAX_SAFE_INTEGER
            && self.y >= -MAX_SAFE_INTEGER
            && self.y <= MAX_SAFE_INTEGER
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub struct Stone {
    pub x: i64,
    pub y: i64,
    pub player: Player,
}

impl Stone {
    pub const fn point(self) -> Point {
        Point {
            x: self.x,
            y: self.y,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Capture {
    pub owner: Player,
    pub boundary: Vec<Point>,
    pub captured: Vec<Stone>,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct Score {
    pub red: usize,
    pub blue: usize,
}

impl Score {
    pub const fn get(self, player: Player) -> usize {
        match player {
            Player::Red => self.red,
            Player::Blue => self.blue,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameState {
    pub current_player: Player,
    pub stones: Vec<Stone>,
    pub captures: Vec<Capture>,
    pub score: Score,
    #[serde(skip)]
    pub(crate) stone_index: HashMap<Point, usize>,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            current_player: Player::Red,
            stones: Vec::new(),
            captures: Vec::new(),
            score: Score::default(),
            stone_index: HashMap::new(),
        }
    }

    pub fn rebuild_index(&mut self) {
        self.stone_index = self
            .stones
            .iter()
            .enumerate()
            .map(|(index, stone)| (stone.point(), index))
            .collect();
    }

    pub fn has_stone(&self, point: Point) -> bool {
        self.stone_index.contains_key(&point)
    }

    pub fn stone_at(&self, point: Point) -> Option<&Stone> {
        self.stone_index
            .get(&point)
            .and_then(|index| self.stones.get(*index))
    }

    pub fn push_stone(&mut self, stone: Stone) {
        let index = self.stones.len();
        self.stone_index.insert(stone.point(), index);
        self.stones.push(stone);
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AiDifficulty {
    Easy,
    #[default]
    Normal,
    Hard,
    Expert,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMoveOptions {
    pub player: Option<Player>,
    pub focus: Option<Point>,
    pub difficulty: Option<AiDifficulty>,
    pub primary_limit: Option<usize>,
    pub reply_limit: Option<usize>,
    pub continuation_limit: Option<usize>,
    pub final_reply_limit: Option<usize>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSearchProfile {
    pub primary_limit: usize,
    pub reply_limit: usize,
    pub continuation_limit: usize,
    pub final_reply_limit: usize,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyMoveResult {
    pub changed: bool,
    pub state: GameState,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayMovesResult {
    pub valid: bool,
    pub state: Option<GameState>,
}
