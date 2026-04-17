import { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";

type GameShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  aside: ReactNode;
}>;

export function GameShell({
  eyebrow,
  title,
  description,
  aside,
  children,
}: GameShellProps) {
  return (
    <div className="game-page">
      <section className="game-page-hero">
        <div className="game-page-copy">
          <Link className="back-link" to="/">
            Back to portal
          </Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="game-page-description">{description}</p>
        </div>
        <aside className="game-page-aside">{aside}</aside>
      </section>
      <section className="game-page-body">{children}</section>
    </div>
  );
}
