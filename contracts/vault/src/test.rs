use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, VaultClient<'static>) {
    let env = Env::default();
    let id = env.register(Vault, ());
    let client = VaultClient::new(&env, &id);
    (env, client)
}

/// Without the victim's signature, withdrawing their balance must fail.
#[test]
#[should_panic]
fn attacker_cannot_withdraw_victim_funds() {
    let (env, client) = setup();
    let victim = Address::generate(&env);
    env.mock_all_auths();
    client.deposit(&victim, &100);
    env.set_auths(&[]); // from here on nobody has signed anything
    client.withdraw(&victim, &100);
}

#[test]
#[should_panic]
fn cannot_withdraw_more_than_balance() {
    let (env, client) = setup();
    let attacker = Address::generate(&env);
    env.mock_all_auths();
    client.withdraw(&attacker, &1);
}

#[test]
#[should_panic]
fn negative_amount_is_rejected() {
    let (env, client) = setup();
    let attacker = Address::generate(&env);
    env.mock_all_auths();
    client.withdraw(&attacker, &-50);
}
