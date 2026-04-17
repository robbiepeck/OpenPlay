import { useEffect } from "react";
import { useSnakeGame } from "./useSnakeGame";

const keyToDirection = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
} as const;

function getSnakeStatus(status: "ready" | "playing" | "paused" | "lost") {
  if (status === "lost") {
    return "Collision detected. Reset and make another run.";
  }

  if (status === "paused") {
    return "Paused. Pick a direction or resume when you are ready.";
  }

  if (status === "playing") {
    return "Collect food, grow longer, and keep the route clean.";
  }

  return "Use the controls or arrow keys to launch the run.";
}

export function SnakeGame() {
  const {
    config,
    difficulty,
    difficulties,
    bestScore,
    food,
    occupied,
    resetGame,
    score,
    snake,
    startGame,
    status,
    steer,
    togglePause,
  } = useSnakeGame();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const nextDirection = keyToDirection[event.key as keyof typeof keyToDirection];

      if (event.key === " ") {
        event.preventDefault();
        if (status === "playing" || status === "paused") {
          togglePause();
        } else {
          startGame();
        }
        return;
      }

      if (!nextDirection) {
        return;
      }

      event.preventDefault();
      steer(nextDirection);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startGame, status, steer, togglePause]);

  return (
    <div className="arcade-layout">
      <div className="score-strip">
        <div className="score-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="score-chip">
          <span>Best</span>
          <strong>{bestScore}</strong>
        </div>
        <div className="score-chip">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="difficulty-strip">
        {difficulties.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className={`difficulty-chip ${difficulty === entry.id ? "active" : ""}`}
            onClick={() => resetGame(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="board-stage">
        <div
          className="snake-grid"
          style={{ gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: config.gridSize * config.gridSize }, (_, index) => {
            const x = index % config.gridSize;
            const y = Math.floor(index / config.gridSize);
            const key = `${x}:${y}`;
            const isSnake = occupied.has(key);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={key}
                className={`snake-cell ${isSnake ? "snake" : ""} ${isHead ? "head" : ""} ${isFood ? "food" : ""}`}
              />
            );
          })}
        </div>

        <div className={`status-banner ${status === "lost" ? "lost" : ""}`}>
          <p>{getSnakeStatus(status)}</p>
          <div className="status-actions">
            <button type="button" onClick={startGame}>
              {status === "playing" ? "Running" : status === "paused" ? "Resume" : "Start"}
            </button>
            <button type="button" onClick={togglePause}>
              Pause
            </button>
            <button type="button" onClick={() => resetGame()}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="control-panel">
        <div className="control-copy">
          <p className="control-label">Controls</p>
          <p>Use arrow keys or `W A S D`. Press space to pause or resume.</p>
        </div>
        <div className="control-buttons">
          <button type="button" onClick={() => steer("up")}>
            Up
          </button>
          <button type="button" onClick={() => steer("left")}>
            Left
          </button>
          <button type="button" onClick={() => steer("down")}>
            Down
          </button>
          <button type="button" onClick={() => steer("right")}>
            Right
          </button>
        </div>
      </div>
    </div>
  );
}
