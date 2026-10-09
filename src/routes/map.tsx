import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/game/AppShell";
import { QuestNode } from "@/components/game/QuestNode";
import { QUESTS } from "@/lib/quests/data";
import { useProgress } from "@/lib/game/progress";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Mapa de aventura — Soroban Quest" },
      {
        name: "description",
        content: "Explora Lumina con desafíos reales de construcción en Stellar.",
      },
      { property: "og:title", content: "Mapa de aventura — Soroban Quest" },
      {
        property: "og:description",
        content:
          "Cada punto es un desafío real de Stellar. Completa uno para desbloquear el siguiente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});
function MapPage() {
  const { statusOf } = useProgress();
  return (
    <AppShell>
      <header className="grid gap-8 border-t-4 border-foreground pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label-xs text-boss">01 / Mundo de Lumina</p>
          <h1 className="mt-4 text-6xl leading-none sm:text-8xl">
            Mapa de
            <br />
            aventura.
          </h1>
        </div>
        <p className="self-end border-l border-foreground pl-6 font-editorial text-xl italic lg:col-span-4">
          Completa una misión para abrir el camino hacia la siguiente.
        </p>
      </header>
      <div className="relative mt-14 border-t border-foreground pt-8">
        <div className="absolute bottom-8 left-4 top-8 w-px bg-primary md:left-1/2" />
        <div className="relative space-y-6">
          <span className="label-xs ml-10 inline-block bg-primary px-3 py-2 text-foreground md:relative md:left-1/2 md:ml-0 md:-translate-x-1/2">
            Inicio / 00
          </span>
          {QUESTS.map((quest, i) => (
            <QuestNode
              key={quest.slug}
              quest={quest}
              status={statusOf(quest.slug)}
              align={i % 2 === 0 ? "left" : "right"}
            />
          ))}
          <span className="label-xs ml-10 inline-block border border-border bg-background px-3 py-2 text-muted-foreground md:relative md:left-1/2 md:ml-0 md:-translate-x-1/2">
            Próximamente más regiones
          </span>
        </div>
      </div>
    </AppShell>
  );
}
