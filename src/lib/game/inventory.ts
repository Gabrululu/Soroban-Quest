export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/** Knowledge items a builder can collect. Unlocked by quest slug. */
export const INVENTORY_CATALOG: (InventoryItem & { unlockedBy: string })[] = [
  {
    id: "stellar-wallet",
    name: "Billetera Stellar",
    icon: "👛",
    description: "Una cuenta con fondos en la red de pruebas. Tu pasaporte a Lumina.",
    unlockedBy: "arrival",
  },
  {
    id: "usdc",
    name: "USDC",
    icon: "💵",
    description: "Envía valor a través de fronteras en cinco segundos.",
    unlockedBy: "first-payment",
  },
  {
    id: "stellar-cli",
    name: "Stellar CLI",
    icon: "🖥",
    description: "Crea, despliega e invoca contratos desde la terminal.",
    unlockedBy: "first-contract",
  },
  {
    id: "rust-basics",
    name: "Fundamentos de Rust",
    icon: "🦀",
    description: "Propiedad, traits y código de contratos no_std.",
    unlockedBy: "first-contract",
  },
  {
    id: "soroban-sdk",
    name: "Soroban SDK",
    icon: "📦",
    description: "Env, Symbol, Address y las macros de contratos.",
    unlockedBy: "first-contract",
  },
  {
    id: "contract-storage",
    name: "Almacenamiento de contratos",
    icon: "🗄",
    description: "Estado de instancia, persistente y temporal.",
    unlockedBy: "the-freelancer",
  },
  {
    id: "authorization",
    name: "Autorización",
    icon: "🔑",
    description: "require_auth y quién tiene permiso para actuar.",
    unlockedBy: "the-freelancer",
  },
  {
    id: "escrow-key",
    name: "Clave de custodia",
    icon: "🔐",
    description: "Fondos retenidos hasta que ambas partes estén conformes.",
    unlockedBy: "the-freelancer",
  },
  {
    id: "token-interface",
    name: "Interfaz de tokens",
    icon: "🪙",
    description: "El cliente de tokens SEP-41 que usan los contratos.",
    unlockedBy: "mini-boss",
  },
  {
    id: "events",
    name: "Eventos",
    icon: "📡",
    description: "Emite e indexa las acciones de tu contrato.",
    unlockedBy: "mini-boss",
  },
  {
    id: "testing",
    name: "Pruebas",
    icon: "🧪",
    description: "Comprueba que funciona antes de pasar a la red principal.",
    unlockedBy: "mini-boss",
  },
  {
    id: "asset-contract",
    name: "Stellar Asset Contract",
    icon: "⚒",
    description: "Un activo de Stellar con interfaz de tokens para Soroban.",
    unlockedBy: "asset-forge",
  },
  {
    id: "time-lock",
    name: "Candado de tiempo",
    icon: "⏳",
    description: "Plazos, metas y devoluciones con la hora del registro.",
    unlockedBy: "fund-the-impossible",
  },
  {
    id: "security-audit",
    name: "Auditoría de seguridad",
    icon: "🛡",
    description: "Autorización, saldos y entradas: las tres puertas que siempre hay que cerrar.",
    unlockedBy: "security-dungeon",
  },
  {
    id: "dapp",
    name: "dApp en producción",
    icon: "🚀",
    description: "Un contrato con interfaz y usuarios reales en Stellar.",
    unlockedBy: "final-boss",
  },
];
