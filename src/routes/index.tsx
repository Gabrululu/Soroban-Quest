import { createFileRoute, Link } from "@tanstack/react-router";
import { QUESTS } from "@/lib/quests/data";
import gateway from "@/assets/stellar-gateway.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soroban Quest — Aprende Stellar construyendo" },
      {
        name: "description",
        content:
          "Construye en Stellar con misiones reales. Aprende, verifica en la red de pruebas, gana XP y desbloquea el siguiente desafío.",
      },
      { property: "og:title", content: "Soroban Quest — Aprende Stellar construyendo" },
      {
        property: "og:description",
        content: "Construye en Stellar con misiones reales verificadas en la red de pruebas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
const STEPS = [
  { n: "01", title: "Aprende", body: "Comprende el concepto sin clases ni cuestionarios." },
  { n: "02", title: "Construye", body: "Resuelve un problema real con herramientas reales." },
  {
    n: "03",
    title: "Verifica",
    body: "Demuéstralo en la red de pruebas de Stellar, no con una casilla.",
  },
  {
    n: "04",
    title: "Sube de nivel",
    body: "Gana XP, reúne objetos y desbloquea la siguiente misión.",
  },
];
function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative flex min-h-[min(780px,85svh)] flex-col overflow-hidden bg-foreground text-background">
        <img
          src={gateway}
          alt="Una figura frente a un portal luminoso de Stellar"
          width={1536}
          height={1024}
          className="absolute inset-0 size-full object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-foreground/35" />
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
          <Link to="/" className="font-display text-xl sm:text-2xl">
            SOROBAN<span className="text-primary">★</span>QUEST
          </Link>
          <Link
            to="/map"
            className="border border-background/70 px-4 py-2 text-xs font-bold uppercase transition-colors hover:bg-background hover:text-foreground"
          >
            Mapa de aventura ↗
          </Link>
        </header>
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-16 lg:px-10">
          <p className="label-xs mb-5 text-primary">Stellar / Soroban / Red de pruebas</p>
          <h1 className="max-w-4xl text-7xl leading-[.95] uppercase sm:text-8xl lg:text-[9rem]">
            Soroban
            <br />
            <span className="text-primary">Quest</span>
          </h1>
          <p className="mt-6 font-editorial text-xl italic sm:text-2xl">
            Aprende Stellar construyendo.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-background/85">
            Entra en un mundo donde cada desafío te enseña a construir en Stellar.
          </p>
          <Link
            to="/dashboard"
            className="mt-8 flex w-fit items-center gap-8 bg-primary px-6 py-4 font-display text-lg text-primary-foreground transition-transform hover:-translate-y-1"
          >
            COMENZAR AVENTURA <span>↗</span>
          </Link>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-7xl justify-between border-t border-background/40 px-5 py-4 text-xs uppercase lg:px-10">
          <span>01 / El viaje de quien construye</span>
          <span>Desliza para explorar ↓</span>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10">
        <div className="grid gap-8 border-t-4 border-foreground pt-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-xs text-boss">01 / El viaje</p>
            <h2 className="mt-4 max-w-xl text-5xl leading-none sm:text-7xl">
              CONSTRUYE ALGO REAL.
            </h2>
            <p className="mt-6 max-w-xl font-editorial text-xl italic leading-relaxed">
              No terminarás un curso sobre Stellar: habrás construido cosas en Stellar.
            </p>
          </div>
          <div className="flex flex-col justify-between border-l border-foreground pl-7 lg:col-span-5">
            <p className="max-w-sm text-muted-foreground">
              Nueve desafíos, desde tu primera wallet hasta una aplicación descentralizada. Cada
              logro se gana en testnet.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-5">
              <div>
                <span className="block font-display text-5xl">
                  {QUESTS.length.toString().padStart(2, "0")}
                </span>
                <span className="label-xs">Misiones</span>
              </div>
              <div>
                <span className="block font-display text-5xl">04</span>
                <span className="label-xs">Pasos para dominarlo</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-secondary/15 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="flex items-end justify-between gap-4 border-b border-foreground pb-5">
            <div>
              <p className="label-xs text-boss">02 / El método</p>
              <h2 className="mt-3 text-5xl sm:text-7xl">CÓMO FUNCIONA</h2>
            </div>
            <span className="hidden font-editorial italic sm:block">
              Aprende → Construye → Verifica → Gana
            </span>
          </div>
          <div className="grid gap-0 md:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="border-b border-border py-7 pr-6 md:border-r md:pl-5 md:first:pl-0 md:last:border-r-0"
              >
                <span className="font-display text-5xl text-boss">{s.n}</span>
                <h3 className="mt-7 text-3xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-20 lg:flex-row lg:items-end lg:px-10">
        <div>
          <p className="label-xs text-boss">03 / Primer paso</p>
          <h2 className="mt-3 text-5xl sm:text-7xl">TU HISTORIA EMPIEZA AQUÍ.</h2>
        </div>
        <Link
          to="/quests/$slug"
          params={{ slug: "arrival" }}
          className="shrink-0 border-2 border-foreground px-7 py-4 font-display text-lg transition-colors hover:bg-foreground hover:text-background"
        >
          INICIAR MISIÓN 00 ↗
        </Link>
      </section>
      <footer className="border-t border-foreground px-5 py-7 text-xs text-muted-foreground lg:px-10">
        Creado en la testnet de Stellar. Nunca uses aquí claves secretas de la red principal.
      </footer>
    </div>
  );
}
