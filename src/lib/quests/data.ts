import type { Quest } from "./types";

export const QUESTS: Quest[] = [
  {
    id: 0,
    slug: "arrival",
    title: "La llegada",
    icon: "🚀",
    region: "lumina",
    description:
      "Crea una identidad en Lumina: una cuenta de Stellar con fondos en la red de pruebas.",
    story:
      "Llegaste a Lumina, una economía digital impulsada por Stellar. Antes de construir, necesitas una identidad.",
    difficulty: "Introducción",
    estimatedTime: "5 min",
    xp: 50,
    prerequisites: [],
    objectives: [
      { id: "wallet", label: "Crea o conecta una billetera Stellar" },
      { id: "address", label: "Obtén tu dirección pública (comienza con G...)" },
      { id: "network", label: "Cambia la billetera a la red de pruebas" },
      { id: "fund", label: "Obtén fondos para la cuenta con Friendbot" },
      { id: "sign", label: "Firma un reto para demostrar que la cuenta es tuya" },
    ],
    concepts: ["Cuentas", "Pares de claves", "Redes", "Friendbot", "Firmas"],
    build: [
      {
        title: "Consigue una billetera",
        body: "Instala Freighter (extensión del navegador) u otra billetera Stellar compatible. Cámbiala a la red de pruebas (Testnet); nunca uses aquí claves de la red principal.",
      },
      {
        title: "O genera un par de claves desde la CLI",
        command: "stellar keys generate builder --network testnet --fund",
      },
      {
        title: "Consulta tu dirección pública",
        command: "stellar keys address builder",
      },
      {
        title: "Obtén fondos con Friendbot",
        body: "Puedes obtener fondos gratis para cualquier cuenta de la red de pruebas.",
        command: "curl 'https://friendbot.stellar.org/?addr=YOUR_G_ADDRESS'",
      },
      {
        title: "Usa la misma cuenta en tu billetera",
        body: "Las siguientes misiones despliegan con --source builder, así que la cuenta que firmes aquí debe ser esa. Importa su clave secreta en Freighter (Importar billetera) o firma directamente con la CLI desde el panel VERIFICA.",
        command: "stellar keys secret builder",
      },
      {
        title: "Firma el reto",
        body: "Pulsa CONECTAR BILLETERA Y FIRMAR. La billetera firma un mensaje de un solo uso (SEP-53): no envía ninguna transacción ni cuesta XLM.",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "¿Qué es una cuenta?",
        body: "En Stellar, una cuenta es un registro identificado por una clave pública (G...). Necesita un saldo mínimo de XLM para existir; por eso debe tener fondos.",
      },
      {
        level: "Orientación",
        title: "Dónde buscar",
        body: "Friendbot crea cuentas y les asigna fondos en la red de pruebas. Freighter y Stellar CLI muestran la clave pública que necesitas.",
      },
      {
        level: "Pseudocódigo",
        title: "El proceso",
        body: "generar par de claves -> cambiar a red de pruebas -> usar Friendbot con la clave pública -> la cuenta aparece en el registro",
      },
      {
        level: "Código",
        title: "En un solo comando",
        body: "Esto crea la cuenta y le asigna fondos en un solo comando:",
        code: "stellar keys generate builder --network testnet --fund\nstellar keys address builder",
      },
    ],
    verification: {
      type: "WALLET_CONNECTED",
      inputLabel: "Tu dirección pública de Stellar",
      placeholder: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Firma un reto con tu billetera para demostrar que controlas la cuenta; luego confirmamos en Horizon que existe y tiene fondos. Esta será tu cuenta para el resto de las misiones.",
    },
    rewards: {
      xp: 50,
      achievement: { id: "welcome-builder", name: "Te damos la bienvenida", icon: "🏅" },
      item: { id: "stellar-wallet", name: "Billetera Stellar", icon: "👛" },
    },
    nextQuest: "first-payment",
  },
  {
    id: 1,
    slug: "first-payment",
    title: "El primer pago",
    icon: "💸",
    region: "lumina",
    description: "Envía un pago en la red de pruebas de Stellar y verifícalo en el registro.",
    story:
      "Nova tiene un comercio en Lumina. Un cliente quiere pagarle desde otro país, pero el sistema tradicional tardaría tres días. Tu misión: ayudarla a recibir el pago en Stellar.",
    difficulty: "Fácil",
    estimatedTime: "10 min",
    xp: 100,
    prerequisites: ["arrival"],
    objectives: [
      { id: "build", label: "Crea una transacción de pago en la red de pruebas" },
      { id: "sign", label: "Fírmala con tu clave" },
      { id: "submit", label: "Envíala y guarda el hash de la transacción" },
      { id: "verify", label: "Verifica que el pago figure en el registro" },
    ],
    concepts: ["Cuentas", "Activos", "Transacciones", "Registro", "Operaciones"],
    build: [
      {
        title: "El mostrador de Nova",
        body: "Destino: cualquier cuenta de la red de pruebas (crea otra con la CLI). Activo: XLM. Cantidad: 10. Red: de pruebas.",
      },
      {
        title: "Crea la cuenta de Nova",
        command: "stellar keys generate nova --network testnet --fund",
      },
      {
        title: "Envía el pago",
        command:
          "stellar tx new payment --source builder --destination $(stellar keys address nova) --amount 100000000 --network testnet",
      },
      {
        title: "Obtén el hash",
        body: "La CLI muestra el hash al enviar la transacción. También puedes encontrarlo en Stellar Lab o stellar.expert.",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "Transacciones y operaciones",
        body: "Una transacción firmada puede contener hasta 100 operaciones. Un pago es una operación con origen, destino, activo y cantidad. Las cantidades se expresan en stroops (1 XLM = 10 000 000 stroops).",
      },
      {
        level: "Orientación",
        title: "Herramientas",
        body: "Usa `stellar tx new payment` desde la CLI o el creador de transacciones de Stellar Laboratory si prefieres una interfaz visual.",
      },
      {
        level: "Pseudocódigo",
        title: "El proceso",
        body: "cargar cuenta de origen -> agregar operación de pago(destino, activo, cantidad) -> firmar -> enviar a Horizon -> obtener hash",
      },
      {
        level: "Código",
        title: "Con el SDK de JavaScript",
        body: "Si prefieres programar en vez de usar la CLI:",
        code: `const account = await server.loadAccount(source);
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.payment({ destination, asset: Asset.native(), amount: "10" }))
  .setTimeout(30)
  .build();
tx.sign(keypair);
const res = await server.submitTransaction(tx);
console.log(res.hash);`,
      },
    ],
    verification: {
      type: "TRANSACTION_EXISTS",
      inputLabel: "Hash de la transacción",
      placeholder: "Hash hexadecimal de 64 caracteres",
      helper:
        "Buscamos la transacción en Horizon y comprobamos que incluye un pago enviado desde tu cuenta registrada.",
    },
    rewards: {
      xp: 100,
      achievement: { id: "value-in-motion", name: "Valor en movimiento", icon: "🏅" },
      item: { id: "usdc", name: "USDC", icon: "💵" },
    },
    nextQuest: "first-contract",
  },
  {
    id: 2,
    slug: "first-contract",
    title: "Primer contrato",
    icon: "🔨",
    region: "lumina",
    description: "Escribe, compila y despliega tu primer contrato inteligente de Soroban.",
    story:
      "Lumina necesita reglas que no dependan de confiar en una sola persona. Tu misión: desplegar tu primer contrato inteligente.",
    difficulty: "Intermedia",
    estimatedTime: "25 min",
    xp: 250,
    prerequisites: ["first-payment"],
    objectives: [
      { id: "init", label: "Inicia un contrato Soroban en Rust" },
      { id: "build", label: "Compílalo a WASM" },
      { id: "deploy", label: "Despliégalo en la red de pruebas y obtén el ID del contrato" },
      { id: "invoke", label: "Invoca una función del contrato desplegado" },
    ],
    concepts: ["Rust", "Soroban", "Contratos", "Stellar CLI", "WASM"],
    build: [
      {
        title: "Prepara el proyecto",
        command: "stellar contract init hello-lumina && cd hello-lumina",
      },
      {
        title: "El contrato",
        body: "La plantilla crea contracts/hello-world/src/lib.rs. Un contrato es una estructura de Rust con un bloque impl marcado con #[contractimpl].",
        code: `#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Env, String, Vec};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }
}`,
      },
      { title: "Compila", command: "stellar contract build" },
      {
        title: "Despliega",
        command:
          "stellar contract deploy --wasm target/wasm32v1-none/release/hello_world.wasm --source builder --network testnet",
      },
      {
        title: "Invoca",
        command:
          "stellar contract invoke --id CONTRACT_ID --source builder --network testnet -- hello --to Lumina",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "¿Qué se despliega?",
        body: "Subes un archivo WASM al registro y creas una instancia del contrato. Esa instancia recibe una dirección que comienza con C...: es el ID del contrato.",
      },
      {
        level: "Orientación",
        title: "Herramientas necesarias",
        body: "Necesitas Rust con el objetivo wasm32v1-none (rustup target add wasm32v1-none) y la CLI `stellar`. `stellar contract init` prepara el proyecto.",
      },
      {
        level: "Pseudocódigo",
        title: "El proceso",
        body: "iniciar proyecto -> escribir contrato -> compilar con stellar contract build -> desplegar WASM -> obtener ID del contrato -> invocar función",
      },
      {
        level: "Código",
        title: "Comando de despliegue",
        body: "Si no encuentras el archivo compilado, lista primero target/*/release/*.wasm.",
        code: "stellar contract build\nls target/wasm32v1-none/release/*.wasm\nstellar contract deploy --wasm <path>.wasm --source builder --network testnet",
      },
    ],
    verification: {
      type: "CONTRACT_EXISTS",
      inputLabel: "ID del contrato",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que el contrato exista en Soroban y que lo haya desplegado tu cuenta registrada.",
    },
    rewards: {
      xp: 250,
      achievement: { id: "first-deployment", name: "Primer despliegue", icon: "🏅" },
      item: { id: "soroban-sdk", name: "Soroban SDK", icon: "📦" },
    },
    nextQuest: "the-freelancer",
  },
  {
    id: 3,
    slug: "the-freelancer",
    title: "El trabajo independiente",
    icon: "🔒",
    region: "lumina",
    description: "Crea un contrato de custodia con depósito, liberación y cancelación.",
    story:
      "Kael terminó un trabajo. Su cliente quiere recibirlo y Kael quiere cobrar. Ninguno confía en el otro. Necesitan un contrato de custodia.",
    difficulty: "Difícil",
    estimatedTime: "35 min",
    xp: 500,
    prerequisites: ["first-contract"],
    objectives: [
      { id: "compiled", label: "Contrato compilado" },
      { id: "deployed", label: "Contrato desplegado en la red de pruebas" },
      { id: "auth", label: "Autorización implementada con require_auth" },
      { id: "deposit", label: "Como cliente, deposita los fondos con deposit()" },
      { id: "release", label: "Libéralos a quien hizo el trabajo con release()" },
    ],
    concepts: [
      "Almacenamiento de contratos",
      "Autorización",
      "Interfaz de tokens",
      "Rust",
      "Soroban SDK",
      "Pruebas",
    ],
    build: [
      {
        title: "Cómo funciona el acuerdo",
        body: "CLIENTE → CUSTODIA (100 USDC) → TRABAJADOR. El contrato retiene los fondos y solo la parte autorizada puede moverlos.",
      },
      {
        title: "Estado y constructor",
        code: `#[contracttype]
pub enum DataKey { Client, Worker, Token, Amount, Funded }

pub fn __constructor(env: Env, client: Address, worker: Address, token: Address, amount: i128) {
    assert!(amount > 0, "el monto debe ser positivo");
    let storage = env.storage().instance();
    storage.set(&DataKey::Client, &client);
    storage.set(&DataKey::Worker, &worker);
    storage.set(&DataKey::Token, &token);
    storage.set(&DataKey::Amount, &amount);
    storage.set(&DataKey::Funded, &false);
}`,
      },
      {
        title: "deposit()",
        body: "El monto se fija al crear el acuerdo; deposit() lo toma del almacenamiento para que el cliente no pueda depositar menos.",
        code: `pub fn deposit(env: Env) {
    let client: Address = env.storage().instance().get(&DataKey::Client).unwrap();
    client.require_auth();
    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
    token::Client::new(&env, &token)
        .transfer(&client, &env.current_contract_address(), &amount);
    env.storage().instance().set(&DataKey::Funded, &true);
}`,
      },
      {
        title: "release() y cancel()",
        body: "release() envía el monto a quien hizo el trabajo y solo el cliente puede invocarla. cancel() devuelve los fondos al cliente y requiere la firma de quien trabaja, que así renuncia al pago. Ambas marcan Funded en false para que los fondos no se muevan dos veces.",
      },
      { title: "Pruébalo", command: "cargo test" },
      {
        title: "Despliega con las condiciones del acuerdo",
        body: "El constructor fija cliente, quien trabaja (worker), token y monto. Usa XLM nativo: su contrato de token se obtiene con stellar contract id asset.",
        command:
          "stellar contract deploy --wasm target/wasm32v1-none/release/escrow.wasm --source builder --network testnet -- --client $(stellar keys address builder) --worker $(stellar keys address nova) --token $(stellar contract id asset --asset native --network testnet) --amount 10000000",
      },
      {
        title: "Deposita y libera",
        body: "Como cliente, invoca ambas funciones desde tu cuenta registrada.",
        command:
          "stellar contract invoke --id CONTRACT_ID --source builder --network testnet -- deposit\nstellar contract invoke --id CONTRACT_ID --source builder --network testnet -- release",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "¿Por qué require_auth?",
        body: "Cualquiera puede invocar una función pública. require_auth() comprueba que se firmó con esa dirección; así, solo el cliente puede liberar los fondos.",
      },
      {
        level: "Orientación",
        title: "Mover tokens",
        body: "Usa el cliente de tokens SEP-41 (soroban_sdk::token::Client). La dirección del contrato — env.current_contract_address() — mantiene el saldo en custodia. En la red de pruebas puedes usar el contrato del XLM nativo: stellar contract id asset --asset native --network testnet.",
      },
      {
        level: "Pseudocódigo",
        title: "El proceso",
        body: "init(cliente, worker, token, cantidad) -> deposit: autorización del cliente + ingreso -> release: autorización + fondos en custodia + pago a quien trabaja -> cancel: autorización + devolución al cliente",
      },
      {
        level: "Código",
        title: "release()",
        body: "El cliente autoriza, el contrato comprueba que haya fondos en custodia y luego paga a quien hizo el trabajo.",
        code: `pub fn release(env: Env) {
    let client: Address = env.storage().instance().get(&DataKey::Client).unwrap();
    client.require_auth();
    let funded: bool = env.storage().instance().get(&DataKey::Funded).unwrap_or(false);
    if !funded {
        panic!("no hay fondos en custodia");
    }
    env.storage().instance().set(&DataKey::Funded, &false);
    let worker: Address = env.storage().instance().get(&DataKey::Worker).unwrap();
    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
    token::Client::new(&env, &token)
        .transfer(&env.current_contract_address(), &worker, &amount);
}`,
      },
    ],
    verification: {
      type: "CONTRACT_CALL",
      inputLabel: "ID del contrato de custodia",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que tu cuenta desplegó el contrato, que depositaste fondos en él y que el contrato los entregó. Debe ser un despliegue nuevo, distinto al de misiones anteriores.",
    },
    rewards: {
      xp: 500,
      achievement: { id: "trust-nobody", name: "No confíes en nadie", icon: "🏅" },
      item: { id: "escrow-key", name: "Clave de custodia", icon: "🔐" },
    },
    nextQuest: "mini-boss",
  },
  {
    id: 4,
    slug: "mini-boss",
    title: "Minijefe — La puerta de entradas",
    icon: "👾",
    region: "boss",
    description: "Sin tutorial. Crea un contrato completo de venta de entradas.",
    story:
      "La puerta de Lumina solo se abre para quienes pagaron. Esta vez no hay instrucciones paso a paso: combina todo lo aprendido.",
    difficulty: "Jefe",
    estimatedTime: "45 min",
    xp: 1500,
    prerequisites: ["the-freelancer"],
    objectives: [
      { id: "pay", label: "Una persona paga con un token (activo similar a USDC)" },
      { id: "verify", label: "El contrato verifica el pago" },
      { id: "ticket", label: "Se genera una entrada" },
      { id: "owner", label: "La propiedad se registra en la cadena" },
      { id: "event", label: "Se emite un evento de compra" },
    ],
    concepts: ["Interfaz de tokens", "Eventos", "Almacenamiento", "Autorización", "Pruebas"],
    build: [
      {
        title: "El problema",
        body: "Conectar billetera → pagar USDC → verificar pago en el contrato → generar entrada → registrar propiedad. Esa es toda la consigna, sin guía paso a paso.",
      },
      {
        title: "Reglas del desafío",
        body: "Despliega en la red de pruebas, compra al menos una entrada desde otra cuenta y permite consultar su propiedad. Requisito técnico: cada compra emite el evento #[contractevent] TicketBought con la cuenta compradora como #[topic].",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "¿Qué es una entrada?",
        body: "Una entrada es un registro que asocia un ID con la dirección de quien la posee. No necesitas un estándar NFT para demostrar la propiedad.",
      },
      {
        level: "Orientación",
        title: "Por dónde empezar",
        body: "Reutiliza el patrón de transferencia del contrato de custodia y crea buy() para recibir tokens y guardar quién la posee.",
      },
      {
        level: "Pseudocódigo",
        title: "buy()",
        body: "buy(cuenta compradora): autorizar -> transferir token al contrato -> crear id -> guardar titular -> emitir evento -> devolver id",
      },
      {
        level: "Código",
        title: "Emitir el evento",
        body: "Declara el evento con #[contractevent]: el nombre (ticket_bought) y los campos #[topic] forman los temas que usan los indexadores para filtrarlo.",
        code: `#[contractevent]
pub struct TicketBought {
    #[topic]
    pub buyer: Address,
    pub id: u32,
}

// dentro de buy():
TicketBought { buyer: buyer.clone(), id }.publish(&env);`,
      },
    ],
    verification: {
      type: "EVENT_EMITTED",
      inputLabel: "ID del contrato de entradas",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que tu cuenta desplegó el contrato y que, en los últimos 7 días, emitió el evento ticket_bought por una compra hecha desde otra cuenta.",
      events: [
        {
          names: ["ticket_bought"],
          minAccounts: 1,
          excludePlayer: true,
          label: "una entrada comprada desde otra cuenta (evento ticket_bought)",
        },
      ],
    },
    rewards: {
      xp: 1500,
      achievement: { id: "soroban-builder", name: "Sello de Soroban", icon: "👑" },
      item: { id: "testing", name: "Pruebas", icon: "🧪" },
    },
    nextQuest: "asset-forge",
  },
  {
    id: 5,
    slug: "asset-forge",
    title: "Forja de activos",
    icon: "⚒",
    region: "lumina",
    description:
      "Tokeniza un activo del mundo real, publícalo como contrato y transfiere una fracción.",
    story:
      "Atlas posee un taller valuado en 10 000 USD y quiere dividir su propiedad en 1 000 partes digitales para vender algunas a Mira.",
    difficulty: "Difícil",
    estimatedTime: "30 min",
    xp: 500,
    prerequisites: ["mini-boss"],
    objectives: [
      { id: "trust", label: "Crea las cuentas de Atlas y Mira con su línea de confianza" },
      { id: "mint", label: "Emite exactamente 1 000 unidades desde tu cuenta" },
      { id: "sac", label: "Despliega el Stellar Asset Contract (SAC) del activo" },
      { id: "transfer", label: "Transfiere una fracción a Mira mediante el SAC" },
    ],
    concepts: [
      "Activos de Stellar",
      "Líneas de confianza",
      "Emisión",
      "Stellar Asset Contract",
      "SEP-41",
    ],
    build: [
      {
        title: "El plan de Atlas",
        body: "Tu cuenta builder será la emisora del activo ATLAS. En Stellar un activo se identifica como CÓDIGO:EMISOR y nadie puede recibirlo sin antes abrir una línea de confianza. El emisor no guarda saldo: cada unidad que envía se crea en ese momento.",
      },
      {
        title: "Crea las cuentas de Atlas y Mira",
        command:
          "stellar keys generate atlas --network testnet --fund\nstellar keys generate mira --network testnet --fund",
      },
      {
        title: "Abre las líneas de confianza",
        command:
          "stellar tx new change-trust --source atlas --line ATLAS:$(stellar keys address builder) --network testnet\nstellar tx new change-trust --source mira --line ATLAS:$(stellar keys address builder) --network testnet",
      },
      {
        title: "Emite 1 000 ATLAS",
        body: "Las cantidades van en unidades mínimas: 1 000 ATLAS = 10 000 000 000.",
        command:
          "stellar tx new payment --source builder --destination $(stellar keys address atlas) --asset ATLAS:$(stellar keys address builder) --amount 10000000000 --network testnet",
      },
      {
        title: "Publica el activo como contrato",
        body: "El SAC expone ATLAS con la interfaz de tokens SEP-41, para que cualquier contrato de Soroban pueda usarlo. Guarda el ID que imprime el segundo comando.",
        command:
          "stellar contract asset deploy --asset ATLAS:$(stellar keys address builder) --source builder --network testnet\nstellar contract id asset --asset ATLAS:$(stellar keys address builder) --network testnet",
      },
      {
        title: "Vende una fracción a Mira",
        body: "Atlas transfiere 250 ATLAS usando el contrato, no un pago clásico.",
        command:
          "stellar contract invoke --id SAC_ID --source atlas --network testnet -- transfer --from $(stellar keys address atlas) --to $(stellar keys address mira) --amount 2500000000",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "Activo clásico y contrato",
        body: "El activo vive en el registro de Stellar (saldos, líneas de confianza). Su Stellar Asset Contract es la puerta de entrada desde Soroban: balance, transfer y approve sobre esos mismos saldos.",
      },
      {
        level: "Orientación",
        title: "Errores frecuentes",
        body: "op_no_trust significa que el destino no abrió la línea de confianza. Si el suministro no da 1 000 exactos, revisa que no hayas emitido dos veces: las unidades emitidas no se pueden deshacer, pero puedes devolverlas al emisor para quemarlas.",
      },
      {
        level: "Pseudocódigo",
        title: "El proceso",
        body: "crear cuentas -> líneas de confianza -> pago del emisor (emisión) -> desplegar el SAC -> transfer a través del SAC",
      },
      {
        level: "Código",
        title: "Quemar el excedente",
        body: "Enviar unidades de vuelta al emisor las saca de circulación:",
        code: "stellar tx new payment --source atlas --destination $(stellar keys address builder) --asset ATLAS:$(stellar keys address builder) --amount <exceso> --network testnet",
      },
    ],
    verification: {
      type: "ASSET_ISSUED",
      inputLabel: "ID del Stellar Asset Contract",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que sea el SAC de un activo emitido por tu cuenta, que esté desplegado, que circulen exactamente 1 000 unidades y que estén repartidas en al menos 2 cuentas.",
      asset: { supply: 1000, minHolders: 2 },
    },
    rewards: {
      xp: 500,
      achievement: { id: "token-smith", name: "Forja de tokens", icon: "🏅" },
      item: { id: "asset-contract", name: "Stellar Asset Contract", icon: "⚒" },
    },
    nextQuest: "fund-the-impossible",
  },
  {
    id: 6,
    slug: "fund-the-impossible",
    title: "Financia lo imposible",
    icon: "🏦",
    region: "lumina",
    description:
      "Crea un contrato de financiamiento colectivo con meta, plazo, retiro y devoluciones.",
    story:
      "Mira quiere construir el primer observatorio de Lumina y necesita reunir fondos de la comunidad. Si no llega a la meta a tiempo, cada persona debe recuperar su aporte.",
    difficulty: "Difícil",
    estimatedTime: "40 min",
    xp: 750,
    prerequisites: ["asset-forge"],
    objectives: [
      { id: "contribute", label: "Cualquiera puede aportar antes del plazo" },
      { id: "track", label: "Los aportes se registran por dirección" },
      { id: "goal", label: "Quien creó la campaña retira los fondos si se alcanza la meta" },
      { id: "refund", label: "Si no se alcanza, cada aportante recupera lo suyo tras el plazo" },
      { id: "events", label: "Cada acción emite un evento" },
    ],
    concepts: [
      "Mapas de almacenamiento",
      "Tiempo del registro",
      "Devoluciones",
      "Control de acceso",
      "Eventos",
    ],
    build: [
      {
        title: "Las reglas",
        body: "La campaña guarda creador, token, meta, plazo (timestamp Unix en segundos) y lo recaudado. contribute() solo antes del plazo; withdraw() solo si lo recaudado alcanza la meta; refund() solo después del plazo y si no se alcanzó.",
      },
      {
        title: "Estado y eventos",
        body: "Los eventos se declaran con #[contractevent]: el nombre (contributed, withdrawn, refunded) y el campo #[topic] permiten encontrar cada acción en la cadena.",
        code: `#[contracttype]
pub enum DataKey { Creator, Token, Goal, Deadline, Raised, Withdrawn, Contribution(Address) }

#[contractevent]
pub struct Contributed {
    #[topic]
    pub contributor: Address,
    pub amount: i128,
}`,
      },
      {
        title: "contribute()",
        code: `pub fn contribute(env: Env, contributor: Address, amount: i128) {
    contributor.require_auth();
    assert!(amount > 0, "el aporte debe ser positivo");
    let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).unwrap();
    assert!(env.ledger().timestamp() < deadline, "la campaña terminó");

    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    token::Client::new(&env, &token).transfer(&contributor, &env.current_contract_address(), &amount);

    let key = DataKey::Contribution(contributor.clone());
    let previous: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    env.storage().persistent().set(&key, &(previous + amount));
    let raised: i128 = env.storage().instance().get(&DataKey::Raised).unwrap();
    env.storage().instance().set(&DataKey::Raised, &(raised + amount));

    Contributed { contributor, amount }.publish(&env);
}`,
      },
      {
        title: "withdraw() y refund()",
        body: "withdraw() exige la firma de quien creó la campaña, que la meta esté cumplida y que no se haya retirado antes; emite Withdrawn. refund(contributor) devuelve el aporte guardado, lo deja en 0 y emite Refunded.",
      },
      {
        title: "Despliega con meta y plazo",
        body: "El plazo es un timestamp Unix. Para «dentro de un día»: en bash $(( $(date +%s) + 86400 )); en PowerShell [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + 86400.",
        command:
          "stellar contract deploy --wasm target/wasm32v1-none/release/crowdfund.wasm --source builder --network testnet -- --creator $(stellar keys address builder) --token $(stellar contract id asset --asset native --network testnet) --goal 20000000 --deadline <timestamp>",
      },
      {
        title: "Que la comunidad aporte",
        body: "Usa las cuentas de Atlas y Mira (u otras) para aportar, y luego retira desde tu cuenta.",
        command:
          "stellar contract invoke --id CONTRACT_ID --source atlas --network testnet -- contribute --contributor $(stellar keys address atlas) --amount 10000000\nstellar contract invoke --id CONTRACT_ID --source mira --network testnet -- contribute --contributor $(stellar keys address mira) --amount 10000000\nstellar contract invoke --id CONTRACT_ID --source builder --network testnet -- withdraw",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "El tiempo en un contrato",
        body: "env.ledger().timestamp() es la hora de cierre del registro actual. Es la única fuente de tiempo confiable dentro de un contrato.",
      },
      {
        level: "Orientación",
        title: "Un aporte por dirección",
        body: "Usa una variante con datos, DataKey::Contribution(Address), en almacenamiento persistente: cada aportante tiene su propia entrada.",
      },
      {
        level: "Pseudocódigo",
        title: "refund()",
        body: "refund(aportante): plazo vencido -> meta no alcanzada -> leer aporte -> aporte > 0 -> dejarlo en 0 -> transferir de vuelta -> emitir Refunded",
      },
      {
        level: "Código",
        title: "withdraw()",
        body: "Marca el retiro antes de transferir para que no pueda repetirse.",
        code: `pub fn withdraw(env: Env) {
    let creator: Address = env.storage().instance().get(&DataKey::Creator).unwrap();
    creator.require_auth();
    let goal: i128 = env.storage().instance().get(&DataKey::Goal).unwrap();
    let raised: i128 = env.storage().instance().get(&DataKey::Raised).unwrap();
    let withdrawn: bool = env.storage().instance().get(&DataKey::Withdrawn).unwrap();
    assert!(raised >= goal, "todavía no se alcanzó la meta");
    assert!(!withdrawn, "los fondos ya se retiraron");
    env.storage().instance().set(&DataKey::Withdrawn, &true);

    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    token::Client::new(&env, &token).transfer(&env.current_contract_address(), &creator, &raised);
    Withdrawn { creator, amount: raised }.publish(&env);
}`,
      },
    ],
    verification: {
      type: "EVENT_EMITTED",
      inputLabel: "ID del contrato de financiamiento colectivo",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que tu cuenta desplegó el contrato y que, en los últimos 7 días, emitió aportes (contributed) de al menos 2 cuentas distintas a la tuya y un retiro (withdrawn) o una devolución (refunded).",
      events: [
        {
          names: ["contributed"],
          minAccounts: 2,
          excludePlayer: true,
          label: "aportes de al menos 2 cuentas distintas a la tuya (evento contributed)",
        },
        {
          names: ["withdrawn", "refunded"],
          minAccounts: 1,
          label: "un retiro al cumplir la meta o una devolución (evento withdrawn o refunded)",
        },
      ],
    },
    rewards: {
      xp: 750,
      achievement: { id: "crowd-builder", name: "Comunidad en marcha", icon: "🏅" },
      item: { id: "time-lock", name: "Candado de tiempo", icon: "⏳" },
    },
    nextQuest: "security-dungeon",
  },
  {
    id: 7,
    slug: "security-dungeon",
    title: "Mazmorra de seguridad",
    icon: "☠",
    region: "dungeon",
    description: "Encuentra, explota y corrige las vulnerabilidades de una bóveda.",
    story:
      "El Guardián detectó actividad extraña en la bóveda de Lumina: hay saldos negativos y fondos que cambian de titular sin firma. Entra, demuestra el ataque y ciérralo.",
    difficulty: "Difícil",
    estimatedTime: "45 min",
    xp: 750,
    prerequisites: ["fund-the-impossible"],
    objectives: [
      { id: "analyze", label: "Analiza la bóveda vulnerable" },
      { id: "exploit", label: "Escribe pruebas que demuestren los ataques" },
      { id: "fix", label: "Corrige withdraw() hasta que pasen todas las pruebas" },
      { id: "deploy", label: "Despliega tu bóveda corregida y deposita en ella" },
      { id: "guardian", label: "Supera los ataques del Guardián" },
    ],
    concepts: [
      "Evasión de autorización",
      "Desbordamiento",
      "Validación de entradas",
      "Seguridad basada en pruebas",
    ],
    build: [
      {
        title: "La bóveda vulnerable",
        body: "Copia este contrato en un proyecto nuevo (stellar contract init vault). Hay tres fallas en una sola función.",
        code: `#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey { Balance(Address) }

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "monto inválido");
        let key = DataKey::Balance(from);
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(balance + amount));
    }

    pub fn withdraw(env: Env, from: Address, amount: i128) {
        let key = DataKey::Balance(from);
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(balance - amount));
    }

    pub fn balance(env: Env, of: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(of)).unwrap_or(0)
    }
}`,
      },
      {
        title: "Demuestra el robo",
        body: "Con la bóveda vulnerable esta prueba falla: el atacante se lleva el saldo sin la firma de la víctima. Escribe otras dos para el saldo negativo y el monto negativo.",
        code: `#[test]
#[should_panic]
fn attacker_cannot_withdraw_victim_funds() {
    let env = Env::default();
    let client = VaultClient::new(&env, &env.register(Vault, ()));
    let victim = Address::generate(&env);
    env.mock_all_auths();
    client.deposit(&victim, &100);
    env.set_auths(&[]); // nadie firmó nada
    client.withdraw(&victim, &100);
}`,
      },
      { title: "Corrige hasta ver todo en verde", command: "cargo test" },
      {
        title: "Despliega tu bóveda y deposita",
        body: "El Guardián ataca tu propio saldo, así que necesita que deposites al menos 1 unidad desde tu cuenta.",
        command:
          "stellar contract deploy --wasm target/wasm32v1-none/release/vault.wasm --source builder --network testnet\nstellar contract invoke --id CONTRACT_ID --source builder --network testnet -- deposit --from $(stellar keys address builder) --amount 10",
      },
      {
        title: "Lo que hará el Guardián",
        body: "Al verificar ejecutamos cuatro ataques en simulación, sin costo: la cuenta titular debe poder retirar; nadie puede retirar sin su firma; nadie puede retirar más de su saldo; y no se aceptan montos negativos. Mantén la interfaz: deposit, withdraw(from, amount) y balance(of).",
      },
    ],
    hints: [
      {
        level: "Concepto",
        title: "Tres fallas clásicas",
        body: "Autorización ausente (cualquiera actúa en nombre de otra dirección), saldo sin validar (se puede quedar en negativo) y entradas sin validar (un i128 también puede ser negativo).",
      },
      {
        level: "Orientación",
        title: "Quién firma",
        body: "Toda función que mueve fondos de una dirección debe llamar from.require_auth(). Que la función sea pública no significa que cualquiera pueda usarla con cualquier dirección.",
      },
      {
        level: "Pseudocódigo",
        title: "withdraw() segura",
        body: "withdraw(from, amount): require_auth(from) -> amount > 0 -> saldo >= amount -> guardar saldo - amount",
      },
      {
        level: "Código",
        title: "La corrección",
        code: `pub fn withdraw(env: Env, from: Address, amount: i128) {
    from.require_auth();
    assert!(amount > 0, "monto inválido");
    let key = DataKey::Balance(from);
    let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    assert!(balance >= amount, "saldo insuficiente");
    env.storage().persistent().set(&key, &(balance - amount));
}`,
        body: "Cada línea nueva cierra uno de los tres ataques.",
      },
    ],
    verification: {
      type: "TESTS_PASSED",
      inputLabel: "ID de tu bóveda corregida",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que tu cuenta desplegó la bóveda y lanzamos contra ella los ataques en simulación. Necesitas un depósito previo desde tu cuenta.",
    },
    rewards: {
      xp: 750,
      achievement: { id: "bug-hunter", name: "Caza de errores", icon: "🏅" },
      item: { id: "security-audit", name: "Auditoría de seguridad", icon: "🛡" },
    },
    nextQuest: "final-boss",
  },
  {
    id: 8,
    slug: "final-boss",
    title: "Jefe final — El mercado de Lumina",
    icon: "🐉",
    region: "boss",
    description:
      "Publica una dApp completa en Stellar y consigue usuarios reales. Sin pistas ni mapa.",
    story:
      "Lumina abre su primer mercado. Todo lo aprendido —billeteras, tokens, custodia, eventos y seguridad— en una sola creación que otras personas usen de verdad.",
    difficulty: "Jefe",
    estimatedTime: "90 min",
    xp: 2000,
    prerequisites: ["security-dungeon"],
    objectives: [
      { id: "contract", label: "Diseña y despliega tu propio contrato desde tu cuenta" },
      { id: "frontend", label: "Construye una interfaz web que se conecte con billeteras" },
      { id: "events", label: "Emite un evento con la dirección de cada participante" },
      { id: "users", label: "Consigue que al menos 3 cuentas distintas a la tuya lo usen" },
    ],
    concepts: ["Todo lo anterior"],
    build: [
      {
        title: "La consigna",
        body: "Tú eliges la idea: mercado, propinas, votaciones, rifas, reservas… La única regla técnica: cada interacción emite un #[contractevent] cuyo primer #[topic] es la dirección de quien participa. Así el Guardián cuenta a tus usuarios en la cadena.",
      },
      {
        title: "Cómo se verifica",
        body: "Tu cuenta debe haber desplegado el contrato y, en los últimos 7 días, el contrato debe haber emitido eventos de al menos 3 cuentas distintas a la tuya. Invita a otras personas a usar tu interfaz.",
      },
    ],
    hints: [],
    verification: {
      type: "CUSTOM",
      inputLabel: "ID del contrato de tu dApp",
      placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      helper:
        "Comprobamos que tu cuenta desplegó el contrato y que, en los últimos 7 días, emitió eventos de al menos 3 cuentas distintas a la tuya.",
      events: [
        {
          minAccounts: 3,
          excludePlayer: true,
          label:
            "eventos de al menos 3 cuentas distintas a la tuya, con su dirección como primer #[topic]",
        },
      ],
    },
    rewards: {
      xp: 2000,
      achievement: { id: "lumina-architect", name: "Corazón de Lumina", icon: "🐉" },
      item: { id: "dapp", name: "dApp en producción", icon: "🚀" },
    },
  },
];

export const QUEST_BY_SLUG = Object.fromEntries(QUESTS.map((q) => [q.slug, q])) as Record<
  string,
  Quest
>;

export function getQuest(slug: string): Quest | undefined {
  return QUEST_BY_SLUG[slug];
}
