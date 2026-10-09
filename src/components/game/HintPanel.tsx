import type { Hint } from "@/lib/quests/types";
import { Button } from "@/components/ui/button";
export function HintPanel({
  hints,
  used,
  onReveal,
}: {
  hints: Hint[];
  used: number;
  onReveal: (index: number) => void;
}) {
  if (!hints.length)
    return <p className="text-sm text-muted-foreground">Esta misión no tiene pistas.</p>;
  return (
    <div className="border-t border-border">
      {hints.map((hint, i) => {
        const revealed = i < used;
        const nextUp = i === used;
        return (
          <div key={hint.level} className="border-b border-border py-5">
            <div className="flex items-center justify-between gap-3">
              <span className="label-xs text-boss">
                {String(i + 1).padStart(2, "0")} / {hint.level}
              </span>
              {!revealed && (
                <Button
                  variant="outline"
                  type="button"
                  disabled={!nextUp}
                  onClick={() => onReveal(i)}
                  className="rounded-none text-xs uppercase"
                >
                  {nextUp ? "Revelar" : "Bloqueada"}
                </Button>
              )}
            </div>
            {revealed && (
              <div className="mt-4 rise-in">
                <h3 className="text-xl">{hint.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{hint.body}</p>
                {hint.code && (
                  <pre className="mt-3 overflow-x-auto bg-muted p-3 font-mono text-xs text-foreground">
                    {hint.code}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="mt-4 font-editorial text-sm italic text-muted-foreground">
        Pistas utilizadas: {used}/{hints.length}. Las pistas reducen las estrellas, no los XP:
        aprender no es una penalización.
      </p>
    </div>
  );
}
