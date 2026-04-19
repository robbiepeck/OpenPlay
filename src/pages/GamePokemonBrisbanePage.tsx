import { SiteFrame } from "../components/SiteFrame";
import { PokemonBrisbaneGame } from "../games/pokemon-brisbane/PokemonBrisbaneGame";
import { Link } from "react-router-dom";

export function GamePokemonBrisbanePage() {
  return (
    <SiteFrame compact>
      <div className="pokemon-page-simple">
        <div className="pokemon-page-simple-header">
          <Link className="back-link" to="/">
            Back to portal
          </Link>
          <h1>Pokemon FireRed - Brisbane Mod 1.0</h1>
        </div>
        <PokemonBrisbaneGame />
      </div>
    </SiteFrame>
  );
}
