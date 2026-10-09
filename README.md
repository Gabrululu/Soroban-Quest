# Soroban Quest

Juego para aprender Stellar y Soroban construyendo: cada misión pide hacer algo real en la red de pruebas (crear una cuenta, enviar un pago, desplegar un contrato) y se verifica contra Horizon y Soroban RPC.

## Desarrollo

Requiere Node.js 22.13+ (recomendado 24 LTS) y pnpm 12. Con corepack activado, la versión de pnpm se toma de `packageManager` en `package.json`; la configuración de pnpm (filtro de 24 h, `overrides`, `allowBuilds`) está en `pnpm-workspace.yaml`.

```sh
pnpm install
pnpm dev
```

Otros scripts: `pnpm build`, `pnpm preview`, `pnpm lint`, `pnpm format`.

## Estructura

- `src/lib/quests/data.ts` — las misiones son datos; agregar una no requiere tocar componentes.
- `src/lib/game/` — progreso del jugador (XP, niveles, objetos, logros), guardado en `localStorage`.
- `src/lib/stellar.functions.ts` — verificación en el servidor contra la red de pruebas. En la misión `arrival` el jugador firma un reto (SEP-53) con su billetera o con `stellar message sign`; el servidor devuelve un token de sesión y todos los comprobantes posteriores deben pertenecer a esa dirección.
- `src/lib/stellar/wallet.ts` — conexión con billeteras mediante Stellar Wallets Kit (Freighter, xBull, Lobstr, Hana, Rabet…), cargado solo al pulsar el botón.
- `src/lib/stellar/signature.ts` — verificación de firmas Ed25519 / SEP-53 con Web Crypto.
- `src/lib/server/runtime.ts` — acceso a bindings de Cloudflare (secretos, D1, límite de peticiones) con equivalentes en memoria para desarrollo.
- `src/lib/monitoring.ts` y `src/server.ts` — reporte de errores a Sentry cuando hay DSN.
- `src/lib/stellar/strkey.ts` — codificación de direcciones Stellar (`G…`, `C…`) y derivación de IDs de contrato.
- `src/routes/` — pantallas (TanStack Router, rutas por archivo).

## Configuración

Copia `.env.example` a `.env` para desarrollo local. Ninguna variable es obligatoria en local: sin `SOROBAN_QUEST_SECRET` se usa un secreto de desarrollo, y D1 y el límite de peticiones funcionan en memoria.

| Variable               | Dónde                 | Para qué                                                                           |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `VITE_SITE_URL`        | `.env` (build)        | URL pública; las tarjetas para redes sociales necesitan URLs absolutas             |
| `VITE_SENTRY_DSN`      | `.env` (build)        | Errores del navegador en Sentry (opcional)                                         |
| `SOROBAN_QUEST_SECRET` | `wrangler secret put` | Firma de retos y tokens de sesión (**obligatoria** en producción)                  |
| `SENTRY_DSN`           | `wrangler secret put` | Errores del servidor en Sentry (opcional)                                          |
| `QUEST_DB`             | `wrangler.jsonc` (D1) | Retos de un solo uso, sin ventana de reutilización (**obligatorio** en producción) |
| `VERIFY_LIMITER`       | `wrangler.jsonc`      | Límite de 20 verificaciones por minuto e IP                                        |

## Despliegue en Cloudflare

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create soroban-quest        # pega el database_id en wrangler.jsonc
pnpm exec wrangler d1 migrations apply QUEST_DB --remote
pnpm exec wrangler secret put SOROBAN_QUEST_SECRET
pnpm deploy
```

`pnpm build` genera el worker (preset `cloudflare-module` de Nitro) en `.output/`, combinando `wrangler.jsonc` con la configuración de Nitro.

## Stack

TanStack Start · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Cloudflare Workers

## Contratos de referencia y pruebas en testnet

`contracts/` contiene la solución de referencia de cada misión con contrato (custodia, entradas, financiamiento colectivo y la bóveda de la mazmorra en versión vulnerable y corregida, con sus pruebas de ataque).

`pnpm e2e:testnet` compila esos contratos, juega cada misión en la red de pruebas con cuentas desechables (en `.stellar-e2e/`) y ejecuta los verificadores del servidor, comprobando que acepten los casos válidos y rechacen los inválidos. Requiere Rust con el objetivo `wasm32v1-none` y Stellar CLI. Córrelo después de cambiar una misión o un verificador.

## Licencia

[MIT](LICENSE)
