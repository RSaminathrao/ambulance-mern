const { haversineKm, clamp } = require("./geo");

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const root = this.items[0];
    const end = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = end;
      this.bubbleDown(0);
    }
    return root;
  }

  bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.items[parent].f <= this.items[current].f) break;
      [this.items[parent], this.items[current]] = [
        this.items[current],
        this.items[parent],
      ];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;
    const length = this.items.length;
    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let smallest = current;

      if (left < length && this.items[left].f < this.items[smallest].f) {
        smallest = left;
      }
      if (right < length && this.items[right].f < this.items[smallest].f) {
        smallest = right;
      }
      if (smallest === current) break;

      [this.items[current], this.items[smallest]] = [
        this.items[smallest],
        this.items[current],
      ];
      current = smallest;
    }
  }
}

function toGrid(point, bbox, step) {
  const row = Math.round(clamp((point.lat - bbox.minLat) / step, 0, Number.MAX_SAFE_INTEGER));
  const col = Math.round(clamp((point.lon - bbox.minLon) / step, 0, Number.MAX_SAFE_INTEGER));
  return { row, col };
}

function fromGrid(row, col, bbox, step) {
  return {
    lat: bbox.minLat + row * step,
    lon: bbox.minLon + col * step,
  };
}

function gridBounds(bbox, step) {
  const maxRow = Math.floor((bbox.maxLat - bbox.minLat) / step);
  const maxCol = Math.floor((bbox.maxLon - bbox.minLon) / step);
  return { maxRow, maxCol };
}

function nodeKey(row, col) {
  return `${row},${col}`;
}

function findAStarDistanceKm(startPoint, endPoint, bbox, step) {
  const { maxRow, maxCol } = gridBounds(bbox, step);
  const start = toGrid(startPoint, bbox, step);
  const goal = toGrid(endPoint, bbox, step);

  if (
    start.row < 0 ||
    start.col < 0 ||
    start.row > maxRow ||
    start.col > maxCol ||
    goal.row < 0 ||
    goal.col < 0 ||
    goal.row > maxRow ||
    goal.col > maxCol
  ) {
    return { distanceKm: Infinity, path: [] };
  }

  const open = new MinHeap();
  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();

  const startKey = nodeKey(start.row, start.col);
  const goalKey = nodeKey(goal.row, goal.col);
  gScore.set(startKey, 0);
  open.push({
    key: startKey,
    row: start.row,
    col: start.col,
    f: haversineKm(startPoint, endPoint),
  });

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  while (open.size > 0) {
    const current = open.pop();
    if (!current) break;
    if (closed.has(current.key)) continue;

    if (current.key === goalKey) {
      const path = [];
      let cursor = current.key;
      while (cursor) {
        const [row, col] = cursor.split(",").map(Number);
        path.push(fromGrid(row, col, bbox, step));
        cursor = cameFrom.get(cursor);
      }
      path.reverse();
      return { distanceKm: gScore.get(goalKey) || 0, path };
    }

    closed.add(current.key);

    for (const [dRow, dCol] of directions) {
      const nextRow = current.row + dRow;
      const nextCol = current.col + dCol;
      if (nextRow < 0 || nextCol < 0 || nextRow > maxRow || nextCol > maxCol) {
        continue;
      }

      const nextKey = nodeKey(nextRow, nextCol);
      if (closed.has(nextKey)) continue;

      const currentPoint = fromGrid(current.row, current.col, bbox, step);
      const neighborPoint = fromGrid(nextRow, nextCol, bbox, step);
      const stepCost = haversineKm(currentPoint, neighborPoint);
      const tentativeG = (gScore.get(current.key) || Infinity) + stepCost;
      const knownG = gScore.get(nextKey);
      if (knownG !== undefined && tentativeG >= knownG) continue;

      cameFrom.set(nextKey, current.key);
      gScore.set(nextKey, tentativeG);
      const h = haversineKm(neighborPoint, endPoint);
      open.push({
        key: nextKey,
        row: nextRow,
        col: nextCol,
        f: tentativeG + h,
      });
    }
  }

  return { distanceKm: Infinity, path: [] };
}

module.exports = {
  findAStarDistanceKm,
};
