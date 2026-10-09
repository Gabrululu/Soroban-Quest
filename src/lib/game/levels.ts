export const XP_PER_LEVEL = 500;

const TITLES: { level: number; title: string }[] = [
  { level: 30, title: "Leyenda de Stellar" },
  { level: 20, title: "Guardia de contratos" },
  { level: 10, title: "Artífice de Soroban" },
  { level: 5, title: "Aprendiz de Rust" },
  { level: 1, title: "Visitante de Lumina" },
];

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function titleForLevel(level: number) {
  return TITLES.find((t) => level >= t.level)?.title ?? "Visitante de Lumina";
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = (level - 1) * XP_PER_LEVEL;
  const ceiling = level * XP_PER_LEVEL;
  return {
    level,
    title: titleForLevel(level),
    current: xp - floor,
    needed: ceiling - floor,
    total: xp,
    nextAt: ceiling,
    percent: Math.min(100, Math.round(((xp - floor) / XP_PER_LEVEL) * 100)),
  };
}
