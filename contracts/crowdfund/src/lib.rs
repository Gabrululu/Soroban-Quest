#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Creator,
    Token,
    Goal,
    Deadline,
    Raised,
    Withdrawn,
    Contribution(Address),
}

#[contractevent]
pub struct Contributed {
    #[topic]
    pub contributor: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Withdrawn {
    #[topic]
    pub creator: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Refunded {
    #[topic]
    pub contributor: Address,
    pub amount: i128,
}

#[contract]
pub struct Crowdfund;

#[contractimpl]
impl Crowdfund {
    /// `deadline` is a ledger timestamp in seconds.
    pub fn __constructor(env: Env, creator: Address, token: Address, goal: i128, deadline: u64) {
        assert!(goal > 0, "la meta debe ser positiva");
        let storage = env.storage().instance();
        storage.set(&DataKey::Creator, &creator);
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Goal, &goal);
        storage.set(&DataKey::Deadline, &deadline);
        storage.set(&DataKey::Raised, &0i128);
        storage.set(&DataKey::Withdrawn, &false);
    }

    pub fn contribute(env: Env, contributor: Address, amount: i128) {
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
    }

    pub fn withdraw(env: Env) {
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
    }

    pub fn refund(env: Env, contributor: Address) {
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).unwrap();
        let goal: i128 = env.storage().instance().get(&DataKey::Goal).unwrap();
        let raised: i128 = env.storage().instance().get(&DataKey::Raised).unwrap();
        assert!(env.ledger().timestamp() >= deadline, "la campaña sigue abierta");
        assert!(raised < goal, "la meta se alcanzó: no hay devoluciones");

        let key = DataKey::Contribution(contributor.clone());
        let amount: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        assert!(amount > 0, "no hay aportes que devolver");
        env.storage().persistent().set(&key, &0i128);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &contributor, &amount);
        Refunded { contributor, amount }.publish(&env);
    }
}
