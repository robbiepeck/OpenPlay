import { useEffect } from "react";
import { GRID_SIZE } from "./engine";
import { use2048Game } from "./use2048Game";

const keyToDirection: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

function getStatusMessage(status: "playing" | "won" | "lost") {
  if (status === "won") {
    return "You hit 2048. Keep going if you want a bigger number.";
  }

  if (status === "lost") {
    return "No moves left. Reset and take another run.";
  }

  return "Use your keyboard to steer the board and combine matching tiles.";
}

export function Twenty48Game() {
  const {
    board,
    animatedTiles,
    score,
    bestScore,
    status,
    highestTile,
    resetGame,
    handleMove,
  } = use2048Game();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = keyToDirection[event.key];

      if (!direction) {
        return;
      }

      event.preventDefault();
      handleMove(direction);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove]);

  return (
    <div className="twenty48-layout">
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
          <span>Top tile</span>
          <strong>{highestTile}</strong>
        </div>
      </div>

      <div className="board-stage">
        <div className="board-shell">
          <div
            className="board-grid board-grid-background"
            role="application"
            aria-label="2048 game board"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {board.flat().map((cell, index) => (
              <div
                className={`board-cell ${cell ? `tile-${cell.value}` : "empty"}`}
                key={cell?.id ?? `empty-${index}`}
              >
                {!cell ? "" : ""}
              </div>
            ))}
          </div>

          <div className="tile-layer" aria-hidden="true">
            {animatedTiles.map((tile) => (
              <div
                className={`board-tile tile-${tile.value} ${tile.isNew ? "spawn" : ""} ${
                  tile.isMerged ? "merge-flash" : ""
                }`}
                key={tile.id}
                style={
                  {
                    "--tile-row": tile.row,
                    "--tile-col": tile.col,
                    "--from-row": tile.fromRow,
                    "--from-col": tile.fromCol,
                  } as React.CSSProperties
                }
              >
                {tile.value}
              </div>
            ))}
          </div>
        </div>

        <div className={`status-banner ${status}`}>
          <p>{getStatusMessage(status)}</p>
          <button type="button" onClick={resetGame}>
            New run
          </button>
        </div>
      </div>

      <div className="control-panel">
        <div className="control-copy">
          <p className="control-label">Controls</p>
          <p>Use arrow keys or `W A S D` to slide the board.</p>
        </div>
        <div className="control-buttons">
          <button type="button" onClick={() => handleMove("up")}>
            Up
          </button>
          <button type="button" onClick={() => handleMove("left")}>
            Left
          </button>
          <button type="button" onClick={() => handleMove("down")}>
            Down
          </button>
          <button type="button" onClick={() => handleMove("right")}>
            Right
          </button>
        </div>
      </div>
    </div>
  );
}
