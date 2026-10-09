import { Link } from "@tanstack/react-router";
import type { CompletionSummary } from "@/lib/game/progress";
import { Button } from "@/components/ui/button";
export function QuestComplete({
  summary,
  onClose,
}: {
  summary: CompletionSummary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Misión completada"
        className="w-full max-w-lg border-t-4 border-foreground bg-background p-7 shadow-[8px_8px_0_var(--primary)] rise-in sm:p-10"
      >
        <p className="label-xs text-boss">Misión completada / 01</p>
        <h2 className="mt-3 break-words text-5xl leading-none sm:text-6xl">
          {summary.quest.title}
        </h2>
        <div className="mt-7 border-y border-foreground py-5">
          <p className="font-display text-6xl text-xp">+{summary.xp} XP</p>
          <p className="mt-2 text-xl text-xp">
            {"★".repeat(summary.stars)}
            <span className="text-locked">{"★".repeat(5 - summary.stars)}</span>
          </p>
          <p className="mt-1 font-editorial text-xs italic text-muted-foreground">
            {summary.hintsUsed} pistas utilizadas
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {summary.item && (
            <div>
              <p className="label-xs text-boss">Nuevo objeto</p>
              <p className="mt-2">
                {summary.item.icon} {summary.item.name}
              </p>
            </div>
          )}
          {summary.achievement && (
            <div>
              <p className="label-xs text-boss">Logro</p>
              <p className="mt-2">
                {summary.achievement.icon} {summary.achievement.name}
              </p>
            </div>
          )}
        </div>
        {summary.next && (
          <p className="mt-6 border-t border-border pt-4 font-editorial italic">
            Nueva misión desbloqueada: {summary.next.title}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {summary.next && !summary.next.comingSoon ? (
            <Button asChild className="rounded-none font-display text-base" onClick={onClose}>
              <Link to="/quests/$slug" params={{ slug: summary.next.slug }}>
                CONTINUAR AVENTURA ↗
              </Link>
            </Button>
          ) : (
            <Button asChild className="rounded-none font-display text-base" onClick={onClose}>
              <Link to="/map">VOLVER AL MAPA ↗</Link>
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="rounded-none uppercase">
            Permanecer aquí
          </Button>
        </div>
      </div>
    </div>
  );
}
