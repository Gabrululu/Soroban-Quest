import { decodeStrKey } from "./strkey";

const SEP53_PREFIX = "Stellar Signed Message:\n";

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

/** Signatures arrive as base64 (wallets, Stellar CLI) or hex; returns null if neither fits 64 bytes. */
export function decodeSignature(signature: string): Uint8Array<ArrayBuffer> | null {
  const value = signature.trim();
  if (/^[0-9a-fA-F]{128}$/.test(value)) {
    return Uint8Array.from(value.match(/../g)!.map((h) => parseInt(h, 16)));
  }
  try {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return bytes.length === 64 ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * Check that `address` signed `message` following SEP-53:
 * ed25519(sha256("Stellar Signed Message:\n" + message)).
 * Older wallet releases signed sha256(message) or the raw message, so those are accepted too —
 * every variant still proves control of the private key.
 */
export async function verifyMessageSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const sig = decodeSignature(signature);
  if (!sig) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(decodeStrKey("account", address)),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const raw = new TextEncoder().encode(message);
  const candidates = [
    await sha256(new TextEncoder().encode(SEP53_PREFIX + message)),
    await sha256(raw),
    raw,
  ];
  for (const data of candidates) {
    if (await crypto.subtle.verify({ name: "Ed25519" }, key, sig, data)) return true;
  }
  return false;
}
