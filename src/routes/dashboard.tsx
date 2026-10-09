import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/game/AppShell";
import { XpBar } from "@/components/game/XpBar";
import { useProgress } from "@/lib/game/progress";
import { LEADERBOARD } from "@/lib/game/leaderboard";
import { INVENTORY_CATALOG } from "@/lib/game/inventory";
import { SKILL_BRANCHES } from "@/lib/game/skill-tree";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Panel de jugador — Soroban Quest" },
      {
        name: "description",
        content:
          "Consulta tu nivel, XP, misión actual, logros, inventario y habilidades en Stellar.",
      },
      { property: "og:title", content: "Panel de jugador — Soroban Quest" },
      { property: "og:description", content: "Sigue tu nivel, XP y tu próxima misión de Stellar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, level, currentQuest, completedCount } = useProgress();
  const ownedIds = new Set(state.items.map((i) => i.id));
  return (
    <AppShell>
      <div className="grid gap-12 border-t-4 border-foreground pt-7 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-12 lg:col-span-7">
          <header>
            <p className="label-xs mb-4 text-boss">01 / Perfil de construcción</p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="max-w-full break-words font-display text-6xl uppercase leading-none sm:text-8xl">
                {level.title}
              </h1>
              <span className="border-b-4 border-primary pb-1 font-editorial text-2xl italic">
                Nivel {level.level}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-foreground pb-5">
              <p className="font-editorial text-2xl sm:text-3xl">@{state.username}</p>
              <div className="text-left sm:text-right">
                <p className="label-xs text-boss">Puntos de experiencia</p>
                <p className="font-display text-2xl">
                  {state.xp.toLocaleString()} / {level.nextAt.toLocaleString()} XP
                </p>
              </div>
            </div>
            <XpBar percent={level.percent} className="mt-5 h-3" />
            <dl className="mt-7 grid grid-cols-2 border-y border-border sm:grid-cols-4">
              {[
                { label: "Racha", value: `${state.streak}d` },
                { label: "Misiones", value: completedCount },
                { label: "Contratos", value: state.contractsDeployed },
                { label: "Verificadas", value: state.transactionsVerified },
              ].map((s) => (
                <div key={s.label} className="border-r border-border p-3 last:border-r-0">
                  <dt className="label-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 font-display text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </header>
          <div className="grid gap-8 border-t border-foreground pt-7 sm:grid-cols-2">
            <section>
              <div className="mb-5 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="text-xl">Inventario</h2>
                <Link to="/inventory" className="label-xs hover:underline">
                  Ver todo ↗
                </Link>
              </div>
              <p className="mb-3 font-editorial text-sm italic text-muted-foreground">
                {ownedIds.size} de {INVENTORY_CATALOG.length} recuperados
              </p>
              <div className="grid grid-cols-5 gap-2">
                {INVENTORY_CATALOG.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    title={item.name}
                    className={`flex aspect-square items-center justify-center border text-xl ${ownedIds.has(item.id) ? "border-primary bg-primary/15" : "border-border text-locked opacity-50"}`}
                  >
                    {ownedIds.has(item.id) ? item.icon : "◇"}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-5 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="text-xl">Clasificación</h2>
                <Link to="/leaderboard" className="label-xs hover:underline">
                  Ver clasificación ↗
                </Link>
              </div>
              {LEADERBOARD.length ? (
                <ol className="space-y-2">
                  {LEADERBOARD.slice(0, 5).map((row, i) => (
                    <li
                      key={row.builder}
                      className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-2 text-sm"
                    >
                      <span className="truncate">
                        <span className="mr-3 font-display text-xl text-xp">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {row.builder}
                      </span>
                      <span className="font-semibold">{row.xp.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="font-editorial text-sm italic text-muted-foreground">
                  Todavía no hay nadie en la clasificación. Quienes completen las primeras misiones
                  inaugurarán el salón.
                </p>
              )}
            </section>
          </div>
          <section className="border-t border-foreground pt-7">
            <h2 className="mb-5 text-xl">Logros recientes</h2>
            {state.achievements.length ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[...state.achievements]
                  .reverse()
                  .slice(0, 5)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex min-h-32 min-w-32 flex-col items-center justify-center border border-secondary bg-secondary/10 p-4 text-center"
                    >
                      <span className="text-3xl">{a.icon}</span>
                      <span className="mt-2 text-xs font-semibold">
                        {(
                          {
                            "welcome-builder": "Te damos la bienvenida",
                            "value-in-motion": "Valor en movimiento",
                            "first-deployment": "Primer despliegue",
                            "trust-nobody": "No confíes en nadie",
                            "soroban-builder": "Sello de Soroban",
                            "token-smith": "Forja de tokens",
                            "bug-hunter": "Caza de errores",
                            "crowd-builder": "Comunidad en marcha",
                            "lumina-architect": "Corazón de Lumina",
                          } as Record<string, string>
                        )[a.id] ?? a.name}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="font-editorial italic text-muted-foreground">
                Aún no tienes logros. Completa una misión para conseguir uno.
              </p>
            )}
          </section>
        </div>
        <div className="flex flex-col gap-9 lg:col-span-5">
          <section className="bg-secondary p-6 text-foreground shadow-[8px_8px_0_var(--foreground)] sm:p-8">
            <div className="mb-10 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-xs mb-5">02 / Misión activa</p>
                <h2 className="break-words text-5xl leading-none sm:text-6xl">
                  {currentQuest?.title ?? "Todo completado"}
                </h2>
              </div>
              {currentQuest && (
                <div className="text-right text-xs font-bold uppercase">
                  <p>{currentQuest.estimatedTime}</p>
                  <p className="text-primary">+{currentQuest.xp} XP</p>
                </div>
              )}
            </div>
            <p className="font-editorial text-lg leading-relaxed">
              {currentQuest?.story ??
                "Has completado todas las misiones disponibles. Pronto llegarán nuevas regiones de Lumina."}
            </p>
            {currentQuest && (
              <Link
                to="/quests/$slug"
                params={{ slug: currentQuest.slug }}
                className="mt-8 flex w-full items-center justify-between border-2 border-foreground px-5 py-3 font-display text-lg uppercase transition-colors hover:bg-foreground hover:text-background"
              >
                Continuar misión <span>↗</span>
              </Link>
            )}
          </section>
          <section className="border-l border-foreground pl-7">
            <div className="mb-6 flex justify-between gap-3">
              <h2 className="text-xl">Árbol de habilidades</h2>
              <Link to="/skills" className="label-xs self-center hover:underline">
                Explorar ↗
              </Link>
            </div>
            <div className="space-y-5">
              {SKILL_BRANCHES.filter((b) => b.available).map((branch, i) => (
                <div key={branch.id} className="flex items-start gap-4">
                  <span
                    className={`mt-1 block size-4 shrink-0 rounded-full border border-foreground ${i === 0 ? "bg-primary" : "bg-background"}`}
                  />
                  <div>
                    <p className="text-sm font-bold uppercase">{branch.name}</p>
                    <p className="font-editorial text-sm italic text-muted-foreground">
                      {branch.tagline}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
