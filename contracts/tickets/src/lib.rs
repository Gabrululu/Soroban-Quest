#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Price,
    NextId,
    Owner(u32),
}

#[contractevent]
pub struct TicketBought {
    #[topic]
    pub buyer: Address,
    pub id: u32,
}

#[contract]
pub struct Tickets;

#[contractimpl]
impl Tickets {
    pub fn __constructor(env: Env, admin: Address, token: Address, price: i128) {
        assert!(price > 0, "el precio debe ser positivo");
        let storage = env.storage().instance();
        storage.set(&DataKey::Admin, &admin);
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Price, &price);
        storage.set(&DataKey::NextId, &1u32);
    }

    pub fn buy(env: Env, buyer: Address) -> u32 {
        buyer.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let price: i128 = env.storage().instance().get(&DataKey::Price).unwrap();
        token::Client::new(&env, &token).transfer(&buyer, &env.current_contract_address(), &price);

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap();
        env.storage().instance().set(&DataKey::NextId, &(id + 1));
        env.storage().persistent().set(&DataKey::Owner(id), &buyer);

        TicketBought { buyer, id }.publish(&env);
        id
    }

    pub fn owner_of(env: Env, id: u32) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Owner(id))
    }
}
