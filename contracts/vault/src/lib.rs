#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey {
    Balance(Address),
}

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

    /// Vulnerable version: no authorization, no balance check, negative amounts accepted.
    #[cfg(not(feature = "fixed"))]
    pub fn withdraw(env: Env, from: Address, amount: i128) {
        let key = DataKey::Balance(from);
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(balance - amount));
    }

    #[cfg(feature = "fixed")]
    pub fn withdraw(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "monto inválido");
        let key = DataKey::Balance(from);
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        assert!(balance >= amount, "saldo insuficiente");
        env.storage().persistent().set(&key, &(balance - amount));
    }

    pub fn balance(env: Env, of: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(of)).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
