import { GameShell } from "../components/GameShell";
import { SiteFrame } from "../components/SiteFrame";
import { MinesweeperGame } from "../games/minesweeper/MinesweeperGame";

export function GameMinesweeperPage() {
  return (
    <SiteFrame compact>
      <GameShell
        eyebrow="Playable now"
        title="Minesweeper"
        description="A clean deduction board built around tension, pattern recognition, and the small thrill of a correct flag."
        aside={
          <div className="instruction-card">
            <p className="instruction-label">How it works</p>
            <ul>
              <li>Reveal safe cells to open the board.</li>
              <li>Numbers show how many mines touch a cell.</li>
              <li>Right click to place or remove a flag.</li>
              <li>Clear every safe cell to win.</li>
            </ul>
          </div>
        }
      >
        <MinesweeperGame />
      </GameShell>
    </SiteFrame>
  );
}
