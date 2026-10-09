import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/game/AppShell";
import { AccountVerification } from "@/components/game/AccountVerification";
import { HintPanel } from "@/components/game/HintPanel";
import { QuestComplete } from "@/components/game/QuestComplete";
import { getQuest } from "@/lib/quests/data";
import { useProgress, type CompletionSummary } from "@/lib/game/progress";
import { verifyQuest } from "@/lib/stellar.functions";
import type { VerifyResult } from "@/lib/stellar.functions";

export const Route = createFileRoute("/quests/$slug")({
  loader: ({ params }) => {
    const quest = getQuest(params.slug);
    if (!quest) throw notFound();
    return { quest };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Misión no encontrada — Soroban Quest" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { quest } = loaderData;
    const title = `${quest.title} — Soroban Quest`;
    return {
      meta: [
        { title },
        { name: "description", content: quest.description },
        { property: "og:title", content: title },
        { property: "og:description", content: quest.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: QuestPage,
});

function QuestPage() {
  const { quest } = Route.useLoaderData();
  const {
    state,
    statusOf,
    hintsUsed,
    revealHint,
    completeQuest,
    syncCompleted,
    proofUsedBy,
    setAddress,
  } = useProgress();
  const status = statusOf(quest.slug);

  const verify = useServerFn(verifyQuest);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);

  const locked = status === "LOCKED";
  const completed = status === "COMPLETED";

  function fail(message: string) {
    setResult({ ok: false, message });
    toast.error(message);
  }

  /** Shared outcome handling for every verification type. */
  function finish(res: VerifyResult, proof: string) {
    setResult(res);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const s = completeQuest(quest.slug, proof);
    if (s) setSummary(s);
    else toast.success("Ya se verificó esta acción. No se otorgan XP dos veces.");
  }

  function onAccountResult(res: VerifyResult, address: string) {
    if (res.ok && res.token) setAddress(address, res.token);
    finish(res, address);
    // Quests this account already completed elsewhere (another device or browser).
    if (res.ok && res.completed) syncCompleted(res.completed);
  }

  async function runVerification() {
    const value = input.trim();
    if (!value) return fail("Ingresa primero el comprobante.");
    const usedBy = proofUsedBy(value, quest.slug);
    if (usedBy) {
      return fail(
        `Ese comprobante ya completó la misión «${usedBy.title}». Cada misión necesita uno propio.`,
      );
    }
    const { address, addressToken: token } = state;
    if (!address || !token) {
      return fail(
        "Primero firma con tu cuenta en la misión «La llegada»: verificamos que cada comprobante sea tuyo.",
      );
    }
    setPending(true);
    setResult(null);
    try {
      finish(await verify({ data: { slug: quest.slug, proof: value, address, token } }), value);
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "La verificación falló. Revisa el dato e inténtalo de nuevo.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell>
      {summary && <QuestComplete summary={summary} onClose={() => setSummary(null)} />}

      <Link to="/map" className="text-xs text-muted-foreground hover:text-foreground">
        ← Volver al mapa
      </Link>

      <header
        className={`mt-6 border-t-4 border-foreground pt-7 ${quest.region === "dungeon" ? "border-danger" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl">{quest.icon}</span>
          <span className="label-xs text-primary">Misión {String(quest.id).padStart(2, "0")}</span>
          {completed && <span className="label-xs text-success">Completada</span>}
          {locked && <span className="label-xs text-locked">Bloqueada</span>}
          {quest.comingSoon && <span className="label-xs text-muted-foreground">Próximamente</span>}
        </div>
        <h1 className="mt-5 max-w-5xl break-words font-display text-5xl leading-none sm:text-7xl">
          {quest.title}
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-xl italic text-muted-foreground">
          {quest.story}
        </p>

        <dl className="mt-9 grid grid-cols-2 border-t border-foreground sm:grid-cols-4">
          <Stat label="Objetivo" value={quest.description} small />
          <Stat label="Recompensa" value={`+${quest.xp} XP`} />
          <Stat label="Dificultad" value={quest.difficulty} />
          <Stat label="Tiempo estimado" value={quest.estimatedTime} />
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {quest.concepts.map((c) => (
            <span key={c} className="border border-border px-3 py-1 text-xs text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
      </header>

      {locked ? (
        <div className="mt-10 border-l-4 border-primary bg-primary/10 p-8 text-muted-foreground">
          Completa{" "}
          <span className="text-foreground">
            {quest.prerequisites.map((p) => getQuest(p)?.title ?? p).join(", ")}
          </span>{" "}
          antes de entrar en esta misión.
        </div>
      ) : (
        <div className="mt-12 grid gap-10 border-t border-foreground pt-8 lg:grid-cols-3">
          <section className="min-w-0 lg:col-span-2">
            <h2 className="font-display text-4xl">CONSTRUYE</h2>
            <ol className="mt-5 space-y-5">
              {quest.build.map((step, i) => (
                <li key={step.title} className="border-l border-border pl-4">
                  <p className="font-display text-xs text-muted-foreground">
                    PASO {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  {step.body && <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>}
                  {step.command && (
                    <pre className="mt-2 overflow-x-auto bg-muted p-3 font-mono text-xs text-primary">
                      {step.command}
                    </pre>
                  )}
                  {step.code && (
                    <pre className="mt-2 overflow-x-auto bg-muted p-3 font-mono text-xs text-foreground/90">
                      {step.code}
                    </pre>
                  )}
                </li>
              ))}
            </ol>

            <h2 className="mt-10 border-t border-foreground pt-8 font-display text-4xl">PISTAS</h2>
            <div className="mt-4">
              <HintPanel
                hints={quest.hints}
                used={hintsUsed(quest.slug)}
                onReveal={(i) => revealHint(quest.slug, i)}
              />
            </div>
          </section>

          <aside className="min-w-0 space-y-6">
            <section className="border-t border-foreground pt-5">
              <h2 className="font-display text-2xl">MISIÓN</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {quest.objectives.map((o) => (
                  <li key={o.id} className="flex gap-2 text-muted-foreground">
                    <span className={completed ? "text-success" : "text-locked"}>
                      {completed ? "✔" : "◻"}
                    </span>
                    {o.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-foreground pt-5">
              <h2 className="font-display text-2xl">VERIFICA</h2>
              <p className="mt-2 text-xs text-muted-foreground">{quest.verification.helper}</p>
              {quest.verification.type === "WALLET_CONNECTED" ? (
                <AccountVerification
                  registered={state.addressToken ? state.address : undefined}
                  disabled={quest.comingSoon}
                  onResult={onAccountResult}
                />
              ) : (
                <>
                  <label className="label-xs mt-4 block text-muted-foreground" htmlFor="proof">
                    {quest.verification.inputLabel}
                  </label>
                  <input
                    id="proof"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={quest.verification.placeholder}
                    disabled={quest.comingSoon}
                    className="mt-2 w-full border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-locked focus:border-primary disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    onClick={runVerification}
                    disabled={pending || quest.comingSoon}
                    className="mt-4 w-full rounded-none px-5 py-3 font-display text-base disabled:opacity-50"
                  >
                    {pending ? "VERIFICANDO…" : "VERIFICAR EN LA RED DE PRUEBAS"}
                  </Button>
                </>
              )}

              {result && (
                <div
                  className={`mt-4 rounded-md border p-3 text-xs ${
                    result.ok ? "border-success/50 text-success" : "border-danger/50 text-danger"
                  }`}
                >
                  <p>{result.message}</p>
                  {result.details && (
                    <dl className="mt-2 space-y-1 text-muted-foreground">
                      {Object.entries(result.details).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt>{k}</dt>
                          <dd className="font-mono">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </section>

            <section className="border-t border-foreground pt-5">
              <h2 className="font-display text-2xl">RECOMPENSAS</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="text-xp">+{quest.rewards.xp} XP</li>
                {quest.rewards.item && (
                  <li>
                    {quest.rewards.item.icon} {quest.rewards.item.name}
                  </li>
                )}
                {quest.rewards.achievement && (
                  <li>
                    {quest.rewards.achievement.icon} {quest.rewards.achievement.name}
                  </li>
                )}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="border-r border-border p-3">
      <dt className="label-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${small ? "text-xs text-muted-foreground" : "font-display text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}
