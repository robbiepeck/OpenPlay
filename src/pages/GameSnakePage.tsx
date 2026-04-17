import { GameShell } from "../components/GameShell";
import { SiteFrame } from "../components/SiteFrame";
import { SnakeGame } from "../games/snake/SnakeGame";

export function GameSnakePage() {
  return (
    <SiteFrame compact>
      <GameShell
        eyebrow="Playable now"
        title="Snake"
        description="Classic grid-based arcade play with direct controls, quick restarts, and a clean neon board."
        aside={
          <div className="instruction-card">
            <p className="instruction-label">How it works</p>
            <ul>
              <li>Eat food to grow longer and raise your score.</li>
              <li>Do not hit the wall.</li>
              <li>Do not run into your own body.</li>
              <li>Use space to pause mid-run.</li>
            </ul>
          </div>
        }
      >
        <SnakeGame />
      </GameShell>
    </SiteFrame>
  );
}
