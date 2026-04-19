export type GameCard = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  status: "Playable now" | "Coming soon";
  accent: string;
  path?: string;
};

export const gameCards: GameCard[] = [
  {
    slug: "gba mod",
    title: "Pokemon FireRed - Brisbane Mod 1.0",
    tagline: "Kanto rerouted through the river city.",
    description:
      "A local-only FireRed cabinet rebuilt for OpenPlay with Brisbane suburb names and Andrew Peck in Professor Oak's chair.",
    status: "Playable now",
    accent: "var(--accent-coral)",
    path: "/games/pokemon-brisbane",
  },
  {
    slug: "2048",
    title: "2048",
    tagline: "Fuse tiles. Build momentum. Chase impossible numbers.",
    description:
      "A crisp, modern take on the classic number-merging puzzle with keyboard controls and instant restarts.",
    status: "Playable now",
    accent: "var(--accent-gold)",
    path: "/games/2048",
  },
  {
    slug: "minesweeper",
    title: "Minesweeper",
    tagline: "Pattern recognition under pressure.",
    description:
      "A clean deduction board with flags, reveals, and that satisfying last-safe-cell moment.",
    status: "Playable now",
    accent: "var(--accent-mint)",
    path: "/games/minesweeper",
  },
  {
    slug: "snake",
    title: "Snake",
    tagline: "Pure arcade flow on a neon grid.",
    description:
      "Fast, readable, and endlessly replayable. The kind of game that still wins a spare five minutes.",
    status: "Playable now",
    accent: "var(--accent-cyan)",
    path: "/games/snake",
  },
];
