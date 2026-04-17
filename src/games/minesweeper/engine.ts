export type MinesweeperDifficulty = "beginner" | "intermediate" | "expert";

export type MinesweeperConfig = {
  id: MinesweeperDifficulty;
  label: string;
  rows: number;
  cols: number;
  mines: number;
};

export const minesweeperConfigs: Record<
  MinesweeperDifficulty,
  MinesweeperConfig
> = {
  beginner: { id: "beginner", label: "Beginner", rows: 9, cols: 9, mines: 10 },
  intermediate: {
    id: "intermediate",
    label: "Intermediate",
    rows: 12,
    cols: 12,
    mines: 24,
  },
  expert: { id: "expert", label: "Expert", rows: 16, cols: 16, mines: 40 },
};

export type MinesweeperCell = {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

export type MinesweeperBoard = MinesweeperCell[][];

function createCell(row: number, col: number): MinesweeperCell {
  return {
    row,
    col,
    isMine: false,
    isRevealed: false,
    isFlagged: false,
    adjacentMines: 0,
  };
}

export function createBoard(config: MinesweeperConfig) {
  return Array.from({ length: config.rows }, (_, row) =>
    Array.from({ length: config.cols }, (_, col) => createCell(row, col)),
  );
}

export function cloneBoard(board: MinesweeperBoard) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function getNeighbors(
  config: MinesweeperConfig,
  row: number,
  col: number,
) {
  const neighbors: Array<{ row: number; col: number }> = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (
        nextRow >= 0 &&
        nextRow < config.rows &&
        nextCol >= 0 &&
        nextCol < config.cols
      ) {
        neighbors.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return neighbors;
}

function forbiddenSet(config: MinesweeperConfig, firstRow: number, firstCol: number) {
  return new Set(
    [{ row: firstRow, col: firstCol }, ...getNeighbors(config, firstRow, firstCol)].map(
      ({ row, col }) => `${row}:${col}`,
    ),
  );
}

export function seedBoard(
  config: MinesweeperConfig,
  firstRow: number,
  firstCol: number,
) {
  const board = createBoard(config);
  const forbidden = forbiddenSet(config, firstRow, firstCol);
  let minesPlaced = 0;

  while (minesPlaced < config.mines) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    const key = `${row}:${col}`;
    const cell = board[row][col];

    if (forbidden.has(key) || cell.isMine) {
      continue;
    }

    cell.isMine = true;
    minesPlaced += 1;
  }

  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      adjacentMines: getNeighbors(config, cell.row, cell.col).filter(
        ({ row: neighborRow, col: neighborCol }) =>
          board[neighborRow][neighborCol].isMine,
      ).length,
    })),
  );
}

export function revealRegion(
  config: MinesweeperConfig,
  board: MinesweeperBoard,
  startRow: number,
  startCol: number,
) {
  const nextBoard = cloneBoard(board);
  const queue = [{ row: startRow, col: startCol }];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const cell = nextBoard[current.row][current.col];

    if (cell.isRevealed || cell.isFlagged) {
      continue;
    }

    cell.isRevealed = true;

    if (cell.adjacentMines !== 0 || cell.isMine) {
      continue;
    }

    getNeighbors(config, current.row, current.col).forEach((neighbor) => {
      const nextCell = nextBoard[neighbor.row][neighbor.col];

      if (!nextCell.isRevealed && !nextCell.isMine) {
        queue.push(neighbor);
      }
    });
  }

  return nextBoard;
}

export function revealAllMines(board: MinesweeperBoard) {
  return board.map((row) =>
    row.map((cell) => (cell.isMine ? { ...cell, isRevealed: true } : { ...cell })),
  );
}

export function countFlags(board: MinesweeperBoard) {
  return board.flat().filter((cell) => cell.isFlagged).length;
}

export function countRevealedSafeCells(board: MinesweeperBoard) {
  return board
    .flat()
    .filter((cell) => cell.isRevealed && !cell.isMine).length;
}

export function hasWon(config: MinesweeperConfig, board: MinesweeperBoard) {
  return countRevealedSafeCells(board) === config.rows * config.cols - config.mines;
}
