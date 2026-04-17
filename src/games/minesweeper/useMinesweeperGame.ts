import { useMemo, useState } from "react";
import {
  MinesweeperBoard,
  MinesweeperDifficulty,
  cloneBoard,
  countFlags,
  createBoard,
  hasWon,
  minesweeperConfigs,
  revealAllMines,
  revealRegion,
  seedBoard,
} from "./engine";

type MinesweeperStatus = "ready" | "playing" | "won" | "lost";

export function useMinesweeperGame() {
  const [difficulty, setDifficulty] = useState<MinesweeperDifficulty>("beginner");
  const config = minesweeperConfigs[difficulty];
  const [board, setBoard] = useState<MinesweeperBoard>(() => createBoard(config));
  const [status, setStatus] = useState<MinesweeperStatus>("ready");
  const [started, setStarted] = useState(false);

  const minesLeft = useMemo(() => config.mines - countFlags(board), [board, config]);

  function resetGame(nextDifficulty = difficulty) {
    const nextConfig = minesweeperConfigs[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextConfig));
    setStatus("ready");
    setStarted(false);
  }

  function revealCell(row: number, col: number) {
    if (status === "won" || status === "lost") {
      return;
    }

    let workingBoard = started ? cloneBoard(board) : seedBoard(config, row, col);
    let nextStatus: MinesweeperStatus = status === "ready" ? "playing" : status;
    const targetCell = workingBoard[row][col];

    if (targetCell.isRevealed || targetCell.isFlagged) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    if (targetCell.isMine) {
      workingBoard = revealAllMines(workingBoard);
      nextStatus = "lost";
    } else {
      workingBoard = revealRegion(config, workingBoard, row, col);

      if (hasWon(config, workingBoard)) {
        nextStatus = "won";
      }
    }

    setBoard(workingBoard);
    setStatus(nextStatus);
  }

  function toggleFlag(row: number, col: number) {
    if (status === "won" || status === "lost") {
      return;
    }

    const nextBoard = cloneBoard(board);
    const cell = nextBoard[row][col];

    if (cell.isRevealed) {
      return;
    }

    cell.isFlagged = !cell.isFlagged;
    setBoard(nextBoard);
  }

  return {
    board,
    config,
    difficulty,
    difficulties: Object.values(minesweeperConfigs),
    status,
    minesLeft,
    resetGame,
    revealCell,
    toggleFlag,
  };
}
