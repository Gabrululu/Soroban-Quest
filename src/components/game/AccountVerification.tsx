import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createChallenge, verifyAccount, type VerifyResult } from "@/lib/stellar.functions";
import { signChallengeWithWallet } from "@/lib/stellar/wallet";

const inputClass =
  "mt-2 w-full border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-locked focus:border-primary disabled:opacity-50";

/**
 * WALLET_CONNECTED proof: the player signs a server challenge (SEP-53) with a browser wallet
 * or with `stellar message sign`, so the registered address is provably theirs.
 */
export function AccountVerification({
  registered,
  disabled,
  onResult,
}: {
  registered: string | undefined;
  disabled?: boolean | undefined;
  onResult: (result: VerifyResult, address: string) => void;
}) {
  const challengeFn = useServerFn(createChallenge);
  const verifyFn = useServerFn(verifyAccount);

  const [pending, setPending] = useState<"wallet" | "challenge" | "cli" | null>(null);
  const [cliAddress, setCliAddress] = useState("");
  const [challenge, setChallenge] = useState<{ address: string; text: string } | null>(null);
  const [signature, setSignature] = useState("");

  async function run(
    kind: "wallet" | "challenge" | "cli",
    task: () => Promise<void>,
    address = "",
  ) {
    setPending(kind);
    try {
      await task();
    } catch (error) {
      onResult(
        {
          ok: false,
          message:
            error instanceof Error ? error.message : "La verificación falló. Inténtalo de nuevo.",
        },
        address,
      );
    } finally {
      setPending(null);
    }
  }

  const withWallet = () =>
    run("wallet", async () => {
      const signed = await signChallengeWithWallet(
        async (address) => (await challengeFn({ data: { address } })).challenge,
      );
      if (!signed) return; // picker closed
      onResult(await verifyFn({ data: signed }), signed.address);
    });

  const requestCliChallenge = () =>
    run("challenge", async () => {
      const address = cliAddress.trim();
      const { challenge: text } = await challengeFn({ data: { address } });
      setChallenge({ address, text });
      setSignature("");
    });

  const verifyCliSignature = () =>
    run(
      "cli",
      async () => {
        if (!challenge) return;
        const res = await verifyFn({
          data: {
            address: challenge.address,
            challenge: challenge.text,
            signature: signature.trim(),
          },
        });
        if (!res.ok && /expiró|no es válido|otra cuenta|ya se usó/i.test(res.message))
          setChallenge(null);
        onResult(res, challenge.address);
      },
      challenge?.address,
    );

  const busy = pending !== null || disabled;

  return (
    <div className="mt-4">
      {registered && (
        <p className="text-xs text-muted-foreground">
          Cuenta registrada:{" "}
          <span className="font-mono text-foreground">
            {registered.slice(0, 6)}…{registered.slice(-6)}
          </span>
        </p>
      )}
      <Button
        type="button"
        onClick={withWallet}
        disabled={busy}
        className="mt-4 w-full rounded-none px-5 py-3 font-display text-base disabled:opacity-50"
      >
        {pending === "wallet" ? "ESPERANDO A LA BILLETERA…" : "CONECTAR BILLETERA Y FIRMAR"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Freighter, xBull, Lobstr, Hana, Rabet y otras. Firmar no envía ninguna transacción ni cuesta
        XLM.
      </p>

      <details className="mt-5 border-t border-border pt-4">
        <summary className="label-xs cursor-pointer text-muted-foreground hover:text-foreground">
          ¿Usas Stellar CLI? Firma desde la terminal
        </summary>

        <label className="label-xs mt-4 block text-muted-foreground" htmlFor="cli-address">
          Tu dirección pública de Stellar
        </label>
        <input
          id="cli-address"
          value={cliAddress}
          onChange={(e) => setCliAddress(e.target.value)}
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          disabled={busy}
          className={inputClass}
        />
        <Button
          type="button"
          variant="outline"
          onClick={requestCliChallenge}
          disabled={busy || !cliAddress.trim()}
          className="mt-3 w-full rounded-none text-xs uppercase"
        >
          {pending === "challenge" ? "Generando…" : "Generar reto"}
        </Button>

        {challenge && (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              Ejecuta esto con la identidad de esa cuenta (vence en 10 minutos):
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-muted p-3 font-mono text-xs text-primary">
              {`stellar message sign "${challenge.text}" --sign-with-key builder`}
            </pre>
            <label className="label-xs mt-4 block text-muted-foreground" htmlFor="cli-signature">
              Firma (base64)
            </label>
            <input
              id="cli-signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Pega aquí la salida del comando"
              disabled={busy}
              className={inputClass}
            />
            <Button
              type="button"
              onClick={verifyCliSignature}
              disabled={busy || !signature.trim()}
              className="mt-3 w-full rounded-none px-5 py-3 font-display text-base disabled:opacity-50"
            >
              {pending === "cli" ? "VERIFICANDO…" : "VERIFICAR FIRMA"}
            </Button>
          </>
        )}
      </details>
    </div>
  );
}
