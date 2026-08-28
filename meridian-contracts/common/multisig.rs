use soroban_sdk::{Address, Env, Vec};

/// Configuration for multisig admin control
pub struct AdminConfig {
    pub admins: Vec<Address>,
    pub threshold: u32, // e.g. 2 for 2-of-3, 3 for 3-of-5
}

/// Require a unique threshold of configured Soroban signers for an action.
pub fn verify_multisig(env: &Env, signers: Vec<Address>, config: &AdminConfig) -> bool {
    const MAX_SIGNATURES: u32 = 20;

    // Prevent unbounded input processing and invalid threshold configurations.
    if signers.len() > MAX_SIGNATURES
        || config.threshold == 0
        || config.threshold > config.admins.len()
    {
        return false;
    }

    let mut valid_count: u32 = 0;
    let mut seen: Vec<Address> = Vec::new(env);

    for signer in signers {
        // Early exit when threshold is reached
        if valid_count >= config.threshold {
            break;
        }

        if config.admins.contains(signer.clone()) && !seen.contains(signer.clone()) {
            // Soroban authorization is the canonical signature check for both
            // account and contract addresses. The action is already bound to
            // the invoking contract call and its arguments.
            signer.require_auth();
            seen.push_back(signer);
            valid_count += 1;
        }
    }

    valid_count >= config.threshold
}
