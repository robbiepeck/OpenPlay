import { useEffect, useMemo, useState } from "react";
import {
  AnimatedTile,
  Board,
  Direction,
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
  const startingState = useMemo(() => createStartingBoard(), []);
  const [board, setBoard] = useState<Board>(() => startingState.board);
  const [animatedTiles, setAnimatedTiles] = useState<AnimatedTile[]>(
    () => startingState.animatedTiles,
  );
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(() =>
    resolveStatus(startingState.board),
  );

  useEffect(() => {
    setStatus(resolveStatus(board));
  }, [board]);

  useEffect(() => {
    setBestScore((current) => Math.max(current, score));
  }, [score]);

  function resetGame() {
    const nextState = createStartingBoard();
    setBoard(nextState.board);
    setAnimatedTiles(nextState.animatedTiles);
    setScore(0);
    setStatus(resolveStatus(nextState.board));
  }

  function handleMove(direction: Direction) {
    if (status === "lost") {
      return;
    }

    const result = moveBoard(board, direction);

    if (!result.moved) {
      return;
    }

    const withSpawn = addRandomTile(result.board);
    setBoard(withSpawn.board);
    setAnimatedTiles(
      withSpawn.spawnedTile
        ? [...result.animatedTiles, withSpawn.spawnedTile]
        : result.animatedTiles,
    );
    setScore((current) => current + result.scoreDelta);
  }

  return {
    board,
    animatedTiles,
    score,
    bestScore,
    status,
    highestTile: getHighestTile(board),
    resetGame,
    handleMove,
  };
}
