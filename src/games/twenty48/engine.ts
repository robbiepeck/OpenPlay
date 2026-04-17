export const GRID_SIZE = 4;

export type Tile = {
  id: number;
  value: number;
};

export type Cell = Tile | null;
export type Board = Cell[][];

export type MoveResult = {
  board: Board;
  scoreDelta: number;
  moved: boolean;
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

export function addRandomTile(board: Board): Board {
  const nextBoard = cloneBoard(board);
  const positions = getEmptyPositions(nextBoard);

  if (positions.length === 0) {
    return nextBoard;
  }

  const position = positions[Math.floor(Math.random() * positions.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  nextBoard[position.row][position.col] = createTile(value);
  return nextBoard;
}

export function createStartingBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function compactLine(line: Cell[]) {
  return line.filter(Boolean) as Tile[];
}

function mergeLine(line: Cell[]) {
  const compacted = compactLine(line);
  const merged: Cell[] = [];
  let scoreDelta = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index];
    const next = compacted[index + 1];

    if (next && current.value === next.value) {
      const mergedValue = current.value * 2;
      merged.push(createTile(mergedValue));
      scoreDelta += mergedValue;
      index += 1;
    } else {
      merged.push({ ...current });
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push(null);
  }

  return { line: merged, scoreDelta };
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

export function moveBoard(board: Board, direction: "up" | "down" | "left" | "right"): MoveResult {
  const workingBoard = createEmptyBoard();
  let scoreDelta = 0;

  if (direction === "left" || direction === "right") {
    board.forEach((row, rowIndex) => {
      const source = direction === "right" ? reverseLine(row) : row;
      const result = mergeLine(source);
      const finalLine = direction === "right" ? reverseLine(result.line) : result.line;
      workingBoard[rowIndex] = finalLine;
      scoreDelta += result.scoreDelta;
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
    }
  }

  return {
    board: workingBoard,
    scoreDelta,
    moved: !boardsEqual(board, workingBoard),
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
