const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const VERSION = { account: 6 << 3, contract: 2 << 3 } as const; // "G…" and "C…"

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/** CRC16-XModem, the checksum StrKey appends (little-endian). */
function crc16(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** Decode a StrKey ("G…"/"C…") into its 32-byte payload, validating version and checksum. */
export function decodeStrKey(kind: keyof typeof VERSION, value: string): Uint8Array {
  let bits = 0;
  let acc = 0;
  const out: number[] = [];
  for (const char of value) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Carácter inválido en la dirección.");
    acc = (acc << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 255);
    }
  }
  // [version] + [32-byte payload] + [2-byte checksum]
  if (out.length !== 35 || out[0] !== VERSION[kind]) throw new Error("Tipo de dirección inválido.");
  const body = Uint8Array.from(out.slice(0, 33));
  const crc = crc16(body);
  if (out[33] !== (crc & 255) || out[34] !== crc >> 8) {
    throw new Error("La dirección tiene un checksum inválido. Revisa que la copiaste completa.");
  }
  return body.slice(1);
}

export function encodeStrKey(kind: keyof typeof VERSION, payload: Uint8Array): string {
  const body = new Uint8Array(33);
  body[0] = VERSION[kind];
  body.set(payload, 1);
  const crc = crc16(body);
  const bytes = [...body, crc & 255, crc >> 8];
  let bits = 0;
  let acc = 0;
  let out = "";
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(acc >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(acc << (5 - bits)) & 31];
  return out;
}

export function isValidStrKey(kind: keyof typeof VERSION, value: string): boolean {
  try {
    decodeStrKey(kind, value);
    return true;
  } catch {
    return false;
  }
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

/** Uint256 decimal string (as Horizon reports `salt`) -> 32 big-endian bytes. */
function uint256FromDecimal(decimal: string): Uint8Array {
  let n = BigInt(decimal);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 255n);
    n >>= 8n;
  }
  return out;
}

/**
 * Contract ID that `deployer` gets when creating a contract with `salt`:
 * sha256(XDR HashIDPreimage{ ENVELOPE_TYPE_CONTRACT_ID, networkID,
 *   ContractIDPreimage::FROM_ADDRESS{ ScAddress::Account(deployer), salt } }).
 */
export async function deriveContractId(
  deployer: string,
  saltDecimal: string,
  passphrase = TESTNET_PASSPHRASE,
): Promise<string> {
  const networkId = await sha256(new TextEncoder().encode(passphrase));
  const int32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const preimage = Uint8Array.from([
    ...int32(8), // EnvelopeType.ENVELOPE_TYPE_CONTRACT_ID
    ...networkId,
    ...int32(0), // ContractIDPreimageType.FROM_ADDRESS
    ...int32(0), // ScAddressType.ACCOUNT
    ...int32(0), // PublicKeyType.ED25519
    ...decodeStrKey("account", deployer),
    ...uint256FromDecimal(saltDecimal),
  ]);
  return encodeStrKey("contract", await sha256(preimage));
}
