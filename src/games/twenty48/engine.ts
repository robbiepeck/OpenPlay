export const GRID_SIZE = 4;

export type Tile = {
  id: number;
  value: number;
};

export type Cell = Tile | null;
export type Board = Cell[][];
export type Direction = "up" | "down" | "left" | "right";

export type AnimatedTile = {
  id: number;
  value: number;
  row: number;
  col: number;
  fromRow: number;
  fromCol: number;
  isNew?: boolean;
  isMerged?: boolean;
};

export type MoveResult = {
  board: Board;
  scoreDelta: number;
  moved: boolean;
  animatedTiles: AnimatedTile[];
};

type PositionedTile = {
  tile: Tile;
  index: number;
};

type MergeEntry = {
  tile: Tile;
  fromIndices: number[];
  isMerged?: boolean;
};

let tileId = 1;

function createTile(value: number): Tile {
  tileId += 1;
  return { id: tileId, value };
}

export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function getEmptyPositions(board: Board) {
  const positions: Array<{ row: number; col: number }> = [];

  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) {
        positions.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  return positions;
}

export function addRandomTile(board: Board) {
  const nextBoard = cloneBoard(board);
  const positions = getEmptyPositions(nextBoard);

  if (positions.length === 0) {
    return { board: nextBoard, spawnedTile: null as AnimatedTile | null };
  }

  const position = positions[Math.floor(Math.random() * positions.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile = createTile(value);
  nextBoard[position.row][position.col] = tile;

  return {
    board: nextBoard,
    spawnedTile: {
      id: tile.id,
      value: tile.value,
      row: position.row,
      col: position.col,
      fromRow: position.row,
      fromCol: position.col,
      isNew: true,
    },
  };
}

export function createStartingBoard() {
  const first = addRandomTile(createEmptyBoard());
  const second = addRandomTile(first.board);

  return {
    board: second.board,
    animatedTiles: [first.spawnedTile, second.spawnedTile].filter(
      Boolean,
    ) as AnimatedTile[],
  };
}

function compactLine(line: Cell[]) {
  return line
    .map((cell, index) => (cell ? { tile: cell, index } : null))
    .filter(Boolean) as PositionedTile[];
}

function mergeLine(line: Cell[]) {
  const compacted = compactLine(line);
  const entries: MergeEntry[] = [];
  let scoreDelta = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index];
    const next = compacted[index + 1];

    if (next && current.tile.value === next.tile.value) {
      const mergedValue = current.tile.value * 2;
      entries.push({
        tile: createTile(mergedValue),
        fromIndices: [current.index, next.index],
        isMerged: true,
      });
      scoreDelta += mergedValue;
      index += 1;
    } else {
      entries.push({
        tile: { ...current.tile },
        fromIndices: [current.index],
      });
    }
  }

  const lineResult: Cell[] = Array.from({ length: GRID_SIZE }, (_, index) =>
    entries[index]?.tile ?? null,
  );

  return { line: lineResult, scoreDelta, entries };
}

function reverseLine(line: Cell[]) {
  return [...line].reverse();
}

function boardsEqual(a: Board, b: Board) {
  return a.every((row, rowIndex) =>
    row.every((cell, colIndex) => cell?.value === b[rowIndex][colIndex]?.value),
  );
}

function getColumn(board: Board, columnIndex: number) {
  return board.map((row) => row[columnIndex]);
}

function setColumn(board: Board, columnIndex: number, column: Cell[]) {
  column.forEach((cell, rowIndex) => {
    board[rowIndex][columnIndex] = cell;
  });
}

function axisPosition(
  direction: Direction,
  primaryIndex: number,
  secondaryIndex: number,
) {
  if (direction === "left" || direction === "right") {
    return { row: primaryIndex, col: secondaryIndex };
  }

  return { row: secondaryIndex, col: primaryIndex };
}

function orientIndex(direction: Direction, index: number) {
  return direction === "right" || direction === "down"
    ? GRID_SIZE - 1 - index
    : index;
}

export function moveBoard(board: Board, direction: Direction): MoveResult {
  const workingBoard = createEmptyBoard();
  const animatedTiles: AnimatedTile[] = [];
  let scoreDelta = 0;

  if (direction === "left" || direction === "right") {
    board.forEach((row, rowIndex) => {
      const source = direction === "right" ? reverseLine(row) : row;
      const result = mergeLine(source);
      const finalLine = direction === "right" ? reverseLine(result.line) : result.line;
      workingBoard[rowIndex] = finalLine;
      scoreDelta += result.scoreDelta;

      result.entries.forEach((entry, entryIndex) => {
        const targetIndex = orientIndex(direction, entryIndex);
        const firstOrigin = orientIndex(direction, entry.fromIndices[0]);
        animatedTiles.push({
          id: entry.tile.id,
          value: entry.tile.value,
          row: rowIndex,
          col: targetIndex,
          fromRow: rowIndex,
          fromCol: firstOrigin,
          isMerged: entry.isMerged,
        });
      });
    });
  } else {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const source = getColumn(board, col);
      const oriented = direction === "down" ? reverseLine(source) : source;
      const result = mergeLine(oriented);
      const finalColumn =
        direction === "down" ? reverseLine(result.line) : result.line;
      setColumn(workingBoard, col, finalColumn);
      scoreDelta += result.scoreDelta;

      result.entries.forEach((entry, entryIndex) => {
        const targetIndex = orientIndex(direction, entryIndex);
        const firstOrigin = orientIndex(direction, entry.fromIndices[0]);
        const target = axisPosition(direction, col, targetIndex);
        const origin = axisPosition(direction, col, firstOrigin);
        animatedTiles.push({
          id: entry.tile.id,
          value: entry.tile.value,
          row: target.row,
          col: target.col,
          fromRow: origin.row,
          fromCol: origin.col,
          isMerged: entry.isMerged,
        });
      });
    }
  }

  return {
    board: workingBoard,
    scoreDelta,
    moved: !boardsEqual(board, workingBoard),
    animatedTiles,
  };
}

export function hasAvailableMoves(board: Board) {
  if (getEmptyPositions(board).length > 0) {
    return true;
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const current = board[row][col];
      const right = board[row][col + 1];
      const down = board[row + 1]?.[col];

      if (
        current &&
        ((right && current.value === right.value) ||
          (down && current.value === down.value))
      ) {
        return true;
      }
    }
  }

  return false;
}

export function getHighestTile(board: Board) {
  return Math.max(...board.flat().map((cell) => cell?.value ?? 0));
}
