import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useProgress } from "@/lib/game/progress";
import { XpBar } from "./XpBar";

const NAV = [
  { to: "/dashboard", label: "Panel" },
  { to: "/map", label: "Mapa" },
  { to: "/inventory", label: "Inventario" },
  { to: "/skills", label: "Habilidades" },
  { to: "/leaderboard", label: "Clasificación" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { level, state } = useProgress();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-foreground bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-5 px-5 py-3 lg:px-10">
          <Link
            to="/"
            className="shrink-0 font-display text-xl uppercase text-foreground sm:text-2xl"
          >
            SOROBAN<span className="text-xp">★</span>QUEST
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{
                  className:
                    "text-foreground underline decoration-primary decoration-4 underline-offset-8",
                }}
              >
                <span className="mr-1 text-xp">0{i + 1}</span> {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-border pl-4 md:ml-0">
            <div className="hidden w-24 sm:block">
              <div className="mb-1 flex justify-between text-[9px] font-bold uppercase">
                <span>LVL {level.level}</span>
                <span>{level.total} XP</span>
              </div>
              <XpBar percent={level.percent} />
            </div>
            <div className="flex size-9 items-center justify-center bg-secondary font-display text-sm text-background">
              {state.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-border px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap px-3 py-1 text-xs font-semibold uppercase text-muted-foreground"
              activeProps={{
                className:
                  "text-foreground underline decoration-primary decoration-2 underline-offset-4",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">{children}</main>
    </div>
  );
}
