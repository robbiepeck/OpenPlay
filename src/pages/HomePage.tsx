import { GameCard } from "../components/GameCard";
import { SiteFrame } from "../components/SiteFrame";
import { gameCards } from "../data/games";

export function HomePage() {
  return (
    <SiteFrame>
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">OpenPlay</p>
          <h1>Classic browser games, rebuilt as a forever-free public arcade.</h1>
          <p className="hero-description">
            A curated collection of straightforward, open-style games with clean
            rules, sharp presentation, and zero lock-in. We start with one polished
            puzzle and grow from there.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#gallery">
              Explore gallery
            </a>
            <a className="button-secondary" href="#vision">
              Read the vision
            </a>
          </div>
        </div>

        <div className="hero-display" aria-hidden="true">
          <div className="hero-stat-card">
            <span>Playable now</span>
            <strong>4 games</strong>
          </div>
          <div className="hero-stat-card">
            <span>Arcade type</span>
            <strong>Open & free</strong>
          </div>
          <div className="hero-grid-preview">
            <span>2</span>
            <span>4</span>
            <span>8</span>
            <span>16</span>
          </div>
        </div>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="section-heading">
          <p className="eyebrow">Gallery</p>
          <h2>Choose a cabinet.</h2>
        </div>
        <div className="game-grid">
          {gameCards.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>

      <section className="vision-section" id="vision">
        <div className="section-heading">
          <p className="eyebrow">Vision</p>
          <h2>Built to expand without losing the plot.</h2>
        </div>
        <div className="vision-copy">
          <p>
            OpenPlay is set up as a gallery-style portal so each game can live in
            its own space while still feeling part of one public arcade.
          </p>
          <p>
            This workspace now includes 2048, Minesweeper, Snake, and a private
            Brisbane-themed Pokemon FireRed cabinet built for local play.
          </p>
        </div>
      </section>
    </SiteFrame>
  );
}
