#!/usr/bin/env bash
# End-to-end check of the quest verifiers: builds the reference contracts in contracts/, plays
# every contract quest on testnet with throwaway identities (kept in .stellar-e2e/), then runs the
# server-side checks against the result. Usage: pnpm e2e:testnet
set -euo pipefail
log() { echo ">> $*" >&2; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERE="$ROOT/.stellar-e2e"
CFG="$HERE/stellar-cfg"
OUT="$HERE/wasm"
mkdir -p "$OUT"
rm -rf "$CFG" # fresh identities every run, so supplies and balances start from zero
: > "$HERE/cli-errors.log"

log "building reference contracts"
(cd "$ROOT/contracts" && stellar contract build >/dev/null 2>>"$HERE/cli-errors.log")
cp "$ROOT"/contracts/target/wasm32v1-none/release/{escrow,tickets,crowdfund}.wasm "$OUT/"
cp "$ROOT/contracts/target/wasm32v1-none/release/vault.wasm" "$OUT/vault_vulnerable.wasm"
(cd "$ROOT/contracts" && stellar contract build --package vault --features fixed >/dev/null 2>>"$HERE/cli-errors.log")
cp "$ROOT/contracts/target/wasm32v1-none/release/vault.wasm" "$OUT/vault_fixed.wasm"
NET=(--network testnet --config-dir "$CFG")
S() { stellar "$@" "${NET[@]}" 2>>"$HERE/cli-errors.log"; }

for k in player friend1 friend2 friend3; do
  stellar keys generate "$k" --fund "${NET[@]}" >/dev/null 2>&1 || stellar keys fund "$k" "${NET[@]}" >/dev/null 2>&1 || true
done
P=$(stellar keys address player --config-dir "$CFG")
F1=$(stellar keys address friend1 --config-dir "$CFG")
F2=$(stellar keys address friend2 --config-dir "$CFG")
F3=$(stellar keys address friend3 --config-dir "$CFG")
XLM=$(S contract id asset --asset native)
deploy() { stellar contract deploy "${NET[@]}" --wasm "$OUT/$1.wasm" --source player -- "${@:2}" 2>>"$HERE/cli-errors.log" | tail -1; }
call() { local id=$1 who=$2; shift 2; stellar contract invoke "${NET[@]}" --id "$id" --source "$who" -- "$@" >/dev/null 2>>"$HERE/cli-errors.log"; }

log "escrow"
ESCROW=$(deploy escrow --client "$P" --worker "$F1" --token "$XLM" --amount 10000000)
ESCROW_NOFLOW=$(deploy escrow --client "$P" --worker "$F1" --token "$XLM" --amount 10000000)
call "$ESCROW" player deposit
call "$ESCROW" player release

log "tickets"
TICKETS=$(deploy tickets --admin "$P" --token "$XLM" --price 10000000)
TICKETS_SELF=$(deploy tickets --admin "$P" --token "$XLM" --price 10000000)
call "$TICKETS" friend1 buy --buyer "$F1"
call "$TICKETS_SELF" player buy --buyer "$P"

log "crowdfund"
DEADLINE=$(( $(date +%s) + 86400 ))
CROWD=$(deploy crowdfund --creator "$P" --token "$XLM" --goal 20000000 --deadline "$DEADLINE")
call "$CROWD" friend1 contribute --contributor "$F1" --amount 10000000
call "$CROWD" friend2 contribute --contributor "$F2" --amount 10000000
call "$CROWD" player withdraw

log "final boss (3 distinct accounts)"
BOSS=$(deploy crowdfund --creator "$P" --token "$XLM" --goal 50000000 --deadline "$DEADLINE")
call "$BOSS" friend1 contribute --contributor "$F1" --amount 10000000
call "$BOSS" friend2 contribute --contributor "$F2" --amount 10000000
call "$BOSS" friend3 contribute --contributor "$F3" --amount 10000000

log "vaults"
VAULT_BAD=$(deploy vault_vulnerable)
VAULT_OK=$(deploy vault_fixed)
call "$VAULT_BAD" player deposit --from "$P" --amount 10
call "$VAULT_OK" player deposit --from "$P" --amount 10

log "asset ATLAS (supply 1000, two holders)"
S tx new change-trust --source friend1 --line "ATLAS:$P" >/dev/null
S tx new change-trust --source friend2 --line "ATLAS:$P" >/dev/null
S tx new payment --source player --destination "$F1" --asset "ATLAS:$P" --amount 10000000000 >/dev/null
S tx new payment --source friend1 --destination "$F2" --asset "ATLAS:$P" --amount 2500000000 >/dev/null
S contract asset deploy --asset "ATLAS:$P" --source player >/dev/null || true
ATLAS=$(S contract id asset --asset "ATLAS:$P")

cat > "$HERE/scenarios.json" <<JSON
{"player":"$P","friend1":"$F1","escrow":"$ESCROW","escrowNoFlow":"$ESCROW_NOFLOW","tickets":"$TICKETS","ticketsSelf":"$TICKETS_SELF","crowd":"$CROWD","boss":"$BOSS","vaultBad":"$VAULT_BAD","vaultOk":"$VAULT_OK","atlas":"$ATLAS"}
JSON

log "running server checks"
cd "$ROOT" && node_modules/.bin/tsx --tsconfig tsconfig.json scripts/check-quests.mts "$HERE/scenarios.json"
