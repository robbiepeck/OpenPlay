import { useEffect, useState } from "react";
import {
  Board,
  addRandomTile,
  createStartingBoard,
  getHighestTile,
  hasAvailableMoves,
  moveBoard,
} from "./engine";

type GameStatus = "playing" | "won" | "lost";

function resolveStatus(board: Board): GameStatus {
  const highestTile = getHighestTile(board);

  if (highestTile >= 2048) {
    return "won";
  }

  return hasAvailableMoves(board) ? "playing" : "lost";
}

export function use2048Game() {
  const [board, setBoard] = useState<Board>(() => createStartingBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(() => resolveStatus(board));

  useEffect(() => {
    setStatus(resolveStatus(board));
  }, [board]);

  useEffect(() => {
    setBestScore((current) => Math.max(current, score));
  }, [score]);

  function resetGame() {
    const nextBoard = createStartingBoard();
    setBoard(nextBoard);
    setScore(0);
    setStatus(resolveStatus(nextBoard));
  }

  function handleMove(direction: "up" | "down" | "left" | "right") {
    if (status === "lost") {
      return;
    }

    const result = moveBoard(board, direction);

    if (!result.moved) {
      return;
    }

    const nextBoard = addRandomTile(result.board);
    setBoard(nextBoard);
    setScore((current) => current + result.scoreDelta);
  }

  return {
    board,
    score,
    bestScore,
    status,
    highestTile: getHighestTile(board),
    resetGame,
    handleMove,
  };
}
