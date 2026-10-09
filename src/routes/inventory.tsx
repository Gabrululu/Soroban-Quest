import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/game/AppShell";
import { INVENTORY_CATALOG } from "@/lib/game/inventory";
import { getQuest } from "@/lib/quests/data";
import { useProgress } from "@/lib/game/progress";
export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventario de construcción — Soroban Quest" },
      {
        name: "description",
        content: "Reúne conocimientos de Stellar al completar misiones reales.",
      },
      { property: "og:title", content: "Inventario de construcción — Soroban Quest" },
      {
        property: "og:description",
        content: "Cada objeto representa una habilidad de Stellar que pusiste en práctica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});
function Inventory() {
  const { state } = useProgress();
  const owned = new Set(state.items.map((i) => i.id));
  return (
    <AppShell>
      <header className="grid gap-6 border-t-4 border-foreground pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label-xs text-boss">03 / Colección</p>
          <h1 className="mt-4 text-6xl leading-none sm:text-8xl">
            Inventario de
            <br />
            construcción.
          </h1>
        </div>
        <p className="self-end border-l border-foreground pl-6 font-editorial text-xl italic lg:col-span-4">
          {owned.size} de {INVENTORY_CATALOG.length} objetos recuperados.
        </p>
      </header>
      <div className="mt-14 grid border-t border-foreground sm:grid-cols-2 lg:grid-cols-3">
        {INVENTORY_CATALOG.map((item, i) => {
          const has = owned.has(item.id);
          return (
            <article
              key={item.id}
              className={`min-h-48 border-b border-border p-5 sm:border-r ${!has ? "text-muted-foreground" : "bg-primary/10"}`}
            >
              <div className="flex items-start justify-between">
                <span className="label-xs text-boss">
                  {String(i + 1).padStart(2, "0")} / {has ? "Recuperado" : "Sin descubrir"}
                </span>
                <span className="text-4xl">{has ? item.icon : "◇"}</span>
              </div>
              <h2 className="mt-8 text-2xl">{has ? item.name : "Objeto desconocido"}</h2>
              <p className="mt-2 text-sm leading-relaxed">
                {has
                  ? item.description
                  : `Se desbloquea al completar “${getQuest(item.unlockedBy)?.title ?? item.unlockedBy}”.`}
              </p>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
