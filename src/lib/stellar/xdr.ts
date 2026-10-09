/**
 * Minimal XDR for the few Stellar structures the server needs: invoking a contract in
 * simulation and decoding simple contract values. Hand-written instead of @stellar/stellar-sdk
 * because the SDK's generic XDR machinery costs more Worker CPU than the 10 ms free-plan budget.
 */
import { decodeStrKey, encodeStrKey } from "./strkey";

class Writer {
  private bytes: number[] = [];

  u32(n: number) {
    this.bytes.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    return this;
  }

  i64(n: bigint) {
    return this.u64(BigInt.asUintN(64, n));
  }

  u64(n: bigint) {
    for (let shift = 56n; shift >= 0n; shift -= 8n) this.bytes.push(Number((n >> shift) & 255n));
    return this;
  }

  fixed(data: Uint8Array) {
    this.bytes.push(...data);
    return this;
  }

  string(s: string) {
    const data = new TextEncoder().encode(s);
    this.u32(data.length).fixed(data);
    while (this.bytes.length % 4) this.bytes.push(0);
    return this;
  }

  base64() {
    return btoa(String.fromCharCode(...this.bytes));
  }
}

class Reader {
  private offset = 0;
  private readonly bytes: Uint8Array;

  constructor(base64: string) {
    this.bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  u32() {
    const b = this.bytes;
    const o = this.offset;
    this.offset += 4;
    if (this.offset > b.length) throw new Error("XDR truncado");
    return ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
  }

  i32() {
    return this.u32() | 0;
  }

  u64() {
    return (BigInt(this.u32()) << 32n) | BigInt(this.u32());
  }

  i64() {
    return BigInt.asIntN(64, this.u64());
  }

  fixed(length: number) {
    const out = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }

  string() {
    const length = this.u32();
    const out = new TextDecoder().decode(this.fixed(length));
    this.offset += (4 - (length % 4)) % 4;
    return out;
  }
}

// ScVal discriminants (Stellar-contract.x)
const SCV = {
  BOOL: 0,
  VOID: 1,
  U32: 3,
  I32: 4,
  U64: 5,
  I64: 6,
  I128: 10,
  STRING: 14,
  SYMBOL: 15,
  ADDRESS: 18,
};
const SC_ADDRESS_ACCOUNT = 0;
const SC_ADDRESS_CONTRACT = 1;

/** Contract arguments this app sends. */
export type ScArg = { address: string } | { i128: bigint };

function writeScAddress(w: Writer, address: string) {
  if (address.startsWith("G")) {
    w.u32(SC_ADDRESS_ACCOUNT)
      .u32(0 /* PUBLIC_KEY_TYPE_ED25519 */)
      .fixed(decodeStrKey("account", address));
  } else {
    w.u32(SC_ADDRESS_CONTRACT).fixed(decodeStrKey("contract", address));
  }
}

function writeScVal(w: Writer, arg: ScArg) {
  if ("address" in arg) {
    writeScAddress(w.u32(SCV.ADDRESS), arg.address);
  } else {
    const v = BigInt.asUintN(128, arg.i128);
    w.u32(SCV.I128)
      .i64(BigInt.asIntN(64, v >> 64n))
      .u64(v & 0xffffffffffffffffn);
  }
}

/**
 * base64 TransactionEnvelope that invokes `contractId.fn(...args)` from `source`. Unsigned, no
 * auth entries and no preconditions: only ever simulated, never submitted.
 */
export function invokeContractEnvelope(
  source: string,
  contractId: string,
  fn: string,
  args: ScArg[],
): string {
  const w = new Writer()
    .u32(2) // ENVELOPE_TYPE_TX
    .u32(0) // MuxedAccount: KEY_TYPE_ED25519
    .fixed(decodeStrKey("account", source))
    .u32(100) // fee
    .i64(1n) // sequence number
    .u32(0) // Preconditions: PRECOND_NONE
    .u32(0) // Memo: MEMO_NONE
    .u32(1) // one operation
    .u32(0) // no operation source account
    .u32(24) // OperationType: INVOKE_HOST_FUNCTION
    .u32(0); // HostFunctionType: INVOKE_CONTRACT
  writeScAddress(w, contractId);
  w.string(fn).u32(args.length);
  for (const arg of args) writeScVal(w, arg);
  return w
    .u32(0) // no auth entries
    .u32(0) // Transaction.ext v0
    .u32(0) // no signatures
    .base64();
}

/**
 * Decode a base64 ScVal into a plain value: strings and symbols → string, addresses → G…/C…,
 * integers → number or bigint, bool, void → null. Other types → undefined.
 */
export function decodeScVal(base64: string): unknown {
  try {
    const r = new Reader(base64);
    switch (r.i32()) {
      case SCV.BOOL:
        return r.u32() === 1;
      case SCV.VOID:
        return null;
      case SCV.U32:
        return r.u32();
      case SCV.I32:
        return r.i32();
      case SCV.U64:
        return r.u64();
      case SCV.I64:
        return r.i64();
      case SCV.I128: {
        const hi = r.i64();
        const lo = r.u64();
        return (hi << 64n) | lo;
      }
      case SCV.STRING:
      case SCV.SYMBOL:
        return r.string();
      case SCV.ADDRESS: {
        const kind = r.u32();
        if (kind === SC_ADDRESS_ACCOUNT) {
          r.u32(); // PUBLIC_KEY_TYPE_ED25519
          return encodeStrKey("account", r.fixed(32));
        }
        if (kind === SC_ADDRESS_CONTRACT) return encodeStrKey("contract", r.fixed(32));
        return undefined;
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}
