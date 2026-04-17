import { useEffect, useMemo, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type Direction = "up" | "down" | "left" | "right";
type SnakeStatus = "ready" | "playing" | "paused" | "lost";
type SnakeDifficulty = "easy" | "normal" | "hard";

type SnakeConfig = {
  id: SnakeDifficulty;
  label: string;
  gridSize: number;
  tickMs: number;
};

const snakeConfigs: Record<SnakeDifficulty, SnakeConfig> = {
  easy: { id: "easy", label: "Easy", gridSize: 18, tickMs: 170 },
  normal: { id: "normal", label: "Normal", gridSize: 20, tickMs: 130 },
  hard: { id: "hard", label: "Hard", gridSize: 22, tickMs: 95 },
};

const initialSnake = (gridSize: number): Point[] => [
  { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
  { x: Math.floor(gridSize / 2) - 1, y: Math.floor(gridSize / 2) },
  { x: Math.floor(gridSize / 2) - 2, y: Math.floor(gridSize / 2) },
];

function randomFood(gridSize: number, snake: Point[]) {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };

    if (!snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)) {
      return candidate;
    }
  }
}

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export function useSnakeGame() {
  const [difficulty, setDifficulty] = useState<SnakeDifficulty>("normal");
  const config = snakeConfigs[difficulty];
  const initial = useMemo(() => initialSnake(config.gridSize), [config.gridSize]);
  const [snake, setSnake] = useState<Point[]>(() => initial);
  const [direction, setDirection] = useState<Direction>("right");
  const [food, setFood] = useState<Point>(() => randomFood(config.gridSize, initial));
  const [status, setStatus] = useState<SnakeStatus>("ready");
  const [bestScore, setBestScore] = useState(0);

  const score = snake.length - initial.length;

  const occupied = useMemo(
    () => new Set(snake.map((segment) => `${segment.x}:${segment.y}`)),
    [snake],
  );

  function resetGame(nextDifficulty = difficulty) {
    const nextConfig = snakeConfigs[nextDifficulty];
    const starter = initialSnake(nextConfig.gridSize);
    setDifficulty(nextDifficulty);
    setSnake(starter);
    setDirection("right");
    setFood(randomFood(nextConfig.gridSize, starter));
    setStatus("ready");
  }

  function step() {
    setSnake((currentSnake) => {
      const head = currentSnake[0];
      const nextHead =
        direction === "up"
          ? { x: head.x, y: head.y - 1 }
          : direction === "down"
            ? { x: head.x, y: head.y + 1 }
            : direction === "left"
              ? { x: head.x - 1, y: head.y }
              : { x: head.x + 1, y: head.y };

      const willEat = nextHead.x === food.x && nextHead.y === food.y;
      const nextSnake = [nextHead, ...currentSnake];

      if (!willEat) {
        nextSnake.pop();
      }

      const hitsWall =
        nextHead.x < 0 ||
        nextHead.x >= config.gridSize ||
        nextHead.y < 0 ||
        nextHead.y >= config.gridSize;
      const hitsSelf = nextSnake
        .slice(1)
        .some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

      if (hitsWall || hitsSelf) {
        setStatus("lost");
        return currentSnake;
      }

      if (willEat) {
        setFood(randomFood(config.gridSize, nextSnake));
      }

      return nextSnake;
    });
  }

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const intervalId = window.setInterval(step, config.tickMs);
    return () => window.clearInterval(intervalId);
  }, [status, direction, food, config.tickMs]);

  useEffect(() => {
    setBestScore((current) => Math.max(current, score));
  }, [score]);

  function startGame() {
    if (status === "lost") {
      resetGame();
      setStatus("playing");
      return;
    }

    setStatus("playing");
  }

  function togglePause() {
    if (status === "ready" || status === "lost") {
      return;
    }

    setStatus((current) => (current === "playing" ? "paused" : "playing"));
  }

  function steer(nextDirection: Direction) {
    if (isOpposite(direction, nextDirection)) {
      return;
    }

    setDirection(nextDirection);

    if (status === "ready" || status === "paused") {
      setStatus("playing");
    }
  }

  return {
    config,
    difficulty,
    difficulties: Object.values(snakeConfigs),
    snake,
    food,
    score,
    bestScore,
    status,
    occupied,
    resetGame,
    startGame,
    togglePause,
    steer,
  };
}
