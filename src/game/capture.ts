import type { Capture, Player, Point, Stone } from "./types";

interface Face {
  area: number;
  boundary: Point[];
  key: string;
}

const OFFSETS: Point[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 }
];

const pointKey = ({ x, y }: Point): string => `${x}:${y}`;
const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const edgeKey = (a: Point, b: Point): string => `${pointKey(a)}>${pointKey(b)}`;

const mathAngle = (from: Point, to: Point): number => Math.atan2(-(to.y - from.y), to.x - from.x);

const clockwiseDelta = (from: number, to: number): number => {
  const full = Math.PI * 2;
  const delta = ((from - to) % full + full) % full;
  return delta < 1e-9 ? full : delta;
};

const signedMathArea = (polygon: Point[]): number => {
  let doubled = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    doubled += current.x * -next.y - next.x * -current.y;
  }
  return doubled / 2;
};

const cross = (a: Point, b: Point, c: Point): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const onSegment = (a: Point, b: Point, point: Point): boolean =>
  Math.min(a.x, b.x) <= point.x &&
  point.x <= Math.max(a.x, b.x) &&
  Math.min(a.y, b.y) <= point.y &&
  point.y <= Math.max(a.y, b.y);

const pointOnPolygonBoundary = (point: Point, polygon: Point[]): boolean => {
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (cross(current, next, point) === 0 && onSegment(current, next, point)) return true;
  }
  return false;
};

const segmentsIntersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);

  if (abC === 0 && onSegment(a, b, c)) return true;
  if (abD === 0 && onSegment(a, b, d)) return true;
  if (cdA === 0 && onSegment(c, d, a)) return true;
  if (cdB === 0 && onSegment(c, d, b)) return true;

  return (abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0);
};

const isSimplePolygon = (polygon: Point[]): boolean => {
  const keys = new Set(polygon.map(pointKey));
  if (keys.size !== polygon.length) return false;

  for (let first = 0; first < polygon.length; first += 1) {
    const firstNext = (first + 1) % polygon.length;
    for (let second = first + 1; second < polygon.length; second += 1) {
      const secondNext = (second + 1) % polygon.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (first === 0 && secondNext === 0) continue;
      if (segmentsIntersect(polygon[first], polygon[firstNext], polygon[second], polygon[secondNext])) return false;
    }
  }

  return true;
};

const canonicalBoundaryKey = (boundary: Point[]): string => {
  const variants: string[] = [];
  const encode = (points: Point[]): string => points.map(pointKey).join("|");

  for (const points of [boundary, [...boundary].reverse()]) {
    for (let offset = 0; offset < points.length; offset += 1) {
      variants.push(encode([...points.slice(offset), ...points.slice(0, offset)]));
    }
  }

  variants.sort();
  return variants[0];
};

const capturedKeys = (captures: Capture[]): Set<string> =>
  new Set(captures.flatMap((capture) => capture.captured.map(pointKey)));

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  if (pointOnPolygonBoundary(point, polygon)) return false;

  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current];
    const b = polygon[previous];
    const crosses =
      (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const pointInOrOnPolygon = (point: Point, polygon: Point[]): boolean =>
  pointOnPolygonBoundary(point, polygon) || pointInPolygon(point, polygon);

export const pointInsideCapture = (point: Point, capture: Capture): boolean =>
  pointInPolygon(point, capture.boundary);

export const pointInsideAnyCapture = (point: Point, captures: Capture[]): boolean =>
  captures.some((capture) => pointInsideCapture(point, capture));

const nextNeighbor = (previous: Point, current: Point, neighbors: Point[]): Point | undefined => {
  const reverseAngle = mathAngle(current, previous);
  let best: Point | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const candidate of neighbors) {
    const delta = clockwiseDelta(reverseAngle, mathAngle(current, candidate));
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }

  return best;
};

const extractFaces = (stones: Map<string, Stone>, owner: Player, excluded: Set<string>): Face[] => {
  const ownerStones = [...stones.values()].filter(
    (stone) => stone.player === owner && !excluded.has(pointKey(stone))
  );
  const byKey = new Map(ownerStones.map((stone) => [pointKey(stone), stone]));
  const neighbors = new Map<string, Point[]>();

  for (const stone of ownerStones) {
    const adjacent: Point[] = [];
    for (const offset of OFFSETS) {
      const candidate = byKey.get(`${stone.x + offset.x}:${stone.y + offset.y}`);
      if (candidate) adjacent.push(candidate);
    }
    neighbors.set(pointKey(stone), adjacent);
  }

  const directedEdgeCount = [...neighbors.values()].reduce((sum, adjacent) => sum + adjacent.length, 0);
  const visited = new Set<string>();
  const faces = new Map<string, Face>();

  for (const start of ownerStones) {
    for (const first of neighbors.get(pointKey(start)) ?? []) {
      const startEdge = edgeKey(start, first);
      if (visited.has(startEdge)) continue;

      let previous: Point = start;
      let current: Point = first;
      const localEdges = new Set<string>();
      const boundary: Point[] = [];
      let closed = false;

      for (let step = 0; step <= directedEdgeCount + 1; step += 1) {
        const currentEdge = edgeKey(previous, current);
        if (localEdges.has(currentEdge)) {
          closed = currentEdge === startEdge;
          break;
        }

        localEdges.add(currentEdge);
        visited.add(currentEdge);
        boundary.push(previous);

        const following = nextNeighbor(previous, current, neighbors.get(pointKey(current)) ?? []);
        if (!following) break;

        previous = current;
        current = following;
        if (edgeKey(previous, current) === startEdge) {
          closed = true;
          break;
        }
      }

      if (!closed || boundary.length < 3 || !isSimplePolygon(boundary)) continue;

      const area = signedMathArea(boundary);
      if (area <= 0) continue;

      const key = canonicalBoundaryKey(boundary);
      faces.set(key, { area, boundary, key });
    }
  }

  return [...faces.values()].sort((a, b) => a.area - b.area || a.key.localeCompare(b.key));
};

const captureForFace = (
  face: Face,
  stones: Map<string, Stone>,
  owner: Player,
  excluded: Set<string>
): Capture | undefined => {
  const captured = [...stones.values()].filter(
    (stone) => stone.player !== owner && !excluded.has(pointKey(stone)) && pointInPolygon(stone, face.boundary)
  );
  return captured.length > 0 ? { owner, boundary: face.boundary, captured } : undefined;
};

export const findNewCaptures = (
  stones: Map<string, Stone>,
  existingCaptures: Capture[],
  owner: Player,
  closingPoint: Point
): Capture[] => {
  const excluded = capturedKeys(existingCaptures);
  const faces = extractFaces(stones, owner, excluded).filter((face) =>
    face.boundary.some((point) => samePoint(point, closingPoint))
  );
  const groups = new Map<string, Capture>();

  for (const stone of stones.values()) {
    if (stone.player === owner || excluded.has(pointKey(stone))) continue;

    const face = faces.find((candidate) => pointInPolygon(stone, candidate.boundary));
    if (!face) continue;

    const capture = groups.get(face.key) ?? { owner, boundary: face.boundary, captured: [] };
    capture.captured.push(stone);
    groups.set(face.key, capture);
  }

  return [...groups.values()];
};

export const findHouseCapture = (
  stones: Map<string, Stone>,
  existingCaptures: Capture[],
  owner: Player,
  intruder: Stone
): Capture | undefined => {
  if (intruder.player === owner) return undefined;

  const excluded = capturedKeys(existingCaptures);
  if (excluded.has(pointKey(intruder))) return undefined;

  const face = extractFaces(stones, owner, excluded).find((candidate) => pointInPolygon(intruder, candidate.boundary));
  return face ? captureForFace(face, stones, owner, excluded) : undefined;
};

const captureContainsCapture = (outer: Capture, inner: Capture): boolean =>
  inner.boundary.every((point) => pointInOrOnPolygon(point, outer.boundary));

const sameCaptureBoundary = (a: Capture, b: Capture): boolean =>
  a.owner === b.owner && canonicalBoundaryKey(a.boundary) === canonicalBoundaryKey(b.boundary);

export const applyCaptures = (existingCaptures: Capture[], newCaptures: Capture[]): Capture[] => {
  let active = [...existingCaptures];

  for (const capture of newCaptures) {
    active = active.filter(
      (existing) =>
        !sameCaptureBoundary(existing, capture) &&
        (existing.owner === capture.owner || !captureContainsCapture(capture, existing))
    );
    active.push(capture);
  }

  return active;
};

export const resolveCapturesAfterMove = (
  stones: Map<string, Stone>,
  existingCaptures: Capture[],
  player: Player,
  closingPoint: Point
): Capture[] => {
  const direct = findNewCaptures(stones, existingCaptures, player, closingPoint);
  if (direct.length > 0) return applyCaptures(existingCaptures, direct);

  const opponent: Player = player === "red" ? "blue" : "red";
  const intruder = stones.get(pointKey(closingPoint));
  if (!intruder) return existingCaptures;

  const house = findHouseCapture(stones, existingCaptures, opponent, intruder);
  return house ? applyCaptures(existingCaptures, [house]) : existingCaptures;
};

export const scoreCaptures = (captures: Capture[]): Record<Player, number> => {
  const red = new Set<string>();
  const blue = new Set<string>();

  for (const capture of captures) {
    const target = capture.owner === "red" ? red : blue;
    for (const stone of capture.captured) target.add(pointKey(stone));
  }

  return { red: red.size, blue: blue.size };
};
