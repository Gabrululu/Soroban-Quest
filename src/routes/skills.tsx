import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/game/AppShell";
import { SKILL_BRANCHES } from "@/lib/game/skill-tree";
import { useProgress } from "@/lib/game/progress";
export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Árbol de habilidades — Soroban Quest" },
      {
        name: "description",
        content: "Elige tu camino en Stellar: pagos, DeFi o activos del mundo real.",
      },
      { property: "og:title", content: "Árbol de habilidades — Soroban Quest" },
      {
        property: "og:description",
        content: "Explora pagos, DeFi o activos reales tras completar las primeras misiones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Skills,
});
function Skills() {
  const { completedCount } = useProgress();
  const unlocked = completedCount >= 3;
  return (
    <AppShell>
      <header className="grid gap-6 border-t-4 border-foreground pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label-xs text-boss">04 / Especialización</p>
          <h1 className="mt-4 text-6xl leading-none sm:text-8xl">
            Elige tu
            <br />
            camino.
          </h1>
        </div>
        <p className="self-end border-l border-foreground pl-6 font-editorial text-xl italic lg:col-span-4">
          {unlocked
            ? "Ya completaste las misiones iniciales. Elige una rama y profundiza."
            : "Completa las tres primeras misiones para desbloquear las ramas de especialización."}
        </p>
      </header>
      <div className="mt-14 grid border-t border-foreground md:grid-cols-3">
        {SKILL_BRANCHES.filter((b) => b.available).map((branch, i) => (
          <section
            key={branch.id}
            className={`border-b border-border p-6 md:border-r ${unlocked ? "bg-primary/10" : ""}`}
          >
            <div className="flex items-start justify-between">
              <span className="label-xs text-boss">Camino {String(i + 1).padStart(2, "0")}</span>
              <span className="text-3xl">{branch.icon}</span>
            </div>
            <h2 className="mt-12 text-4xl">{branch.name}</h2>
            <p className="mt-2 font-editorial italic text-muted-foreground">{branch.tagline}</p>
            <ul className="mt-8 space-y-3 border-t border-border pt-5">
              {branch.skills.map((skill, j) => (
                <li key={skill} className="flex gap-3 text-sm">
                  <span className={unlocked && j === 0 ? "text-xp" : "text-locked"}>
                    {unlocked && j === 0 ? "◆" : "◇"}
                  </span>
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-14">
        <div className="border-b border-foreground pb-4">
          <p className="label-xs text-boss">Próximos capítulos</p>
          <h2 className="mt-2 text-4xl">Próximas ramas</h2>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-5">
          {SKILL_BRANCHES.filter((b) => !b.available).map((branch) => (
            <div
              key={branch.id}
              className="border-b border-border p-5 text-muted-foreground sm:border-r"
            >
              <span className="text-2xl">{branch.icon}</span>
              <h3 className="mt-5 text-xl">{branch.name}</h3>
              <p className="label-xs mt-2">Próximamente</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
