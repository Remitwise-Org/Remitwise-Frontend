use ink::prelude::vec::Vec;

pub type StateRoot = [u8; 32];

pub fn compute_root(entries: &[Vec<u8>]) -> StateRoot {
    if entries.is_empty() {
        return [0; 32];
    }
    let mut level = entries.iter().map(hash).collect::<Vec<_>>();
    while level.len() > 1 {
        let mut next = Vec::new();
        for pair in level.chunks(2) {
            let mut input = Vec::with_capacity(64);
            input.extend_from_slice(&pair[0]);
            input.extend_from_slice(pair.get(1).unwrap_or(&pair[0]));
            next.push(hash(&input));
        }
        level = next;
    }
    level[0]
}

fn hash(value: &[u8]) -> StateRoot {
    let mut output = [0; 32];
    ink::env::hash_bytes::<ink::env::hash::Blake2x256>(value, &mut output);
    output
}
