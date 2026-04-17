import { useMinesweeperGame } from "./useMinesweeperGame";

function getStatusText(status: "ready" | "playing" | "won" | "lost") {
  if (status === "won") {
    return "Board cleared. That was clean work.";
  }

  if (status === "lost") {
    return "Mine hit. Reset and try a different read.";
  }

  if (status === "playing") {
    return "Left click to reveal, right click to flag suspicious cells.";
  }

  return "Your first reveal is protected so you can start with momentum.";
}

export function MinesweeperGame() {
  const {
    board,
    config,
    difficulties,
    difficulty,
    minesLeft,
    revealCell,
    resetGame,
    status,
    toggleFlag,
  } = useMinesweeperGame();

  return (
    <div className="arcade-layout">
      <div className="score-strip">
        <div className="score-chip">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        <div className="score-chip">
          <span>Mines left</span>
          <strong>{minesLeft}</strong>
        </div>
        <div className="score-chip">
          <span>Board</span>
          <strong>
            {config.rows} x {config.cols}
          </strong>
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
          className="mine-grid"
          style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
        >
          {board.flat().map((cell) => (
            <button
              type="button"
              key={`${cell.row}-${cell.col}`}
              className={`mine-cell ${cell.isRevealed ? "revealed" : ""} ${
                cell.isMine && cell.isRevealed ? "mine" : ""
              } ${cell.isFlagged ? "flagged" : ""}`}
              onClick={() => revealCell(cell.row, cell.col)}
              onContextMenu={(event) => {
                event.preventDefault();
                toggleFlag(cell.row, cell.col);
              }}
              aria-label={`Cell ${cell.row + 1}-${cell.col + 1}`}
            >
              {cell.isRevealed && cell.isMine ? (
                <img src="/sprites/mine.svg" alt="" />
              ) : !cell.isRevealed && cell.isFlagged ? (
                <img src="/sprites/flag.svg" alt="" />
              ) : (
                cell.isRevealed && (cell.adjacentMines || "")
              )}
            </button>
          ))}
        </div>

        <div className={`status-banner ${status === "lost" ? "lost" : status === "won" ? "won" : ""}`}>
          <p>{getStatusText(status)}</p>
          <button type="button" onClick={() => resetGame()}>
            New board
          </button>
        </div>
      </div>
    </div>
  );
}
