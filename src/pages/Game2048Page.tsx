import { GameShell } from "../components/GameShell";
import { SiteFrame } from "../components/SiteFrame";
import { Twenty48Game } from "../games/twenty48/Twenty48Game";

export function Game2048Page() {
  return (
    <SiteFrame compact>
      <GameShell
        eyebrow="Playable now"
        title="2048"
        description="A modern browser build of the classic sliding number puzzle. Merge matching tiles, chase 2048, and keep climbing if you feel greedy."
        aside={
          <div className="instruction-card">
            <p className="instruction-label">How it works</p>
            <ul>
              <li>Every move slides the full board.</li>
              <li>Matching tiles merge into a bigger number.</li>
              <li>A new tile appears after each valid move.</li>
              <li>The run ends when no moves remain.</li>
            </ul>
          </div>
        }
      >
        <Twenty48Game />
      </GameShell>
    </SiteFrame>
  );
}
