import { Link } from "@tanstack/react-router";
import type { Quest, QuestStatus } from "@/lib/quests/types";
const STATUS_LABEL: Record<QuestStatus, string> = {
  LOCKED: "Bloqueada",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
};
export function QuestNode({
  quest,
  status,
  align,
}: {
  quest: Quest;
  status: QuestStatus;
  align: "left" | "right";
}) {
  const locked = status === "LOCKED" || quest.comingSoon;
  const body = (
    <div
      className={`group relative ml-10 w-[calc(100%-2.5rem)] max-w-lg md:ml-0 md:w-full border border-foreground bg-background p-5 transition-colors md:ml-0 ${locked ? "opacity-55" : "hover:bg-primary/10"}`}
    >
      <span
        className={`absolute -left-[2.1rem] top-7 size-4 rounded-full border-2 border-foreground bg-primary md:hidden`}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="label-xs text-boss">
          {String(quest.id).padStart(2, "0")} /{" "}
          {quest.comingSoon ? "Próximamente" : STATUS_LABEL[status]}
        </span>
        <span className="font-display text-lg text-xp">+{quest.xp} XP</span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-3xl leading-tight sm:text-4xl">{quest.title}</h2>
          <p className="mt-2 line-clamp-2 font-editorial text-sm italic text-muted-foreground">
            {quest.description}
          </p>
        </div>
        <span className="shrink-0 text-3xl">{locked ? "◇" : quest.icon}</span>
      </div>
      {!locked && (
        <span className="mt-6 block border-t border-border pt-3 text-right text-xs font-bold uppercase">
          Entrar a la misión ↗
        </span>
      )}
    </div>
  );
  return (
    <div
      className={`relative flex w-full ${align === "right" ? "md:justify-end" : "md:justify-start"}`}
    >
      {locked ? (
        <div className="w-full max-w-lg md:w-[46%]">{body}</div>
      ) : (
        <Link
          to="/quests/$slug"
          params={{ slug: quest.slug }}
          className="block w-full max-w-lg md:w-[46%]"
        >
          {body}
        </Link>
      )}
    </div>
  );
}
