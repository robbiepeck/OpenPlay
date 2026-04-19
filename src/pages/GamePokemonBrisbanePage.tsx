import { GameShell } from "../components/GameShell";
import { SiteFrame } from "../components/SiteFrame";
import { PokemonBrisbaneGame } from "../games/pokemon-brisbane/PokemonBrisbaneGame";

export function GamePokemonBrisbanePage() {
  return (
    <SiteFrame compact>
      <GameShell
        aside={
          <div className="instruction-card">
            <p className="instruction-label">What changed</p>
            <ul>
              <li>The Kanto hubs are renamed after Brisbane suburbs.</li>
              <li>Professor Oak is rewritten as Andrew Peck.</li>
              <li>The patched ROM stays local and is not checked into git.</li>
              <li>Saves persist in-browser for this cabinet.</li>
            </ul>
          </div>
        }
        description="A private FireRed cabinet wired into OpenPlay with a locally generated ROM, Brisbane suburb names across the region, and Andrew Peck replacing Professor Oak."
        eyebrow="Local ROM build"
        title="Pokemon FireRed: Brisbane Edition"
      >
        <PokemonBrisbaneGame />
      </GameShell>
    </SiteFrame>
  );
}
