import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { TESTNET_PASSPHRASE } from "./strkey";

/** Wallets whose kit module can't sign arbitrary messages (SEP-53). */
const NO_MESSAGE_SIGNING = new Set(["albedo"]);

let kitPromise: Promise<typeof StellarWalletsKit> | undefined;

/** Load Stellar Wallets Kit on demand: it touches the DOM and is heavy, so keep it out of SSR and the main bundle. */
function loadKit(): Promise<typeof StellarWalletsKit> {
  // The SSR branch is constant-folded away, which keeps the kit out of the Worker bundle.
  if (import.meta.env.SSR)
    return Promise.reject(new Error("Las billeteras solo funcionan en el navegador."));
  kitPromise ??= Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
    import("@creit.tech/stellar-wallets-kit/types"),
  ]).then(([{ StellarWalletsKit }, { defaultModules }, { Networks }]) => {
    StellarWalletsKit.init({
      modules: defaultModules({ filterBy: (m) => !NO_MESSAGE_SIGNING.has(m.productId) }),
      network: Networks.TESTNET,
    });
    return StellarWalletsKit;
  });
  return kitPromise;
}

export interface SignedChallenge {
  address: string;
  challenge: string;
  signature: string;
}

/**
 * Let the player pick a wallet, fetch a server challenge for that address and sign it.
 * Rejects with a readable message; `null` means the player closed the wallet picker.
 */
export async function signChallengeWithWallet(
  requestChallenge: (address: string) => Promise<string>,
): Promise<SignedChallenge | null> {
  const kit = await loadKit();
  let address: string;
  try {
    ({ address } = await kit.authModal());
  } catch {
    return null;
  }
  const challenge = await requestChallenge(address);
  try {
    const { signedMessage } = await kit.signMessage(challenge, {
      address,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    return { address, challenge, signature: signedMessage };
  } catch (error) {
    throw new Error(walletErrorMessage(error), { cause: error });
  }
}

/** Kit modules reject with `{ code, message }` objects rather than Errors. */
function walletErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  if (/reject|denied|declin|cancel/i.test(raw)) return "Rechazaste la firma en la billetera.";
  return raw
    ? `La billetera no pudo firmar: ${raw}`
    : "La billetera no pudo firmar el mensaje. Prueba con otra o usa Stellar CLI.";
}
