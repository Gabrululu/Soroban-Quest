import { Address, Keypair, nativeToScVal } from "@stellar/stellar-sdk";
import type { Quest } from "@/lib/quests/types";
import type { VerifyResult } from "@/lib/stellar.functions";
import {
  contractEvents,
  contractExists,
  findDeployment,
  issuedAssetBySac,
  simulateCall,
  tokenFlows,
  type Deployment,
} from "./chain";
import { HORIZON } from "./chain";

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;
const day = (iso: string | undefined) => iso?.slice(0, 19).replace("T", " ") ?? "—";
const fail = (message: string): VerifyResult => ({ ok: false, message });

// ---------------------------------------------------------------------------
// TRANSACTION_EXISTS
// ---------------------------------------------------------------------------

const PAYMENT_TYPES = new Set([
  "payment",
  "path_payment_strict_send",
  "path_payment_strict_receive",
]);

export async function checkPayment(hash: string, address: string): Promise<VerifyResult> {
  const res = await fetch(`${HORIZON}/transactions/${hash}`);
  if (res.status === 404)
    return fail("No encontramos una transacción con ese hash en la red de pruebas.");
  if (!res.ok) return fail("Horizon no respondió. Inténtalo de nuevo en un momento.");
  const tx = (await res.json()) as { successful?: boolean; ledger?: number; created_at?: string };
  if (!tx.successful) return fail("La transacción falló. Corrígela y vuelve a enviarla.");

  const opsRes = await fetch(`${HORIZON}/transactions/${hash}/operations?limit=200`);
  if (!opsRes.ok) return fail("Horizon no respondió. Inténtalo de nuevo en un momento.");
  const ops = (await opsRes.json()) as {
    _embedded?: {
      records?: {
        type: string;
        from?: string;
        to?: string;
        amount?: string;
        asset_type?: string;
        asset_code?: string;
      }[];
    };
  };
  const payment = ops._embedded?.records?.find(
    (op) => PAYMENT_TYPES.has(op.type) && op.from === address,
  );
  if (!payment) {
    return fail(
      `La transacción existe, pero no contiene un pago enviado desde tu cuenta (${short(address)}).`,
    );
  }
  return {
    ok: true,
    message: "Pago confirmado en la red de pruebas de Stellar.",
    details: {
      Monto: `${payment.amount ?? "—"} ${payment.asset_type === "native" ? "XLM" : (payment.asset_code ?? "")}`,
      Destino: payment.to ? short(payment.to) : "—",
      Registro: String(tx.ledger ?? "—"),
      Fecha: day(tx.created_at),
    },
  };
}

// ---------------------------------------------------------------------------
// Contract quests
// ---------------------------------------------------------------------------

export async function checkContractQuest(
  quest: Quest,
  contractId: string,
  address: string,
): Promise<VerifyResult> {
  const type = quest.verification.type;
  if (type === "ASSET_ISSUED") return checkAsset(quest, contractId, address);

  if (!(await contractExists(contractId))) {
    return fail(
      "No encontramos un contrato con ese ID en la red de pruebas. ¿Se completó el despliegue?",
    );
  }
  const deployment = await findDeployment(address, contractId);
  if (!deployment) {
    return fail(
      `El contrato existe, pero no lo desplegó tu cuenta (${short(address)}). Despliégalo con --source usando esa misma cuenta.`,
    );
  }
  const deployed = {
    "Transacción de despliegue": `${deployment.hash.slice(0, 10)}…`,
    Desplegado: day(deployment.createdAt),
  };

  switch (type) {
    case "CONTRACT_EXISTS":
      return {
        ok: true,
        message: "Contrato desplegado por tu cuenta en la red de pruebas de Soroban.",
        details: deployed,
      };
    case "CONTRACT_CALL":
      return checkTokenFlows(contractId, address, deployed);
    case "EVENT_EMITTED":
    case "CUSTOM":
      return checkEvents(quest, contractId, address, deployment, deployed);
    case "TESTS_PASSED":
      return checkExploitSuite(contractId, address, deployed);
    default:
      return fail("Esta verificación todavía no está disponible.");
  }
}

/** CONTRACT_CALL: the player (as client) funded the contract and funds left it again. */
async function checkTokenFlows(
  contractId: string,
  address: string,
  details: Record<string, string>,
): Promise<VerifyResult> {
  const flows = await tokenFlows(address, contractId);
  const missing: string[] = [];
  if (!flows.into) missing.push("un depósito desde tu cuenta hacia el contrato (deposit)");
  if (!flows.outOf) missing.push("que el contrato entregue los fondos (release o cancel)");
  if (missing.length) {
    return fail(
      `El contrato es tuyo, pero aún falta ${missing.join(" y ")}. Usa un token de Stellar (por ejemplo XLM nativo) e invoca las funciones desde tu cuenta registrada.`,
    );
  }
  return {
    ok: true,
    message: "Custodia completa: los fondos entraron al contrato y salieron con autorización.",
    details: { ...details, Depósitos: String(flows.into), Liberaciones: String(flows.outOf) },
  };
}

/** EVENT_EMITTED / CUSTOM: every `events` requirement of the quest is met on testnet. */
async function checkEvents(
  quest: Quest,
  contractId: string,
  address: string,
  deployment: Deployment,
  details: Record<string, string>,
): Promise<VerifyResult> {
  const { events, oldestLedger } = await contractEvents(contractId, deployment.ledger);
  const missing: string[] = [];
  const counts: Record<string, string> = {};

  for (const req of quest.verification.events ?? []) {
    const accounts = new Set(
      events
        .filter((e) => !req.names || (e.name !== undefined && req.names.includes(e.name)))
        .map((e) => e.account)
        .filter((a): a is string => !!a && !(req.excludePlayer && a === address)),
    );
    counts[req.names?.join(" / ") ?? "Cuentas distintas"] = String(accounts.size);
    if (accounts.size < req.minAccounts) missing.push(req.label);
  }

  if (missing.length) {
    const history =
      deployment.ledger < oldestLedger
        ? " Solo vemos los eventos de los últimos 7 días: si fueron antes, repite la interacción."
        : "";
    return fail(`El contrato es tuyo, pero todavía falta: ${missing.join("; ")}.${history}`);
  }
  return {
    ok: true,
    message: "Eventos confirmados en la red de pruebas de Soroban.",
    details: { ...details, Eventos: String(events.length), ...counts },
  };
}

/**
 * TESTS_PASSED (security dungeon): replay the vault exploits against the player's fixed contract
 * in simulation. The vulnerable vault lets anyone withdraw anyone's balance, overdraw, and
 * withdraw negative amounts; a fixed vault must reject all three and still serve its owner.
 */
async function checkExploitSuite(
  contractId: string,
  address: string,
  details: Record<string, string>,
): Promise<VerifyResult> {
  const owner = new Address(address).toScVal();
  const attacker = new Address(Keypair.random().publicKey()).toScVal();
  const amount = (n: bigint) => nativeToScVal(n, { type: "i128" });

  const balance = await simulateCall(contractId, "balance", [owner], { source: address });
  if (!balance.ok || typeof balance.value !== "bigint") {
    return fail("Tu contrato no expone balance(of: Address) -> i128 como la bóveda original.");
  }
  if (balance.value < 1n) {
    return fail(
      "Deposita al menos 1 unidad desde tu cuenta en tu bóveda corregida (deposit) para que podamos lanzar los ataques contra tu propio saldo.",
    );
  }

  const tests: [string, () => Promise<boolean>, string][] = [
    [
      "La cuenta titular puede retirar",
      async () =>
        (await simulateCall(contractId, "withdraw", [owner, amount(1n)], { source: address })).ok,
      "withdraw ya no funciona ni siquiera para la cuenta titular de los fondos.",
    ],
    [
      "Retiro sin firma de la víctima",
      async () => {
        const r = await simulateCall(contractId, "withdraw", [owner, amount(1n)], {
          authMode: "enforce",
        });
        return !r.ok && /auth/i.test(r.error);
      },
      "un atacante todavía puede retirar el saldo de otra cuenta sin su firma (falta require_auth).",
    ],
    [
      "Retiro mayor al saldo",
      async () =>
        !(await simulateCall(contractId, "withdraw", [attacker, amount(1n)], { source: address }))
          .ok,
      "todavía se puede retirar más de lo depositado y dejar el saldo en negativo.",
    ],
    [
      "Monto negativo",
      async () =>
        !(await simulateCall(contractId, "withdraw", [attacker, amount(-1n)], { source: address }))
          .ok,
      "un monto negativo todavía aumenta el saldo del atacante.",
    ],
  ];

  const results: Record<string, string> = {};
  for (const [name, run, problem] of tests) {
    const passed = await run();
    results[name] = passed ? "✔" : "✘";
    if (!passed) {
      return {
        ok: false,
        message: `Prueba fallida: ${problem}`,
        details: { ...details, ...results },
      };
    }
  }
  return {
    ok: true,
    message: "Tu bóveda resistió los tres ataques y sigue sirviendo a su titular.",
    details: { ...details, ...results },
  };
}

/** ASSET_ISSUED: `contractId` is the deployed SAC of an asset the player issued, with its supply spread. */
async function checkAsset(
  quest: Quest,
  contractId: string,
  address: string,
): Promise<VerifyResult> {
  const rules = quest.verification.asset ?? { supply: 0, minHolders: 1 };
  const asset = await issuedAssetBySac(address, contractId);
  if (!asset) {
    return fail(
      `Ese ID no corresponde al Stellar Asset Contract de un activo emitido por tu cuenta (${short(address)}). Calcúlalo con stellar contract id asset --asset CODIGO:${short(address)}.`,
    );
  }
  if (!(await contractExists(contractId))) {
    return fail(
      `El activo ${asset.code} existe, pero su contrato no está desplegado: stellar contract asset deploy --asset ${asset.code}:<tu cuenta> --source builder --network testnet`,
    );
  }
  const details = {
    Activo: asset.code,
    Suministro: asset.supply.toLocaleString("es"),
    Titulares: String(asset.holders),
  };
  if (Math.abs(asset.supply - rules.supply) > 1e-7) {
    return {
      ok: false,
      message: `El suministro en circulación de ${asset.code} es ${asset.supply.toLocaleString("es")}; debe ser exactamente ${rules.supply.toLocaleString("es")}.`,
      details,
    };
  }
  if (asset.holders < rules.minHolders) {
    return {
      ok: false,
      message: `${asset.code} está en ${asset.holders} cuenta(s); transfiere una fracción para que lo tengan al menos ${rules.minHolders}.`,
      details,
    };
  }
  return { ok: true, message: `Activo ${asset.code} tokenizado y repartido.`, details };
}
