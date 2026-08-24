use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol};

/// Roles for the trusted-caller registry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccessControlRole {
    Admin,
    Governance,
    Claims,
    Policy,
    RiskPool,
    Slashing,
}

/// Storage key for the role map: (contract_address, role) -> bool
#[contracttype]
#[derive(Clone)]
pub(crate) enum RoleKey {
    Role(AccessControlRole),
}

// Event symbols
pub(crate) const ROLE_GRANTED: Symbol = symbol_short!("role_gr");
pub(crate) const ROLE_REVOKED: Symbol = symbol_short!("role_rv");

/// Internal helper: storage key for the admin who initially seeds the registry.
#[contracttype]
#[derive(Clone)]
pub(crate) enum AccessControlKey {
    Admin,
    RoleMap(Address, AccessControlRole),
}

/// Initialize the access-control registry.  Must be called exactly once during
/// contract `initialize`.  Grants `ADMIN` role to `admin_addr`.
pub fn init_access_control(env: &Env, admin_addr: &Address) {
    env.storage()
        .instance()
        .set(&AccessControlKey::Admin, admin_addr);
    grant_role(env, admin_addr, AccessControlRole::Admin);
}

/// Grant `role` to `addr`.  Only callable by an address that already holds `ADMIN`.
pub fn set_role(env: &Env, _caller: &Address, addr: &Address, role: AccessControlRole) {
    let stored_admin: Address = env
        .storage()
        .instance()
        .get(&AccessControlKey::Admin)
        .expect("access control not initialized");
    // The stored admin must authorize this call
    stored_admin.require_auth();
    grant_role(env, addr, role);
}

/// Require that `caller` holds `role`.  Panics with `"unauthorized"` otherwise.
pub fn require_role(env: &Env, caller: &Address, role: &AccessControlRole) {
    let has_role: bool = env
        .storage()
        .instance()
        .get(&AccessControlKey::RoleMap(caller.clone(), role.clone()))
        .unwrap_or(false);
    if !has_role {
        panic!("unauthorized");
    }
}

// ── private helpers ─────────────────────────────────────────────────────────

fn grant_role(env: &Env, addr: &Address, role: AccessControlRole) {
    let already = env
        .storage()
        .instance()
        .get::<AccessControlKey, bool>(&AccessControlKey::RoleMap(addr.clone(), role.clone()))
        .unwrap_or(false);
    if already {
        return;
    }
    env.storage().instance().set(
        &AccessControlKey::RoleMap(addr.clone(), role.clone()),
        &true,
    );
    env.events().publish((ROLE_GRANTED,), (addr.clone(), role));
}

/// Revoke `role` from `addr`.  Only callable by ADMIN.
pub fn revoke_role(env: &Env, _caller: &Address, addr: &Address, role: AccessControlRole) {
    let stored_admin: Address = env
        .storage()
        .instance()
        .get(&AccessControlKey::Admin)
        .expect("access control not initialized");
    stored_admin.require_auth();

    env.storage().instance().set(
        &AccessControlKey::RoleMap(addr.clone(), role.clone()),
        &false,
    );
    env.events().publish((ROLE_REVOKED,), (addr.clone(), role));
}

/// Check whether `addr` holds `role` (non-panicking).
pub fn has_role(env: &Env, addr: &Address, role: &AccessControlRole) -> bool {
    env.storage()
        .instance()
        .get::<AccessControlKey, bool>(&AccessControlKey::RoleMap(addr.clone(), role.clone()))
        .unwrap_or(false)
}
