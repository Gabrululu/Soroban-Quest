export interface SkillBranch {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  skills: string[];
  available: boolean;
}

export const SKILL_BRANCHES: SkillBranch[] = [
  {
    id: "payments",
    name: "Pagos",
    icon: "💸",
    tagline: "Envía valor a cualquier lugar al instante.",
    skills: ["Pagos con USDC", "Remesas", "Suscripciones", "Pagos continuos"],
    available: true,
  },
  {
    id: "defi",
    name: "DeFi",
    icon: "🔗",
    tagline: "Confianza y liquidez programables.",
    skills: ["Custodia", "Intercambio", "Liquidez", "Préstamos"],
    available: true,
  },
  {
    id: "rwa",
    name: "RWA",
    icon: "🏛",
    tagline: "Lleva activos reales a la cadena.",
    skills: ["Tokenización", "Propiedad fraccionada", "Gestión de activos", "Mercado"],
    available: true,
  },
  {
    id: "identity",
    name: "Identidad",
    icon: "🪪",
    tagline: "Identidades verificables.",
    skills: ["Llaves de acceso", "Acreditaciones", "Reputación"],
    available: false,
  },
  {
    id: "gaming",
    name: "Juegos",
    icon: "🎮",
    tagline: "Objetos y economías en cadena.",
    skills: ["Propiedad de objetos", "Economía del juego", "Clasificaciones"],
    available: false,
  },
  {
    id: "security",
    name: "Seguridad",
    icon: "🛡",
    tagline: "Encuentra fallas antes que otros.",
    skills: ["Auditoría", "Pruebas de fuzzing", "Verificación formal"],
    available: false,
  },
  {
    id: "smart-accounts",
    name: "Cuentas inteligentes",
    icon: "🧠",
    tagline: "Cuentas con reglas propias.",
    skills: ["Autenticación personalizada", "Firmantes con políticas", "Recuperación"],
    available: false,
  },
  {
    id: "public-goods",
    name: "Bienes públicos",
    icon: "🌍",
    tagline: "Construye para todos.",
    skills: ["Financiamiento cuadrático", "Subvenciones", "Seguimiento del impacto"],
    available: false,
  },
];
