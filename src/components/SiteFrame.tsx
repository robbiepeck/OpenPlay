import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type SiteFrameProps = PropsWithChildren<{
  compact?: boolean;
}>;

export function SiteFrame({ children, compact = false }: SiteFrameProps) {
  return (
    <div className="site-shell">
      <div className="site-noise" aria-hidden="true" />
      <header className={`site-header ${compact ? "compact" : ""}`}>
        <Link className="brand-lockup" to="/">
          <span className="brand-mark" aria-hidden="true">
            OP
          </span>
          <span className="brand-copy">
            <strong>OpenPlay</strong>
            <span>Public-first browser arcade</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <a href="#gallery">Gallery</a>
          <a href="#vision">Vision</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
