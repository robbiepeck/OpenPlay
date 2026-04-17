import { Link } from "react-router-dom";
import type { GameCard as GameCardType } from "../data/games";

type GameCardProps = {
  game: GameCardType;
};

export function GameCard({ game }: GameCardProps) {
  const content = (
    <>
      <div className="game-card-topline">
        <span className="game-card-status">{game.status}</span>
        <span
          className="game-card-accent"
          aria-hidden="true"
          style={{ background: game.accent }}
        />
      </div>
      <div className="game-card-content">
        <p className="game-card-slug">{game.slug}</p>
        <h3>{game.title}</h3>
        <p className="game-card-tagline">{game.tagline}</p>
        <p className="game-card-description">{game.description}</p>
      </div>
      <div className="game-card-footer">
        <span>{game.path ? "Enter game" : "In queue"}</span>
      </div>
    </>
  );

  if (game.path) {
    return (
      <Link className="game-card playable" to={game.path}>
        {content}
      </Link>
    );
  }

  return <article className="game-card muted">{content}</article>;
}
