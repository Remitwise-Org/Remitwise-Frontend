use soroban_sdk::{Address, Env};

pub struct Randomness;

impl Randomness {
    /// Generates a random u64 using Soroban's PRNG.
    /// This is secure and deterministic across validators for a given ledger.
    pub fn next_u64(env: &Env, max: u64) -> u64 {
        env.prng().gen_range(0..max)
    }

    pub fn next_bytes(env: &Env, len: u32) -> soroban_sdk::Bytes {
        let mut bytes = soroban_sdk::Bytes::new(env);
        for _ in 0..len {
            let val: u8 = env.prng().gen_range::<u64>(0..256) as u8;
            bytes.push_back(val);
        }
        bytes
    }
}
