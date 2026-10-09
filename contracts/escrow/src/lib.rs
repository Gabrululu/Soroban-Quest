#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Client,
    Worker,
    Token,
    Amount,
    Funded,
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    pub fn __constructor(env: Env, client: Address, worker: Address, token: Address, amount: i128) {
        assert!(amount > 0, "el monto debe ser positivo");
        let storage = env.storage().instance();
        storage.set(&DataKey::Client, &client);
        storage.set(&DataKey::Worker, &worker);
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Amount, &amount);
        storage.set(&DataKey::Funded, &false);
    }

    pub fn deposit(env: Env) {
        let client: Address = env.storage().instance().get(&DataKey::Client).unwrap();
        client.require_auth();
        let funded: bool = env.storage().instance().get(&DataKey::Funded).unwrap();
        assert!(!funded, "ya hay fondos en custodia");
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        token::Client::new(&env, &token).transfer(&client, &env.current_contract_address(), &amount);
        env.storage().instance().set(&DataKey::Funded, &true);
    }

    pub fn release(env: Env) {
        let client: Address = env.storage().instance().get(&DataKey::Client).unwrap();
        client.require_auth();
        let worker: Address = env.storage().instance().get(&DataKey::Worker).unwrap();
        Self::pay_out(&env, &worker);
    }

    pub fn cancel(env: Env) {
        let worker: Address = env.storage().instance().get(&DataKey::Worker).unwrap();
        worker.require_auth();
        let client: Address = env.storage().instance().get(&DataKey::Client).unwrap();
        Self::pay_out(&env, &client);
    }

    fn pay_out(env: &Env, to: &Address) {
        let funded: bool = env.storage().instance().get(&DataKey::Funded).unwrap();
        assert!(funded, "no hay fondos en custodia");
        env.storage().instance().set(&DataKey::Funded, &false);
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        token::Client::new(env, &token).transfer(&env.current_contract_address(), to, &amount);
    }
}
