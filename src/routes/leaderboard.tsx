import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/game/AppShell";
import { getLeaderboard } from "@/lib/stellar.functions";
import { useProgress } from "@/lib/game/progress";
import { levelFromXp } from "@/lib/game/levels";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Clasificación — Soroban Quest" },
      {
        name: "description",
        content: "Clasificación de Soroban Quest por XP, misiones y jefes.",
      },
      { property: "og:title", content: "Clasificación — Soroban Quest" },
      {
        property: "og:description",
        content: "Descubre tu posición entre quienes construyen en Soroban Quest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getLeaderboard({ data: { limit: 50 } }),
  component: Leaderboard,
});

const shortAddress = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

function Leaderboard() {
  const rows = Route.useLoaderData();
  const { state, completedCount, level } = useProgress();
  const myRank = rows.findIndex((r) => r.address === state.address);

  return (
    <AppShell>
      <header className="border-t-4 border-foreground pt-6">
        <p className="label-xs text-boss">05 / Salón de creadores</p>
        <h1 className="mt-4 text-6xl leading-none sm:text-8xl">Clasificación.</h1>
      </header>

      {rows.length ? (
        <div className="mt-12 overflow-x-auto border-t border-foreground">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-foreground text-left">
                {["Puesto", "Participante", "Nivel", "XP", "Misiones", "Jefes"].map((h) => (
                  <th key={h} className="label-xs px-4 py-4 text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.address}
                  className={`border-b border-border ${i === myRank ? "bg-primary/20" : ""}`}
                >
                  <td className="px-4 py-4 font-display text-3xl text-xp">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-4 font-mono font-semibold" title={row.address}>
                    {shortAddress(row.address)}
                    {i === myRank && <span className="ml-2 font-sans text-xs text-xp">(tú)</span>}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{levelFromXp(row.xp)}</td>
                  <td className="px-4 py-4 font-display text-xl">{row.xp.toLocaleString()}</td>
                  <td className="px-4 py-4">{row.quests}</td>
                  <td className="px-4 py-4">{row.bosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">
            Solo cuentan misiones verificadas por el servidor en la red de pruebas. Se actualiza
            cada 30 segundos.
            {state.address && myRank === -1 && " Firma «La llegada» para aparecer aquí."}
          </p>
        </div>
      ) : (
        <section className="mt-12 grid gap-10 border-t border-foreground pt-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-4xl">EL SALÓN ESTÁ VACÍO</h2>
            <p className="mt-4 max-w-xl font-editorial text-xl italic text-muted-foreground">
              Todavía no hay nadie en la clasificación. Las primeras personas que completen misiones
              verificadas en la red de pruebas serán quienes lo inauguren.
            </p>
            <Link
              to="/map"
              className="mt-8 inline-flex bg-primary px-5 py-3 font-display text-base text-primary-foreground hover:bg-primary/90"
            >
              IR AL MAPA ↗
            </Link>
          </div>
          <aside className="border-t border-foreground pt-5 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h2 className="label-xs text-muted-foreground">Tu progreso</h2>
            <dl className="mt-4 grid grid-cols-3 border-t border-border">
              {[
                ["Nivel", String(level.level)],
                ["XP", state.xp.toLocaleString()],
                ["Misiones", String(completedCount)],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-border p-3 last:border-r-0">
                  <dt className="label-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 font-display text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Aparecerás aquí cuando firmes «La llegada» con tu billetera: desde ese momento cada
              misión verificada suma a la clasificación pública.
            </p>
          </aside>
        </section>
      )}
    </AppShell>
  );
}
